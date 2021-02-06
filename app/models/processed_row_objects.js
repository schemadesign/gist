const async = require('async');
const winston = require('winston');
const raw_source_documents = require('./raw_source_documents');
const raw_row_objects = require('./raw_row_objects');
const mongoose_client = require('./mongoose_client');
const _ = require('lodash');

const { subtractMarkdown } = require('../../shared/markdown');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const DUPLICATION_ERROR_CODE = 11000;

const new_RowObjectsModelName = function (objectId) {
    return `ProcessedRowObjects-${objectId}`;
};

const MongooseContextsBySrcDocPKey = {};

const _new_byPathUpdateDoc_fromPureDocUpdates = function (doc) {
    const byPathUpdateDoc = {};
    const rootKeys = Object.keys(doc);
    const rootKeys_length = rootKeys.length;
    for (let i = 0; i < rootKeys_length; i++) {
        const key = rootKeys[i];
        const val = doc[key];
        if (key !== 'rowParams') {
            byPathUpdateDoc[key] = val;
        } else {
            const rowParams_keys = Object.keys(val);
            const rowParams_keys_length = rowParams_keys.length;
            for (let j = 0; j < rowParams_keys_length; j++) {
                const rowParams_key = rowParams_keys[j];
                byPathUpdateDoc['rowParams.' + rowParams_key] = val[rowParams_key];
            }
        }
    }

    return byPathUpdateDoc;
};

module.exports.New_templateForPersistableObject = function (rowObject_primaryKey, sourceDocumentRevisionKey, rowParams) {
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowParams: rowParams,
    };
};

const _Lazy_Shared_ProcessedRowObject_MongooseContext = function (objectId) {

    let mongooseContext = MongooseContextsBySrcDocPKey[objectId];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    const Scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        published: { type: Boolean, default: true },
        rowParams: Schema.Types.Mixed,
        markdowns: Schema.Types.Mixed,
        created: Boolean,
    }, { timestamps: true });
    Scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: true });
    Scheme.index({ srcDocPKey: 1 }, { unique: false });

    const ModelName = new_RowObjectsModelName(objectId);
    const Model = mongoose.model(ModelName, Scheme, ModelName.toLowerCase());
    //
    mongooseContext =
        {
            Scheme: Scheme,
            ModelName: ModelName,
            Model: Model,
        };
    MongooseContextsBySrcDocPKey[objectId] = mongooseContext;

    return mongooseContext;
};

module.exports.Lazy_Shared_ProcessedRowObject_MongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext;

module.exports.initializeBackgroundIndexBuilding = function (description) {
    let createIndexQuery;
    const mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(description._id).Model.collection;

    if (_.isEmpty(description.relationshipFields)) {
        if (!_.isEmpty(description.raw_rowObjects_coercionScheme)) {
            // set object title to raw_rowObjects_coercionScheme if doesn't exist
            const columns = Object.keys(description.raw_rowObjects_coercionScheme);
            if (!description.objectTitle) {
                description.objectTitle = columns[0];
            }

            createIndexQuery = {};
            createIndexQuery['rowParams.' + description.objectTitle] = 1;
            mongooseContext_ofTheseProcessedRowObjects.createIndex(createIndexQuery, (err, result) => {
                if (err) {
                    winston.error(`Error creating index for field ${description.objectTitle} : ${err}`);
                } else {
                    winston.info(`initialize index building for field (1): ${description.objectTitle}: ${result}`);
                }
            });
        }
    } else {
        for (let i = 0; i < description.relationshipFields.length; i++) {
            const buildField = description.relationshipFields[i].by.withLocalField;
            createIndexQuery = {};
            createIndexQuery['rowParams.' + buildField] = 1;
            mongooseContext_ofTheseProcessedRowObjects.createIndex(createIndexQuery, { background: true });

            winston.info('initialize index building for field (2): ' + buildField);
        }
    }
};

