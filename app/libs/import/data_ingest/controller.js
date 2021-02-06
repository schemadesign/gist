const async = require('async');
const path = require('path');
const winston = require('winston');
const _ = require('lodash');

const raw_source_documents = require('../../../models/raw_source_documents');
const processed_row_objects = require('../../../models/processed_row_objects');
const import_raw_objects_controller = require('./raw_objects_controller');

function getImportFunction(dataSourceDescription) {
    let importFunction;

    if (dataSourceDescription.permissions.indexOf('useStandardImport') === -1) {
        try {
            const controller = require(path.join(__dirname, '/../../../../user/', dataSourceDescription._team.subdomain, '/src/import'));
            importFunction = controller.ParseAndImportRaw;
        } catch (e) {
            winston.error('no import controller for team ' + dataSourceDescription._team.subdomain + ' but is customViz. Add "useStandardImport" to visualization acl.');
        }
    }
    if (!_.isFunction(importFunction)) {
        importFunction = import_raw_objects_controller.ParseAndImportRaw;
    }

    return importFunction;
}

module.exports.Import_rawObjects = function (dataSourceDescriptions, job, fn) {
    let i = 1;

    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            const importFunction = getImportFunction(dataSourceDescription);

            importFunction(i, dataSourceDescription, job, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info(`Error encountered during raw objects import: ${err.message}`);
                fn(err);
            } else {
                winston.info('Raw objects import done.');
                job.log('Raw objects import done.');
                fn();
            }
        },
    );
};

const _proceedToScrapeImagesAndRemainderOfPostProcessing = function (indexInList, dataSourceDescription, job, rowIds, callback) {
    if (dataSourceDescription.fe_image && dataSourceDescription.fe_image.field && !dataSourceDescription.sample) {
        winston.info('start image scraping');
        job.log('start image scraping');

        processed_row_objects.GenerateImageURLFieldsByScraping(job, dataSourceDescription._team.subdomain, dataSourceDescription._id,
            dataSourceDescription.schemaId,
            dataSourceDescription.fe_image,
            rowIds,
            function (err) {

                if (err) {
                    winston.error('Error encountered while scraping image with "' + dataSourceDescription.title + '".');
                    return callback(err);
                } else {
                    return callback();
                }

            });
    } else {
        winston.info('skipping image scraping');
        job.log('skipping image scraping');
        callback();
    }
};

const _Import_dataSourceDescriptions__enteringImageScrapingDirectly = function (dataSourceDescriptions, job, rowIds, fn) {
    let i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            winston.info(' ' + i + ': Proceeding to image scraping of "' + dataSourceDescription.title + '"');
            job.log(`Proceeding to image scraping of "${dataSourceDescription.title}"`);

            _proceedToScrapeImagesAndRemainderOfPostProcessing(i, dataSourceDescription, job, rowIds, eachCb);
            i++;
        },
        function (err) {
            if (err) {
                winston.info(`Error encountered during image-scrapping: (${err.code})`, err);
                job.log(`Error encountered during image-scrapping: (${err.code})`, err);
                fn(err);
            } else {
                winston.info('Import completed.');
                job.log('Import completed.');
                fn();
            }
        },
    );
};
module.exports.Import_dataSourceDescriptions__enteringImageScrapingDirectly = _Import_dataSourceDescriptions__enteringImageScrapingDirectly;

