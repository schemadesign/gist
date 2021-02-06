const Batch = require('batch');
const winston = require('winston');
const { isEmpty } = require('lodash');

const raw_source_documents = require('../../models/raw_source_documents');
const datasource_description = require('../../models/descriptions');
const mongoose_client = require('../../models/mongoose_client');
const import_controller = require('../../libs/import/data_ingest/controller');
const raw_row_objects = require('../../models/raw_row_objects');
const postimport_caching_controller = require('../../libs/import/cache/controller');
const permissions = require('../../controllers/api/permissions-helpers');
const { copyCreatedFields } = require('../../models/processed_row_objects');

const preImport = (job, datasetId, next) => {
    const batch = new Batch();
    batch.concurrency(1);

    let description;

    batch.push((done) => {
        datasource_description.findById(datasetId)
            .lean()
            .populate('schema_id _team schema_id._team')
            .exec((err, data) => {
                if (err) {
                    winston.error(`preImport datasource_description err: ${err}`);
                    return done(err);
                }

                if (!data) {
                    return done(new Error(`No datasource exists (3): ${datasetId}`));
                }

                description = data;

                // merge with parent description
                if (description.schema_id) {
                    description = datasource_description.consolidateDescriptions(description);
                }

                permissions.getDatasetPermissions(description._team, description.vizType)
                    .then((datasetPermissions) => {
                        description.permissions = datasetPermissions;
                        done();
                    })
                    .catch((err) => {
                        winston.error(`Problems with permissions of dataset.id: ${description._id} err: ${err}`);
                        done(err);
                    });
            });
    });

    batch.push((done) => {
        if (description.schemaId) {
            return done();
        }

        const pKey = (description.lastImportTriggeredBy === 'automated') ? `${description._id}-automated` : description._id;

        raw_source_documents.Model.findOne({ primaryKey: pKey }, (err, document) => {
            if (err) {
                winston.error(`preImport raw_source_documents.Model.findOne err: ${err}`);
                return done(err);
            }

            if (!document) {
                return done();
            }

            winston.info(`Removed raw source document with pKey: ${pKey}`);
            document.remove(() => done());
        });
    });

    // Remove raw row object
    batch.push((done) => {
        if (description.schemaId) {
            return done();
        }

        const collectionName = (description.lastImportTriggeredBy === 'automated') ? `rawrowobjects-${description._id}-automated` : `rawrowobjects-${description._id}`;

        mongoose_client.dropCollection(collectionName, (err) => {
            if (err && err.code !== 26) {
                winston.error(`preImport mongoose_client.dropCollection err: ${err}`);
                return done(err);
            }

            winston.info(`Removed ${collectionName} (1), error: ${err}`);
            done();
        });
    });

    batch.end((err) => {
        if (err) {
            return next(err);
        }

        import_controller.Import_rawObjects([description], job, (err) => {
            if (err) {
                winston.error(`Error in queue processing preImport job: ${err.message}`);
                return next(err);
            }

            next();
        });
    });
};
module.exports.preImport = preImport;

/**
 * Direct call to only scrape either all images if rowIds is empty, or a select few specified in rowIds
 * @param {*} job
 * @param {String} datasetId
 * @param {Array<String>} rowIds
 */
const scrapeImages = (job, datasetId, rowIds, next) => {
    const batch = new Batch();
    batch.concurrency(1);

    let description;
    let description_schemaId;
    batch.push((done) => {
        datasource_description.findById(datasetId)
            .lean()
            .populate('schema_id _team schema_id._team')
            .exec((err, data) => {
                if (err) {
                    winston.error(`scrapeImages datasource_description.findById err: ${err}`);
                    return done(err);
                }

                if (!data) {
                    return done(new Error(`No datasource exists (4): ${datasetId}`));
                }

                description = data;

                if (description.schema_id) { //merge with parent description
                    description_schemaId = description.schema_id._id;
                    description = datasource_description.consolidateDescriptions(description);
                }
                done();
            });
    });

    batch.push((done) => {
        import_controller.Import_dataSourceDescriptions__enteringImageScrapingDirectly([description], job, rowIds, (err) => {
            if (err) {
                winston.error(`scrapeImages Import_dataSourceDescriptions__enteringImageScrapingDirectly err: ${err}`);
                return done(err);
            }

            done();
        });
    });

    batch.end((err) => {
        if (err) {
            winston.error(`Scrape Images Error: ${err.message}`);
            return next(err);
        }

        const updateQuery = { $set: { dirty: 0, imported: true, contentEdited: false } };
        const multi = { multi: true };
        if (description.schema_id) {
            datasource_description.update({ $or: [{ _id: datasetId }, { _id: description_schemaId }] }, updateQuery, multi, next);
        } else {
            datasource_description.update({ $or: [{ _id: datasetId }, { _otherSources: datasetId }] }, updateQuery, multi, next);
        }
    });
};
module.exports.scrapeImages = scrapeImages;