module.exports.InsertProcessedDatasetFromRawRowObjects = ({ job, datasetId, parentId, updatedContent, preserveEditedData, columns = [] }, callback) => {
    const shouldUpdateContent = _.get(updatedContent, 'new', false) && preserveEditedData;

    mongoose_client.WhenMongoDBConnected(async () => {
        const insertTo = parentId || datasetId;

        try {
            job.log(`Start processing row objects of ${insertTo}`);
            winston.info(`Start processing row objects of ${insertTo}`);

            const mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(insertTo);
            const mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;

            const processedRowObjects_mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(insertTo);
            const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
            const processedRowObjects_mongooseCollection = processedRowObjects_mongooseModel.collection;
            const bulkWriteOptions = process.env.INSIGHT ? { ordered: true } : { ordered: false };

            job.log(`Get all row objects of ${insertTo}`);
            winston.info(`Get all row objects of ${insertTo}`);
            const docs = await mongooseModel_ofRawRowObjectsBeingProcessed.find({});
            const updateDocs = docs.map(item => ({ insertOne: { document: item } }));
            job.log(`Start saving processed row objects of ${insertTo}`);
            winston.info(`Start saving processed row objects of ${insertTo}`);
            await processedRowObjects_mongooseCollection.bulkWrite(updateDocs, bulkWriteOptions);
            job.log(`Finish saving processed row objects of ${insertTo}`);
            winston.info(`Finish saving processed row objects of ${insertTo}`);

            if (shouldUpdateContent) {
                job.log('Start updating processed row objects');
                winston.info('Start updating processed row objects');

                const asyncPromises = [];
                const { publishedStatus = {}, edited = {}, created = {} } = updatedContent;

                if (!_.isEmpty(publishedStatus)) {
                    const publishedStatusPromises = _.keys(publishedStatus).map(key => processedRowObjects_mongooseModel.findOneAndUpdate({ pKey: key }, { published: publishedStatus[key] }));
                    asyncPromises.push(publishedStatusPromises);
                }

                if (!_.isEmpty(edited)) {
                    const getUpdate = edit => _.keys(edit).reduce((prev, key) => ({
                        ...prev,
                        [`rowParams.${key}`]: edit[key],
                    }), {});
                    const editedPromises = _.keys(edited).map(key => processedRowObjects_mongooseModel.findOneAndUpdate({ pKey: key }, getUpdate(edited[key])));
                    asyncPromises.push(editedPromises);
                }

                if (!_.isEmpty(created)) {
                    const createdPromise = processedRowObjects_mongooseModel.insertMany(_.map(created, value => value));
                    asyncPromises.push(createdPromise);
                }

                await Promise.all(asyncPromises);

                job.log('Finish updating processed row objects');
                winston.info('Finish updating processed row objects');
            }

            const markdownsFields = columns.filter(({ data_type }) => data_type === 'Markdown').map(({ name }) => name);

            if (!_.isEmpty(markdownsFields)) {
                job.log('Start subtract markdown');
                winston.info('Start subtract markdown');
                const results = await processedRowObjects_mongooseModel.find({});
                const newResults = [];

                results.map(async (item) => {
                    if (!item.markdowns) {
                        item.markdowns = {};
                    }

                    markdownsFields.forEach((name) => {
                        item.markdowns[name] = item.rowParams[name];
                        item.rowParams[name] = subtractMarkdown(item.rowParams[name] || '');
                    });

                    newResults.push(item);
                });

                await processedRowObjects_mongooseModel.deleteMany({});
                await processedRowObjects_mongooseModel.insertMany(newResults);

                job.log('Finish subtract markdown');
                winston.info('Finish subtract markdown');
            }

            job.log('Finish processing row objects');
            winston.info('Finish processing row objects');
            return callback(null);
        } catch (error) {
            winston.error(`Error on updating processed row objects of ${insertTo}:`, error);

            if (error.code === DUPLICATION_ERROR_CODE) {
                return callback();
            }

            job.log(`Error on updating processed row objects of ${insertTo}: ${error}`);
            return callback(error);
        }
    });
};