const _afterGeneratingProcessedDataSet_performEachRowOperations = function (indexInList, dataSourceDescription, job, callback) {

    const dataSource_title = dataSourceDescription.title;
    const dataset_parentId = dataSourceDescription.schemaId;
    const datasetId = (dataSourceDescription.lastImportTriggeredBy === 'automated') ? `${dataSourceDescription._id}-automated` :
        dataSourceDescription._id;

    let forThisDataSource_mongooseContext;
    if (dataset_parentId) {
        forThisDataSource_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataset_parentId);
    } else {
        forThisDataSource_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId);
    }

    const forThisDataSource_nativeCollection = forThisDataSource_mongooseContext.Model;

    winston.info('🔁  Performing each-row operation for "' + dataSource_title + '"');

    job.log('🔁  Performing each-row operation and creating custom fields for "' + dataSource_title + '"');

    let eachCtx = dataSourceDescription.customFieldsToProcess;

    if (typeof dataSourceDescription.fe_nestedObject !== 'undefined' && dataSourceDescription.fe_nestedObject.prefix) {
        eachCtx = dataSourceDescription.fe_nestedObject;
        eachCtx.nested = true;
        eachCtx.numberOfInsertedRows = 0;
        eachCtx.numberOfRows = 0;
        eachCtx.pKeyQuery = {};
        eachCtx.id = dataSourceDescription._id;
        if (dataset_parentId) {
            eachCtx.pKeyQuery = { $regex: '^' + dataSourceDescription._id + '-' };
        } else {
            eachCtx.pKeyQuery = dataSourceDescription._id.toString();

        }
    }

    startIterations();

    function startIterations() {
        /*eachCtx could be array or object*/
        if (eachCtx === null || typeof eachCtx === 'undefined' || (Array.isArray(eachCtx) && !eachCtx.length) ||
            (!Array.isArray(eachCtx) && !eachCtx.fields.length)) {
            continueToAfterIterating();
        } else {
            eachCtx.nativeCollection = forThisDataSource_nativeCollection;
            afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, function (err) {
                if (err) {
                    winston.error('Error encountered while performing each-row operations "' + dataSource_title + '".');
                    job.log('  Error encountered while performing each-row operations "' + dataSource_title + '".');
                    callback(err); // bail early
                } else {
                    continueToAfterIterating(eachCtx);
                }
            });
        }
    }

    function afterGeneratingProcessedRowObjects_eachRowFn(eachCtx, cb) {
        if (typeof eachCtx.nested !== 'undefined' && eachCtx.nested == true) {

            const matchQuery = {};

            if (eachCtx.criteria !== null && typeof eachCtx.criteria !== 'undefined') {
                matchQuery['rowParams.' + eachCtx.criteria.fieldName] = eachCtx.criteria.value;
            }
            if (typeof eachCtx.pKeyQuery === 'string') {
                matchQuery['srcDocPKey'] = eachCtx.pKeyQuery;

            } else {
                matchQuery['pKey'] = eachCtx.pKeyQuery;

            }

            const groupQuery = formGroupQuery(eachCtx);

            let continueLoop = true;
            let counter = 1;
            let skipping = 0;
            let limit = 10;

            async.whilst(function () {
                if (counter === 1) {
                    return true;
                } else {
                    return continueLoop;
                }
            }, function (next) {
                eachCtx.nativeCollection.aggregate([
                    { $match: matchQuery },
                    { $skip: skipping },
                    { $limit: limit },
                    { $group: groupQuery },

                ], { allowDiskUse: true }, function (err, aggregatedResult) {

                    if (err) {
                        return next(err);
                    }

                    if (aggregatedResult.length == 0) {
                        continueLoop = false;
                        return next();
                    }

                    async.each(aggregatedResult, function (res, callback) {
                        const updateQuery = {};
                        updateQuery['rowParams.' + eachCtx.criteria.fieldName] = { $ne: eachCtx.criteria.value };
                        const matchingCond = res._id;
                        eachCtx.numberOfRows += res.count;

                        delete res._id;
                        delete res.count;

                        updateQuery['rowParams.' + eachCtx.nestingKey] = matchingCond;
                        const setQuery = formSetQuery(res, eachCtx.prefix, eachCtx.valueOverrides);

                        eachCtx.nativeCollection.update(updateQuery, { $push: setQuery }, function (err, result) {
                            if (err) {
                                return callback(err);
                            }
                            const r = JSON.parse(result);

                            eachCtx.numberOfInsertedRows += _.parseInt(r['n']);
                            eachCtx.numberOfRows += _.parseInt(r['n']);
                            callback();
                        });
                    }, function (err) {
                        skipping = counter * limit;
                        counter++;

                        if (eachCtx.numberOfRows !== 0 && eachCtx.numberOfRows % 100 === 0) {
                            winston.info('processed ' + eachCtx.numberOfRows + ' of nested fields');
                            job.log('  processed ' + eachCtx.numberOfRows + ' of nested fields');
                        }
                        next(err);
                    });
                });

            }, function (err) {
                const removeQuery = {};
                removeQuery['rowParams.' + eachCtx.criteria.fieldName] = eachCtx.criteria.value;
                eachCtx.nativeCollection.remove(removeQuery, cb);
            });

        } else {
            async.each(eachCtx, function (customField, outterCallback) {
                let continueLoop = true;
                let counter = 1;
                let skipping = 0;
                let limit = 1000;

                async.whilst(function () {
                    if (counter === 1) {
                        return true;
                    } else {
                        return continueLoop;
                    }
                }, function (next) {
                    const project = formProjectQuery(customField);

                    let useDelimiter = false;

                    if (customField.delimiterOnFields && customField.delimiterOnFields.length === 1 &&
                        customField.fieldsToMergeIntoArray.length === 1) {
                        useDelimiter = true;
                    }

                    eachCtx.nativeCollection.aggregate([
                        { $skip: skipping },
                        { $limit: limit },
                        { $project: project },
                    ], function (err, aggregatedResult) {
                        if (err) {
                            return next(err);
                        }

                        if (aggregatedResult.length === 0) {
                            continueLoop = false;
                            return next();
                        }

                        async.each(aggregatedResult, function (result, asynEachCb) {
                            const docId = result._id;
                            delete result._id;

                            if (useDelimiter) {
                                let delimiter = customField.delimiterOnFields[0];
                                if (delimiter === '" "') {
                                    delimiter = ' ';
                                }

                                const value = _.get(result, `${customField.fieldName}[0]`, '');
                                const stringValue = _.isNil(value) ? '' : value.toString();

                                result[customField.fieldName] = _.isEmpty(stringValue) ? [] : stringValue.split(delimiter).map(_.trim);
                            }

                            const setQuery = formSetQuery(result);

                            eachCtx.nativeCollection.update({ _id: docId }, { $set: setQuery }, function (err) {
                                asynEachCb(err);
                            });

                        }, function (err) {
                            skipping = counter * limit;
                            counter++;
                            next(err);
                        });
                    });
                }, function (err) {
                    outterCallback(err);
                });
            }, function (err) {
                return cb(err);
            });
        }
    }

    function formGroupQuery(ctx) {
        const ret = {};
        ret['_id'] = '$rowParams.' + ctx.nestingKey;
        for (let i = 0; i < ctx.fields.length; i++) {
            ret[ctx.fields[i]] = { $push: '$' + 'rowParams.' + ctx.fields[i] };
        }
        ret['count'] = { $sum: 1 };
        return ret;
    }

    function formProjectQuery(customField) {
        //assuming its merging to array
        const mergingFields = customField.fieldsToMergeIntoArray;
        const newFieldName = customField.fieldName;
        const p = {};

        p[newFieldName] = [];

        for (let i = 0; i < mergingFields.length; i++) {
            p[newFieldName].push('$rowParams.' + mergingFields[i]);
        }
        return p;
    }

    function formSetQuery(obj, prefix, valueOverrides) {
        const ret = {};
        for (let fieldName in obj) {
            if (!prefix || !valueOverrides) {
                const revisedKey = 'rowParams.' + fieldName;
                ret[revisedKey] = obj[fieldName];
                continue;
            }
            const revisedKey = 'rowParams.' + prefix + fieldName;
            let fieldValue = obj[fieldName];

            if (valueOverrides[fieldName]) {
                const keys = Object.keys(valueOverrides[fieldName]);
                keys.forEach(function (key) {
                    const re = new RegExp(key, 'i');
                    fieldValue = fieldValue.map(function (f) {
                        return f.replace(re, valueOverrides[fieldName][key]);
                    });

                });
            }
            ret[revisedKey] = {};
            ret[revisedKey].$each = fieldValue;
        }
        return ret;
    }

    function afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(eachCtx, cb) {
        winston.info('Saved custom fields.');

        if (typeof eachCtx.nested !== 'undefined' && eachCtx.nested === true) {
            let updateId = (dataSourceDescription.lastImportTriggeredBy === 'automated') ? `${dataSourceDescription._id}-automated` :
                dataSourceDescription._id;

            if (dataset_parentId) {
                updateId = dataset_parentId;
            }

            raw_source_documents.IncreaseNumberOfRawRows(updateId, eachCtx.numberOfInsertedRows - eachCtx.numberOfRows, function (err) {
                if (err) {
                    winston.error('Error when modifying number of rows in raw source documents: %s', err);
                }
                cb(err);
            });
        } else {
            cb(null);
        }
    }

    function continueToAfterIterating(eachCtx) {
        /* check object key length would not be appropriate because eacCtx could be array */
        if (!_.isNil(eachCtx)) {
            afterGeneratingProcessedRowObjects_afterIterating_eachRowFn(
                eachCtx,
                function (err) {
                    if (err) {
                        winston.error('Error encountered while performing each-row operations "' + dataSource_title + '".');
                    } else {
                        winston.info('' + indexInList + ': Imported processed rows and custom field objects --  "' + dataSource_title + '".');
                        job.log('  ' + indexInList + ': Imported processed rows and custom field objects for "' + dataSource_title + '".');
                    }
                    //
                    callback(err);
                },
            );
        } else {
            winston.info('' + indexInList + ': Imported processed rows and custom field objects  --  "' + dataSource_title + '".');
            job.log('  ' + indexInList + ': Imported processed rows and custom field objects  "' + dataSource_title + '".');
            callback(); // all done
        }
    }
};