const importProcessed = (job, datasetId, next) => {
    const batch = new Batch();
    batch.concurrency(1);

    let description;
    let hasSchema = false;

    // ----> consolidate if its child dataset
    batch.push((done) => {
        datasource_description.findById(datasetId)
            .lean()
            .populate('schema_id _team schema_id._team')
            .exec(async (err, data) => {
                if (!data.preserveEditedData) {
                    try {
                        const update = {
                            $set: {
                                'updatedContent.edited': {},
                                'updatedContent.created': {},
                                'updatedContent.publishedStatus': {},
                            },
                        };

                        await datasource_description.findByIdAndUpdate(datasetId, update);
                    } catch (err) {
                        return done(err);
                    }
                }

                if (err) {
                    winston.error(`importProcessed datasource_description.findById err: ${err}`);
                    return done(err);
                }

                if (!data) {
                    return done(new Error(`No datasource exists (5): ${datasetId}`));
                }

                if (!data.hasOwnProperty('_team') && !data.hasOwnProperty('schema_id')) {
                    // appended datasets have a 'schema_id' but not a '_team' property
                    return done(new Error(`No team found for datasource: ${datasetId}`));
                }

                description = data;

                if (description.schema_id) { //merge with parent description
                    hasSchema = true;
                    description = datasource_description.consolidateDescriptions(description);
                }
                permissions.getDatasetPermissions(description._team, description.vizType, (err, datasetPermissions) => {
                    if (err) {
                        winston.error(`Problems with permissions of dataset.id: ${description._id} err: ${err}`);
                        return done(new Error(`Problems with permissions of dataset.id: ${description._id}`));
                    }
                    description.permissions = datasetPermissions;
                    done();
                });
            });
    });

    // --> remove processed row object
    batch.push(async (done) => {
        if (hasSchema) {
            return done();
        }

        const { lastImportTriggeredBy, createdFields } = description;

        const collectionName = (lastImportTriggeredBy === 'automated') ? `processedrowobjects-${description._id}-automated` : `processedrowobjects-${description._id}`;

        if (!isEmpty(createdFields)) {
            await copyCreatedFields(description);
        }

        mongoose_client.dropCollection(collectionName, (err) => {
            // Consider that the collection might not exist since it's in the importing process.
            if (err && err.code !== 26) {
                winston.error(`importProcessed mongoose_client.dropCollection err: ${err}`);
                return done(err);
            }
            winston.info(`Removed ${collectionName} (2), error: ${err}`);
            done();
        });
    });

    batch.push((done) => {
        if (!hasSchema && description.permissions.indexOf('useStandardImport') > -1) {
            const pKey = (description.lastImportTriggeredBy === 'automated') ? `${description._id}-automated` : description._id;

            const raw_row_objects_forThisDescription = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey).forThisDataSource_RawRowObject_model;
            raw_row_objects_forThisDescription.count((err, numberOfDocs) => {
                if (err) {
                    winston.error(`importProcessed raw_row_objects_forThisDescription.count err: ${err}`);
                    return done(err);
                }
                if (!numberOfDocs) {
                    return done(new Error('No count for number of docs'));
                }

                raw_source_documents.Model.update({ primaryKey: pKey }, { $set: { numberOfRows: numberOfDocs } }, (err) => {
                    winston.info(`Updated raw source document number of rows to the raw doc count pKey: ${pKey}`);
                    if (err) {
                        winston.error(`importProcessed raw_source_documents.Model.update err: ${err}`);
                        return done(err);
                    }
                    done(err);
                });
            });
        } else {
            done();
        }
    });

    batch.end((err) => {
        if (err) {
            return next(err);
        }

        import_controller.PostProcessRawObjects([description], job, (err) => {
            if (err) {
                winston.error(`err in queue processing import processed job: ${err}`);
                return next(err);
            }

            next();
        });
    });
};
module.exports.importProcessed = importProcessed;

const postImport = (job, datasetId, next) => {
    let description;
    let description_schemaId;

    const batch = new Batch();
    batch.concurrency(1);

    batch.push((done) => {
        datasource_description.findById(datasetId)
            .lean()
            .populate('schema_id _team schema_id._team')
            .exec((err, data) => {
                if (err) {
                    winston.error(`postImport raw_source_documents.Model.update err: ${err}`);
                    return done(err);
                }
                if (!data) {
                    return done(new Error(`No datasource exists (6): ${datasetId}`));
                }

                description = data;

                if (description.schema_id) { //merge with parent description
                    description_schemaId = description.schema_id._id;
                    description = datasource_description.consolidateDescriptions(description);
                }
                done();
            });
    });

    batch.push((done) => {
        postimport_caching_controller.GeneratePostImportCaches([description], job, done);
    });

    batch.push((done) => {
        let updateQuery;

        if (description.fe_image && description.fe_image.field && description.fe_image.scraped === false) { //need to scrape, dont update dirty now
            updateQuery = {
                $set: {
                    imported: true,
                    // Prevent showing the Publish button for Google Sheets reimports (no need for it as they are not revisioned)
                    replacement: description.replacement && !description.apiEndPoint,
                },
            };
        } else if (description.apiEndPoint) {
            //Though datasets created with apiEndPoint are never replaced (revisions created, working copy, etc)
            //We are leveraging 'replacment' in to trigger readDatasourceColumnsAndSampleRecords for
            //checking field validity / updating with new fields
            //At this point the import is done, and 'replacement' can be set back to false
            updateQuery = { $set: { dirty: 0, imported: true, contentEdited: false, replacement: false } };
        } else { //last step, can update dirty now
            updateQuery = { $set: { dirty: 0, imported: true, contentEdited: false } };
        }
        const multi = { multi: true };
        if (description_schemaId) { //update parent
            datasource_description.update({ $or: [{ _id: datasetId }, { _id: description_schemaId }] }, updateQuery, multi, done);

        } else {
            datasource_description.update({ $or: [{ _id: datasetId }, { _otherSources: datasetId }] }, updateQuery, multi, done);
        }
    });

    batch.end((err) => {
        if (err) {
            winston.error(`err in queue updating post import caches: ${err}`);
            return next(err);
        }

        next(null);
    });
};
module.exports.postImport = postImport;