module.exports.GenerateProcessedDatasetFromRawRowObjects = function (dataSource_team_subdomain, dataSource_uid, dataSource_importRevision, dataSource_title, callback) {
    // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any
    // but its own managed methods
    mongoose_client.WhenMongoDBConnected(function () {
        winston.info('Pre-generating whole processed row objects collection from raw row objects of "' + dataSource_title + '".');

        const pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        const mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        const mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        const nativeCollection_ofRawRowObjectsBeingProcessed = mongooseModel_ofRawRowObjectsBeingProcessed.collection;

        const mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        const mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        const nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;

        const bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();

        let numDocs = 0; // to derive

        function proceedToPersist() {
            winston.info('Upserting ' + numDocs + ' processed rows for "' + dataSource_title + '".');

            const writeConcern = {
                upsert: true,
                // note: we're turning this off as it's super slow for large datasets like Artworks
                // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to
                // the journal'
            };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err) {
                if (err) {

                    winston.error('Error while saving processed row objects (2): ', err);
                } else {
                    winston.info('Saved collection of processed row objects.');
                }
                callback(err);
            });
        }

        //
        let hasErroredAndReturned = false;
        let hasReachedEndOfCursor = false;
        let numberOfDocumentsFoundButNotYetProcessed = 0;
        // Find all row raw objs
        nativeCollection_ofRawRowObjectsBeingProcessed.find({}, {}, function (err, cursor) {
            if (err) {
                winston.error('Error while generating processed row objects:', err);
                hasErroredAndReturned = true;
                callback(err);

                return;
            }
            cursor.each(function (err, doc) {
                if (hasErroredAndReturned === true) {
                    winston.warn('Each called after hasErroredAndReturned.');

                    return;
                }
                if (err) {
                    winston.error('Error while generating processed row objects:', err);
                    hasErroredAndReturned = true;
                    callback(err);

                    return;
                }
                if (doc === null) { // then we're finished
                    hasReachedEndOfCursor = true;
                    if (numberOfDocumentsFoundButNotYetProcessed === 0) { // in case we've already finished, i.e. if the operation we did with the docs was sync and not async
                        proceedToPersist();
                    }

                    return;
                }
                //
                numberOfDocumentsFoundButNotYetProcessed += 1;
                numDocs += 1;

                //
                function _finishedWithDoc() {

                    numberOfDocumentsFoundButNotYetProcessed -= 1; // finished with this doc - decrement
                    //
                    if (hasReachedEndOfCursor === true) {
                        if (numberOfDocumentsFoundButNotYetProcessed === 0) {
                            proceedToPersist();
                        }
                    }
                }

                //
                //
                const bulkOperationQueryFragment =
                    {
                        pKey: doc.pKey,
                        srcDocPKey: doc.srcDocPKey,
                    };
                // we do not $set the whole doc but use rowParams.* paths so that
                // we don't overwrite the whole doc, blowing away stuff like already-imported images
                const byPathUpdateDoc = _new_byPathUpdateDoc_fromPureDocUpdates(doc);
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update({ $set: byPathUpdateDoc });
                //
                _finishedWithDoc();
            });
        });
    });
};

module.exports.GenerateFieldsByJoining_comparingWithMatchFn = function (job, datasetId, generateFieldNamed, isSingular, findingMatchOnField, joinDatasetId, withLocalField, obtainingValueFromField_orUndefined, or_formingRelationship, callback) {
    // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any
    // but its own managed methods
    mongoose_client.WhenMongoDBConnected(function () {
        winston.info('Generating field "' + generateFieldNamed +
            '" of "' + datasetId +
            '" by joining on "' + findingMatchOnField +
            '" of data source "' + joinDatasetId + '".');

        const mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId);
        const mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        const nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;

        // var bulkOperation_ofTheseProcessedRowObjects =
        // nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();

        const groupQuery = { $group: {} };
        groupQuery.$group['_id'] = '$rowParams.' + withLocalField;

        const select = {};
        select['_id'] = 1;
        select['rowParams.' + findingMatchOnField] = 1;
        let storingReference = true;

        if (isSingular || typeof obtainingValueFromField_orUndefined !== 'undefined') {
            select['rowParams.' + obtainingValueFromField_orUndefined] = 1;
            storingReference = false;
        }

        const cursor = _Lazy_Shared_ProcessedRowObject_MongooseContext(joinDatasetId).Model.find({}).select(select).cursor();

        let count = 0;

        cursor.on('data', function (doc) {

            count += 1;

            const findMatch = {};

            if (Array.isArray(doc.rowParams[findingMatchOnField])) {
                findMatch['rowParams.' + withLocalField] = { $in: doc.rowParams[findingMatchOnField] };
            } else {
                findMatch['rowParams.' + withLocalField] = doc.rowParams[findingMatchOnField];
            }

            let updateQuery = { $set: {} };

            if (!storingReference) {
                updateQuery.$set['rowParams.' + generateFieldNamed] = doc.rowParams[obtainingValueFromField_orUndefined];
            } else {
                updateQuery = { $addToSet: {} };
                updateQuery.$addToSet['rowParams.' + generateFieldNamed] = doc['_id'];
            }

            nativeCollection_ofTheseProcessedRowObjects.update(findMatch, updateQuery, { multi: true });

            if (count !== 0 && count % 1000 === 0) {

                winston.info('processed ' + count + ' records of the joined field ' + generateFieldNamed);
                job.log('  processed ' + count + ' records of the joined field ' + generateFieldNamed);
            }

        }).on('error', function (err) {

            winston.error('Error while generating field by reverse-join iterating with cursor :', err);
            return callback(err);

        }).on('end', function () {

            if (count % 1000 !== 0) {

                winston.info('processed ' + count + ' records of the joined field ' + generateFieldNamed);
                job.log('  processed ' + count + ' records of the joined field ' + generateFieldNamed);
            }

            const setToNull = {};
            setToNull['rowParams.' + generateFieldNamed] = { $exists: false };
            const setTo = { $set: {} };
            setTo.$set['rowParams.' + generateFieldNamed] = null;

            nativeCollection_ofTheseProcessedRowObjects.update(setToNull, setTo, { multi: true }, function (err) {
                if (err) {
                    winston.error('Error while saving generated fields of processed row objects: ', err);
                    process.nextTick(function () {
                        callback(err);
                    });
                } else {
                    winston.info('Saved all generated fields "' + generateFieldNamed + '" on processed row objects');
                    job.log('  [' + (new Date()).toString() + '] Saved all generated fields "' + generateFieldNamed + '" on processed row objects.');
                    process.nextTick(function () {
                        callback(err);
                    });
                }
            });

        });
    });
};