const _postProcess = function (indexInList, dataSourceDescription, job, callback) {
    const datasetId = (dataSourceDescription.lastImportTriggeredBy === 'automated') ? `${dataSourceDescription._id}-automated` :
        dataSourceDescription._id;

    const dataSource_title = dataSourceDescription.title;
    const parentId = dataSourceDescription.schemaId;

    winston.info('🔁  ' + indexInList + ': Post-processing "' + dataSource_title + '"');
    job.log('🔁  Post-processing "' + dataSource_title + '"');

    //
    //
    // Firstly, generate the whole processed objects dataset
    //
    processed_row_objects.InsertProcessedDatasetFromRawRowObjects(
        {
            job,
            datasetId,
            parentId,
            updatedContent: dataSourceDescription.updatedContent || {},
            preserveEditedData: dataSourceDescription.preserveEditedData,
            columns: dataSourceDescription.columns,
        },
        function (err) {
            if (err) {
                winston.error('Error encountered while generating whole processed dataset "' + dataSource_title + '".');
                return callback(err);
            }

            if (dataSourceDescription.permissions.indexOf('useStandardImport') === -1) {
                try {
                    const controller = require(path.join(__dirname, '/../../../../user/', dataSourceDescription._team.subdomain, '/src/import'));
                    if (typeof controller.afterGeneratingProcessedDataSet_performEachRowOperations !== 'undefined') {
                        return controller.afterGeneratingProcessedDataSet_performEachRowOperations(indexInList, dataSourceDescription, job, callback);
                    }
                } catch (e) {
                    winston.error('controller error: ' + e);
                }
            }

            _afterGeneratingProcessedDataSet_performEachRowOperations(indexInList, dataSourceDescription, job, function (err) {

                if (err) {
                    winston.error('Error encountered while generating whole processed dataset "' + dataSource_title + '".');
                    return callback(err);
                }

                job.log('🔁  Now generating fields by joining datasets ');

                async.eachSeries(
                    dataSourceDescription.relationshipFields,
                    function (description, next) {
                        const by = description.by;
                        const formingRelationship = (typeof description.relationship !== 'undefined' && description.relationship == true);
                        switch (by.operation) {
                            case 'Join': {
                                processed_row_objects.GenerateFieldsByJoining_comparingWithMatchFn(
                                    job,
                                    datasetId,
                                    description.field,
                                    description.singular,
                                    by.findingMatchOnField,
                                    by.joinDataset,
                                    by.withLocalField,
                                    by.obtainingValueFromField,
                                    formingRelationship,
                                    next,
                                );
                                break;
                            }

                            default: {
                                winston.error(`Unrecognized post-processing field generation operation "${by.operation}" in ${description}`);
                                break;
                            }
                        }
                    },
                    function (err) {
                        if (err) {
                            winston.error(`Error encountered while processing "${dataSource_title}".`);
                        }
                        return callback(err);
                    },
                );
            });
        },
    );
};

module.exports.PostProcessRawObjects = function (dataSourceDescriptions, job, fn) {
    let i = 1;
    async.eachSeries(
        dataSourceDescriptions,
        function (dataSourceDescription, eachCb) {
            _postProcess(i, dataSourceDescription, job, (err) => {
                processed_row_objects.initializeBackgroundIndexBuilding(dataSourceDescription);
                i++;
                if (err) {
                    eachCb(err);
                } else {
                    if (dataSourceDescription.permissions.indexOf('postProcess') > -1) {
                        try {
                            const importCtrl = require(path.join(__dirname, '/../../../../user/', dataSourceDescription._team.subdomain, '/src/import'));
                            importCtrl.postProcess(dataSourceDescription._id, job, eachCb);
                        } catch (e) {
                            winston.error(`no post processing found: ${e}`);
                            eachCb();
                        }
                    } else {
                        eachCb();
                    }
                }
            });
        },
        function (err) {
            if (err) {
                winston.info('Error encountered during import post-processing:', err.message);
                fn(err);
            } else {
                winston.info('Import post-processing done.');
                job.log('  Import post-processing done.');
                fn();
            }
        },
    );
};