module.exports.GenerateFieldsByJoining = function (dataSource_uid, dataSource_importRevision, dataSource_title, generateFieldNamed, isSingular, findingMatchOnFields, ofOtherRawSrcUID, andOtherRawSrcImportRevision, withLocalField, obtainingValueFromField_orUndefined, or_formingRelationship, callback) {
    // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any
    // but its own managed methods
    mongoose_client.WhenMongoDBConnected(function () {
        winston.info('Generating field "' + generateFieldNamed +
            '" of "' + dataSource_title +
            '" by joining on "' + findingMatchOnFields +
            '" of data source "' + ofOtherRawSrcUID + '" revision "' + andOtherRawSrcImportRevision + '".');

        const pKey_ofFromDataSourceDoc = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(ofOtherRawSrcUID, andOtherRawSrcImportRevision);
        const pKey_ofDataSrcDocBeingProcessed = raw_source_documents.NewCustomPrimaryKeyStringWithComponents(dataSource_uid, dataSource_importRevision);
        //
        const mongooseContext_ofFromRawRowObjects = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofFromDataSourceDoc);
        //
        const mongooseContext_ofRawRowObjectsBeingProcessed = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        const mongooseModel_ofRawRowObjectsBeingProcessed = mongooseContext_ofRawRowObjectsBeingProcessed.forThisDataSource_RawRowObject_model;
        //
        const mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(pKey_ofDataSrcDocBeingProcessed);
        const mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        const nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        const bulkOperation_ofTheseProcessedRowObjects = nativeCollection_ofTheseProcessedRowObjects.initializeUnorderedBulkOp();
        const getIdInsteadOfValueFromField = typeof obtainingValueFromField_orUndefined === 'undefined';
        //
        async.each(findingMatchOnFields, function (findingMatchOnField, eachCB) {
            const aggregationOperators = [{ $unwind: `$rowParams.${withLocalField}` }];
            let projectOperator = { $project: { pKey: 1, srcDocPKey: 1 } };
            projectOperator['$project']['rowParams.' + withLocalField] = 1;
            aggregationOperators.push(projectOperator);
            aggregationOperators.push({
                $lookup: {
                    from: mongooseContext_ofFromRawRowObjects.forThisDataSource_rowObjects_modelName.toLowerCase(),
                    as: 'fromProcessedRowObjectDoc',
                    localField: 'rowParams.' + withLocalField,
                    foreignField: 'rowParams.' + findingMatchOnField,
                },
            });
            projectOperator = { $project: { pKey: 1, srcDocPKey: 1 } };
            if (getIdInsteadOfValueFromField) {
                projectOperator['$project']['fromProcessedRowObjectDoc._id'] = 1;
            } else {
                projectOperator['$project']['fromProcessedRowObjectDoc.rowParams.' + obtainingValueFromField_orUndefined] = 1;
            }
            aggregationOperators.push(projectOperator);

            let counter = 0;
            const cursor = mongooseModel_ofRawRowObjectsBeingProcessed.collection.aggregate(aggregationOperators, { cursor: { batchSize: 100 } });

            cursor.on('data', function (item) {
                if (counter !== 0 && counter % 1000 === 0) {
                    winston.debug(`${counter} of local '${pKey_ofDataSrcDocBeingProcessed}' with foreign '${pKey_ofFromDataSourceDoc}'`);
                }

                let foreignValueToExtract = item.fromProcessedRowObjectDoc;
                let persistableValue = null;
                if (isSingular) {
                    foreignValueToExtract = foreignValueToExtract ? foreignValueToExtract[0] : foreignValueToExtract;
                    if (getIdInsteadOfValueFromField) {
                        persistableValue = foreignValueToExtract._id;
                    } else if (foreignValueToExtract) {
                        persistableValue = foreignValueToExtract.rowParams[obtainingValueFromField_orUndefined];
                    }
                } else if (foreignValueToExtract) {
                    persistableValue = [];
                    foreignValueToExtract.forEach(function (record) {
                        if (getIdInsteadOfValueFromField) {
                            persistableValue.push(record._id);
                        } else {
                            persistableValue.push(record.rowParams[obtainingValueFromField_orUndefined]);
                        }
                    });
                }
                //
                const bulkOperationQueryFragment =
                    {
                        pKey: item.pKey,
                        srcDocPKey: item.srcDocPKey,
                    };
                const updateFragment = {};
                updateFragment['$set'] = {};
                updateFragment['$set']['rowParams.' + generateFieldNamed] = persistableValue;
                // ^ Note that we're only updating a specific path, not the whole rowParams value
                bulkOperation_ofTheseProcessedRowObjects.find(bulkOperationQueryFragment).upsert().update(updateFragment);

                counter++;
            });
            cursor.on('end', function () {
                eachCB();
            });
        }, function (err) {
            if (err) {
                return callback(err, null);
            }
            proceedToPersist();
        });

        //
        function proceedToPersist() {
            winston.info('Upserting processed rows for "' + dataSource_title + '" having generated fields named "' + generateFieldNamed + '".');
            //
            const writeConcern =
                {
                    upsert: true,
                    // note: we're turning this off as it's super slow for large datasets like Artworks
                    // j: true // 'requests acknowledgement from MongoDB that the write operation has been written to
                    // the journal'
                };
            bulkOperation_ofTheseProcessedRowObjects.execute(writeConcern, function (err) {
                if (err) {
                    winston.error('Error while saving generated fields of processed row objects: ', err);
                } else {
                    winston.info('Saved generated fields on processed row objects.');
                }
                callback(err);
            });
        }
    });
};

module.exports.EnumerateProcessedDataset = function (datasetId, parentId, eachFn, errFn, completeFn) {
    // eachFn: (doc, cb) -> Void ……… call cb(null_optl) when done with doc
    // errFn: (err) -> Void
    // completeFn: () -> Void
    // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any
    // but its own managed methods
    mongoose_client.WhenMongoDBConnected(function () {

        let iterateDataset = datasetId;
        if (parentId) {
            iterateDataset = parentId;
        }
        const mongooseContext_ofTheseProcessedRowObjects = _Lazy_Shared_ProcessedRowObject_MongooseContext(iterateDataset);
        const mongooseModel_ofTheseProcessedRowObjects = mongooseContext_ofTheseProcessedRowObjects.Model;
        const nativeCollection_ofTheseProcessedRowObjects = mongooseModel_ofTheseProcessedRowObjects.collection;
        //
        let hasErroredAndReturned = false;
        let hasReachedEndOfCursor = false;
        let numberOfDocumentsFoundButNotYetProcessed = 0;
        //

        let query = {};

        if (typeof parentId !== 'undefined') {
            query = { pKey: { $regex: '^' + datasetId + '-' } };
        }
        // if (query_optl == null || typeof query_optl === 'undefined') {
        //     query = {};
        // } else {
        //     for (var opt in query_optl) {
        //         query[opt] = query_optl[opt];
        //     }
        // }

        nativeCollection_ofTheseProcessedRowObjects.find(query, { sort: { _id: 1 } }, function (err, cursor) {
            if (err) { // No cursor yet so we do not call closeCursorAndReturnWithErr(err)
                hasErroredAndReturned = true;
                errFn(err);

                return;
            }

            function closeCursorAndReturnWithErr(err) {
                hasErroredAndReturned = true;
                cursor.close(function (closeErr) {
                    if (closeErr) {
                        winston.warn('Error has occurred on cursor close after err returned from each doc:', closeErr);
                    }
                    errFn(err);
                });
            }

            cursor.each(function (err, doc) {
                if (hasErroredAndReturned === true) {
                    winston.warn('Each called after hasErroredAndReturned.');

                    return;
                }
                if (err) {
                    closeCursorAndReturnWithErr(err);

                    return;
                }
                if (doc === null) { // then we're finished
                    hasReachedEndOfCursor = true;
                    if (numberOfDocumentsFoundButNotYetProcessed === 0) { // in case we've already finished, i.e. if the operation we did with the docs was sync and not async
                        completeFn();
                    }

                    return;
                }
                //
                numberOfDocumentsFoundButNotYetProcessed += 1;

                //
                function _finishedWithDoc() {
                    numberOfDocumentsFoundButNotYetProcessed -= 1; // finished with this doc - decrement
                    //

                    if (hasReachedEndOfCursor === true) {
                        if (numberOfDocumentsFoundButNotYetProcessed === 0) {
                            completeFn();
                        }
                    }
                }

                //
                eachFn(doc, function (err) {
                    if (err) {
                        closeCursorAndReturnWithErr(err);
                    }
                    _finishedWithDoc();
                });
            });
        });
    });
};

// only needed for image scraping using selector
const xray = require('x-ray');
const xray_instance = xray();

const image_hosting = require('../libs/utils/aws-image-hosting');

// customize it for string coming back from scraper
function extractRawUrl(scrapedString) {

    if (!scrapedString) {
        return '';
    }

    const urlsAndSizes = scrapedString.split('_');
    const largestSize = urlsAndSizes[0];
    if (largestSize === undefined) {
        winston.error(urlsAndSizes);
    }
    return largestSize + 'jpg';
}

function scrapeImages(job, folder, mongooseModel, doc, imageField, hostingOpt, selector, outerCallback) {
    //if the images are nested
    //this only works for one level of nesting, though
    let htmlSourceAtURL;
    if (imageField.includes('.')) {
        const nestedImageField = imageField.split('.');
        if (_.isNil(doc['rowParams'][nestedImageField[0]])) {
            htmlSourceAtURL = null;
        } else {
            htmlSourceAtURL = doc['rowParams'][nestedImageField[0]][nestedImageField[1]];
        }
    } else {
        htmlSourceAtURL = doc['rowParams'][imageField];
    }

    winston.info('Scraping image URL from "' + htmlSourceAtURL + '"…');
    job.log('Scraping image URL from "' + htmlSourceAtURL + '"…');

    if (_.isNil(selector)) {
        return outerCallback(null, job, folder, mongooseModel, doc, htmlSourceAtURL, hostingOpt, null);
    }

    //update moma url and then export to csv
    xray_instance.timeout(100000)(htmlSourceAtURL, selector)(function (err, scrapedString) {
        if (err) {
            winston.error('scrapeImages err: ' + err);
        } else {
            const u = extractRawUrl(scrapedString);
            winston.debug(u);
            const bulkOperationQueryFragment = {
                pKey: doc.pKey,
                srcDocPKey: doc.srcDocPKey,
            };

            mongooseModel.update(bulkOperationQueryFragment, { $set: { 'rowParams.imageURL': u } }, function (err) {
                if (err) {
                    winston.error('error while updating', err);
                }
                winston.debug('returning outer callback with mostly null fields');
                return outerCallback(null, null, null, null, null, null, null, selector);
            });
        }
    });
}

function updateDocWithImageUrl(job, folder, mongooseModel, doc, url, hostingOpt, selector, outerCallback) {
    //generating url only, no actual scraping
    if (selector && selector !== '' && typeof selector === 'string') {
        return outerCallback(null);
    }

    const destinationFilenameSansExt = doc.pKey;
    if (!hostingOpt) {
        hostingOpt = true;
    }

    image_hosting.hostImageLocatedAtRemoteURL(folder, url, hostingOpt, destinationFilenameSansExt,
        function (err) {
            if (err) {
                winston.error(`Error during image hosting: ${err.message}`);
            }
            winston.info('Download/host image source for different sizes and views for doc ' + doc.pKey);
            return outerCallback(err);
        });
}

module.exports.GenerateImageURLFieldsByScraping =
    function (job, dataSource_team_subdomain, datasetId, schemaId, imageSource, rowIds, callback) {
        winston.info('GenerateImageURLFieldsByScraping imageSource:' + imageSource);

        // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for
        // any but its own managed methods
        mongoose_client.WhenMongoDBConnected(function () {
            winston.info('Generating fields by scraping images for "' + datasetId + '".');

            let mongooseContext;
            let mongooseModel;

            const datasetQuery = {};

            if (schemaId) {
                // datasetQuery["pKey"] = {$regex: "^" + datasetId + "-"}
                mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(schemaId);
            } else {
                mongooseContext = _Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId);
            }

            mongooseModel = mongooseContext.Model;

            datasetQuery['rowParams.' + imageSource.field] = { $ne: '' };

            // If rowIds was specified only scrape those ids
            if (rowIds && rowIds.length > 0) {
                datasetQuery['_id'] = {
                    $in: rowIds.map(row => ObjectId(row)),
                };
            }

            const folder = `${dataSource_team_subdomain}/datasets/${schemaId || datasetId}/assets/images/`;

            const description = require('./descriptions');

            mongooseModel.find(datasetQuery, function (err, docs) { // this returns all docs in memory but at least it's simple to iterate them synchronously\
                const N = 30; //concurrency limit
                const numDocuments = docs.length;
                let documentProcessed = 0;

                if (!numDocuments) {
                    return callback();
                }

                const q = async.queue(function (task, cb) {
                    const doc = task.doc;
                    async.waterfall(
                        [
                            async.apply(scrapeImages, job, folder, mongooseModel, doc, imageSource.field, imageSource.overwrite, imageSource.selector),
                            updateDocWithImageUrl,
                        ], function (err) {
                            if (err) {
                                winston.error(`Error while scraping an image: ${err.message}`);
                            }
                            job.progress(documentProcessed, numDocuments);
                            documentProcessed++;
                            cb(err);
                        });
                }, N);

                q.drain = function () {
                    winston.info('all items are processed for scraping, successfully scraped all of the images ');
                    if (!imageSource.selector) {
                        let dataset = datasetId;
                        if (schemaId) {
                            dataset = schemaId;
                        }

                        description.findOne({ _id: dataset }, function (err, dataset) {
                            if (err) {
                                return callback(err);
                            }
                            dataset.fe_image.scraped = true;
                            dataset.markModified('fe_image');
                            dataset.save(callback);
                        });
                    } else {
                        return callback(null); // all url has been saved to processed row objects
                    }
                };

                for (let i = 0; i < docs.length; i++) {
                    q.push({ doc: docs[i] });
                }
            });
        });
    };


module.exports.copyCreatedFields = ({ _id, columns, replaced_id }) => new Promise(async (resolve, reject) => {
    try {
        const id = replaced_id || _id;
        const createdFields = columns.filter(({ createdField }) => createdField);

        if (_.isEmpty(createdFields)) {
            return resolve();
        }

        const processedRowQuery = { $or: createdFields.map(({ name }) => ({ [`rowParams.${name}`]: { $exists: true } })) };
        const processedRowProject = createdFields.reduce((acc, { name }) => {
            acc[`rowParams.${name}`] = 1;
            acc.pKey = 1;

            return acc;
        }, {});
        const { Model: processedRowObjectModel } = _Lazy_Shared_ProcessedRowObject_MongooseContext(id);
        const processedRowObject = await processedRowObjectModel.find(processedRowQuery, processedRowProject);

        if (_.isEmpty(processedRowObject)) {
            return resolve();
        }

        const { forThisDataSource_RawRowObject_model: rawRowObjectModel } = raw_row_objects.Lazy_Shared_RawRowObject_MongooseContext(_id);
        const rawRowQuery = { pKey: { $in: processedRowObject.map(({ pKey }) => pKey) } };

        rawRowObjectModel.find(rawRowQuery).exec((err, rawRowObject) => {
            if (err) {
                return reject(err);
            }

            processedRowObject.map(async ({ pKey, rowParams }) => {
                const index = rawRowObject.findIndex((element) => element.pKey === pKey);

                Object.assign(rawRowObject[index].rowParams, rowParams);
                rawRowObject[index].markModified('rowParams');

                await rawRowObject[index].save();
            });

            resolve();
        });
    } catch (e) {
        reject(e);
    }
});
