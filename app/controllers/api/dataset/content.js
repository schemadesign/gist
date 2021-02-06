const winston = require('winston');
const ObjectId = require('mongodb').ObjectID;
const async = require('async');
const _ = require('lodash');
const moment = require('moment');

const processed_row_objects = require('../../../models/processed_row_objects');
const datasource_description = require('../../../models/descriptions');
const cached_values = require('../../../models/cached_values');
const datatypes = require('../../../libs/datasources/datatypes');
const { positiveInteger } = require('./content-helpers');
const { getDataset, hasValidDatasetSource } = require('../../../utils/datasets');

module.exports = {
    getContent,
    removeDateset,
    updateRow,
    getRow,
    createDataset,
};

/**
 * @param {String} datasetId
 */
const getProcessedRowObjectsModel = (datasetId) =>
    processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId).Model;

/**
 * removes values from cache (cache is used for filters sidebar)
 * @param {Object} row
 * @param {Function} callback
 */
const removeRowValuesFromCache = (row, callback) => {
    const datasetId = row.srcDocPKey;
    const rowId = row._id;
    const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);

    return async.waterfall([
        (callback) => async.filter(
            Object.keys(row.rowParams),
            (field, callback) => ProcessedRowObjects.findOne(
                {
                    _id: { $ne: rowId },
                    [`rowParams.${field}`]: row.rowParams[field],
                    published: { $ne: false },
                },
                (err, result) => callback(!err && !result),
            ),
            (results) => callback(null, results),
        ),
        (fields, callback) => {
            if (fields.length) {
                return cached_values.update(
                    { srcDocPKey: datasetId },
                    {
                        $pull: fields.reduce((query, field) => Object.assign({
                            [`limitedUniqValsByColName.${field}`]: row.rowParams[field],
                        }, query), {}),
                    },
                    { multi: true },
                    error => callback(error),
                );
            }

            callback();
        },
    ], callback);
};

const addRowValuesToCache = (row, callback) => {
    const datasetId = row.srcDocPKey;
    return cached_values.find(
        { srcDocPKey: datasetId },
        (error, data) => {
            if (error) {
                callback(error);
            }

            data.forEach((item, index) => {
                const dataToUpdate = _.intersection(Object.keys(item.limitedUniqValsByColName), Object.keys(row.rowParams));

                dataToUpdate.forEach((field) => {
                    const newField = row.rowParams[field];

                    if (!data[index].limitedUniqValsByColName[field].includes(newField)) {
                        data[index].limitedUniqValsByColName[field].push(newField);
                    }
                });

                data[index].markModified('limitedUniqValsByColName');
                data[index].save();
            });

            callback(null);
        },
    );
};

const updateDataset = ({ datasetId, updatedRow: { rowParams, published, markdowns } = {}, pKey, remove, createdRow, created }) => {
    const update = { contentEdited: true };
    const fields = _.merge(rowParams, markdowns);

    if (!_.isEmpty(fields)) {
        const type = created ? `created.${pKey}.rowParams` : `edited.${pKey}`;

        update.$set = _.reduce(fields, (result, value, key) => {
            result[`updatedContent.${type}.${key}`] = value;

            return result;
        }, {});
    } else if (!remove) {
        if (created) {
            update.$set = { [`updatedContent.created.${pKey}.published`]: published };
        } else {
            update.$set = { [`updatedContent.publishedStatus.${pKey}`]: published };
        }
    }

    if (remove) {
        update.$unset = {
            [`updatedContent.edited.${pKey}`]: '',
            [`updatedContent.created.${pKey}`]: '',
            [`updatedContent.publishedStatus.${pKey}`]: '',
        };
    }

    if (createdRow) {
        update.$set = { [`updatedContent.created.${createdRow.pKey}`]: createdRow };
    }

    return datasource_description.findByIdAndUpdate(
        datasetId,
        update,
        (err) => {
            if (err) {
                winston.error(err);
            }
        },
    );
};

/**
 * Adds updatedAt and published to row
 * @param {Object} row
 */
const addNewProperties = function (row) {
    if (!row.updatedAt) {
        row.updatedAt = ObjectId(row._id).getTimestamp();
    }
    if (typeof row.published === 'undefined') {
        row.published = true;
    }
    return row;
};

/**
 * morphs the value to look as it was originally displayed/imported
 * @param {Object} row
 * @param {Object} coercionScheme
 */
const originalDisplay = function (row, coercionScheme) {
    _.forEach(row.rowParams, function (value, key) {
        row.rowParams[key] = datatypes.originalValue(coercionScheme[key], value);
    });
    return row;
};

/**
 * loops through the content to add new properties and modify the display of values
 * @param {Array} content
 * @param {String} id
 * @param {Object} coercionScheme
 * @returns {Array} content
 */
const loopThroughContentRows = function (content, id, coercionScheme) {
    for (let i = 0; i < content.length; i++) {
        let row = content[i];
        content[i] = addNewProperties(row);
        content[i] = originalDisplay(row, coercionScheme);
    }
    return content;
};

/**
 * @param {Boolean} findBySchemaId
 * @param {String} id
 * @param {Function} callback
 */
const getDatasourceDescription = function (findBySchemaId, id, callback) {
    let findQuery;
    let returnQuery = {
        objectTitle: 1,
        connection: 1,
        fileName: 1,
        apiEndPoint: 1,
        schema_id: 1,
        updatedContent: 1,
        raw_rowObjects_coercionScheme: 1,
        smartsheet: 1,
        pipedrive: 1,
        datadotworld: 1,
        socrata: 1,
        salesforce: 1,
    };
    if (findBySchemaId) {
        findQuery = {
            schema_id: id,
        };
    } else {
        findQuery = {
            _id: id,
        };
        returnQuery.fe_excludeFields = 1;
    }
    datasource_description.findOne(findQuery, returnQuery)
        .lean()
        .exec(function (err, description) {
            if (err) {
                winston.error('Couldn\'t get datasource description: ' + err);
                callback(err);
            } else {
                callback(null, description);
            }
        });
};

/**
 * @param {Object} args
 * @param {Function} callback
 */
const getFromProcessedRowObjects = function (args, callback) {
    const processedRowObjects_mongooseModel = getProcessedRowObjectsModel(args.id);

    processedRowObjects_mongooseModel.find(args.findQuery, args.fieldsToReturn)
        .skip(args.skip)
        .limit(args.limit)
        .sort(args.sort)
        .exec(function (err, foundRows) {
            if (err) {
                return callback(err);
            }
            // foundRows = foundRows.slice(args.skip, args.skip + args.limit);
            callback(null, foundRows);
        });
};

/**
 * Retrieves an array of processed row objects
 * Includes object title field, updatedAt, published.
 * @param {Object} args
 * @param {Function} callback
 */
const getEntries = function (args, callback) {
    args.fieldsToReturn = {
        published: 1,
        updatedAt: 1,
        pKey: 1,
    };

    args.limit = positiveInteger(args.query.limit, 25);
    args.skip = (positiveInteger(args.query.page, 1) - 1) * args.limit;

    const objectTitleFieldPath = `rowParams.${args.objectTitle}`;
    args.fieldsToReturn[objectTitleFieldPath] = 1;

    args.sort = {};

    if (args.query.sort === 'updatedAt') {
        args.sort['updatedAt'] = -1;
    } else {
        args.sort[objectTitleFieldPath] = 1;
    }

    args.findQuery = {};

    if (args.query.filter === 'published') {
        args.findQuery.published = { $in: [null, true] };
    } else if (args.query.filter === 'unpublished') {
        args.findQuery.published = false;
    }

    if (['edited', 'created'].includes(args.query.filter)) {
        args.findQuery.pKey = { $in: Object.keys(_.get(args, `updatedContent.${args.query.filter}`, {})) };
    }

    if (args.query.title) {
        const operation = _.get(args, `coercionScheme[${args.objectTitle}].operation`);

        if (operation === 'ToString') {
            args.findQuery[`rowParams.${args.objectTitle}`] = { $regex: args.query.title, $options: 'i' };
        } else {
            args.findQuery.$where = `/${args.query.title}/i.test(this.rowParams['${args.objectTitle}'])`;
        }
    }

    getFromProcessedRowObjects(args, function (err, content) {
        if (err) {
            winston.error('Error encountered when getting content : ' + err);
            return callback(err);
        }

        const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(args.id);
        const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

        processedRowObjects_mongooseModel.count(args.findQuery, function (err, numberOfEntries) {
            if (err) {
                return callback(err);
            }

            const modifiedContent = loopThroughContentRows(content, args.id, args.coercionScheme);
            const dataToReturn = {
                numberOfEntries: numberOfEntries,
                entries: modifiedContent,
            };
            callback(null, dataToReturn);
        });
    });
};

/**
 * Gets datasource description
 * Gets entries
 * @param {String} id
 * @param {Object} query
 * @param {Function} callback
 */
const delegate = function (id, query, callback) {
    getDatasourceDescription(false, id, function (err, description) {
        if (err) {
            winston.error('no description: ' + err);
            callback(err);
        } else if (!description) {
            winston.info('no description');
            callback(new Error('no description'));
        } else {
            let allFields = description.fe_excludeFields;
            // check if parent and if parent doc has connection
            // check if child doc and child doc has connection
            // check if current doc has connection and child doc does not have connection
            if (description.schema_id) {
                winston.debug('description is child dataset');
                // if it's the child dataset get the parent dataset
                return getDatasourceDescription(false, description.schema_id, function (err, parentDescription) {
                    callback(err, parentDescription);
                });
            }

            async.waterfall([
                function (wCallback) {
                    getDatasourceDescription(true, id, function (err, childDoc) {
                        if (err) {
                            return wCallback(err);
                        }
                        wCallback(null, childDoc);
                    });
                },
                function (childDoc, wCallback) {
                    if (description.connection) {
                        if (childDoc && !childDoc.connection) {
                            winston.debug('found child doc and child doc is csv or tsv');
                            allFields = Object.keys(childDoc.raw_rowObjects_coercionScheme);
                            if (!description.objectTitle) {
                                description.objectTitle = allFields[0];
                            }
                            const args = {
                                id,
                                query,
                                objectTitle: description.objectTitle,
                                coercionScheme: childDoc.raw_rowObjects_coercionScheme,
                                updatedContent: childDoc.updatedContent,
                            };

                            getEntries(args, function (err, entries) {
                                if (err) {
                                    wCallback(err);
                                } else {
                                    winston.debug('got entries');
                                    wCallback(null, entries);
                                }
                            });
                        } else {
                            wCallback(null);
                        }
                    } else if (hasValidDatasetSource(description)) {
                        const args = {
                            id,
                            query,
                            objectTitle: description.objectTitle,
                            coercionScheme: description.raw_rowObjects_coercionScheme,
                            updatedContent: description.updatedContent,
                        };

                        getEntries(args, function (err, entries) {
                            if (err) {
                                wCallback(err);
                            } else {
                                wCallback(null, entries);
                            }
                        });
                    } else {
                        wCallback(new Error('datasource description has no filename or connection'));
                    }
                },
            ], function (err, entries) {
                if (err) {
                    winston.error('error during getting entries waterfall: ' + err);
                    return callback(err);
                }

                entries.updatedContent = description.updatedContent;
                callback(null, entries);
            });
        }
    });
};

function getContent(req, res) {
    if (!req.params.id) {
        return res.status(500).json({ error: 'No ID given' });
    }

    const { query } = req;

    if (!_.isEmpty(query.pKey)) {
        query.pKey = JSON.parse(query.pKey);
    }

    //get the datasource description
    // if it's a connection, deal with it differently
    // if it's not a connection do the normal stuff
    delegate(req.params.id, query, function (err, result) {
        if (err) {
            winston.error('An error occurred while getting the datasource.', err);
            return res.status(500).json({ error: 'An error occurred while getting the datasource.' });
        }
        return res.json(result);
    });
}

/**
 * if parent dataset has coercion scheme
 * @param {String} id
 * @param {Function} callback
 */
const parentHasCoercionScheme = function (id, callback) {
    getDatasourceDescription(false, id, function (err, description) {
        callback(err || !description || (description && description.raw_rowObjects_coercionScheme && Object.keys(description.raw_rowObjects_coercionScheme).length > 0));
    });
};

/**
 * Apply coercion scheme to new row values
 * @param {Object} row
 * @param {String} id
 * @param {Function} callback
 */
const coerceDataTypes = function (row, id, callback) {
    parentHasCoercionScheme(id, getParentDataset => {
        const getChildDataset = !getParentDataset;

        getDatasourceDescription(getChildDataset, id, (err, description) => {
            if (err) {
                return callback(err);
            }

            if (!description) {
                return callback(new Error('No datasource found'));
            }

            _.forEach(row, function (value, key) {
                row[key] = datatypes.newDataTypeCoercedValue(description.raw_rowObjects_coercionScheme[key], value);
            });
            callback(null, row);
        });
    });
};

async function createDataset({ body, params: { datasetId } }, res) {
    if (!datasetId) {
        return res.status(500).json({ error: 'Missing dataset id.' });
    }

    let dataset;

    try {
        dataset = await getDataset(datasetId);
    } catch (err) {
        winston.error('Dataset doesn\'t exist', err);
        return res.status(500).json({ error: 'Dataset doesn\'t exist' });
    }

    const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);

    return async.waterfall([
        async.apply(coerceDataTypes, body.rowParams, datasetId),
        (coercedRowParams, callback) => processCustomFields(dataset, coercedRowParams, (err) => callback(err, coercedRowParams)),
        (coercedRowParams, callback) => ProcessedRowObjects.create(
            Object.assign({}, body, {
                pKey: ObjectId().toString(),
                rowParams: coercedRowParams,
                created: true,
            }),
            callback,
        ),
        (createdRow, callback) => addRowValuesToCache(createdRow, (err) => callback(err, createdRow)),
    ], async (err, createdRow) => {
        try {
            if (err) {
                winston.error('An error occurred while creating a dataset.', err);
                return res.status(500).json({ error: 'An error occurred while creating a dataset.' });
            }

            await updateDataset({ datasetId, createdRow });

            return res.json(createdRow);
        } catch (err) {
            winston.error('An error occurred while creating a dataset.', err);
            return res.status(500).json({ error: 'An error occurred while creating a dataset.' });
        }
    });
}

function getRow(req, res) {
    // if it's not a connection
    if (!req.params.datasetId || !req.params.rowId) {
        return res.status(500).json({ error: 'Missing either dataset id or row id or both.' });
    }
    const findQuery = { _id: ObjectId(req.params.rowId) };
    const args = {
        id: req.params.datasetId,
        findQuery: findQuery,
        fieldsToReturn: {},
        skip: 0,
        limit: 0,
    };

    getFromProcessedRowObjects(args, function (err, row) {
        if (err) {
            winston.error('Error encountered when getting row: ' + err);
            return res.status(500).json({ error: 'An error occurred while getting a dataset row.' });
        }
        let modifiedRow = addNewProperties(row[0]);

        async.waterfall([
            callback => {
                getDatasourceDescription(false, req.params.datasetId, callback);
            },
            (dataset, callback) => {
                if (dataset && dataset.connection) {
                    getDatasourceDescription(true, req.params.datasetId, callback);
                } else {
                    callback(null, dataset);
                }
            },
        ], (err, dataset) => {
            if (err) {
                winston.error('An error occurred while getting a dataset row description.', err);
                return res.status(500).json({ error: 'An error occurred while getting a dataset row description.' });
            }

            if (dataset) {
                modifiedRow = originalDisplay(row[0], dataset.raw_rowObjects_coercionScheme);
            }
            return res.json(modifiedRow);
        });
    });
}

async function updateRow({ body, params: { datasetId, rowId } }, res) {
    if (!datasetId || !rowId) {
        return res.status(500).json({ error: 'Missing dataset id or row id or both.' });
    }

    let dataset;

    try {
        dataset = await getDataset(datasetId);
    } catch (err) {
        winston.error('Dataset doesn\'t exist', err);
        return res.status(500).json({ error: 'Dataset doesn\'t exist' });
    }

    const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);
    const updatedRow = { rowParams: {} };

    return async.waterfall([
        (callback) => ProcessedRowObjects.findById(rowId, callback),
        (foundRow, callback) => {
            const published = _.defaultTo(body.published, foundRow.published);
            const tasks = [async.apply(removeRowValuesFromCache, foundRow)];

            if (body.rowParams) {
                tasks.push(async.apply(coerceDataTypes, body.rowParams, datasetId));
            } else {
                tasks.push(async.constant({}));
            }

            tasks.push(async.apply(processCustomFields, dataset));

            tasks.push((coercedRowParams, callback) => {
                _.forEach(coercedRowParams, (value, key) => {
                    foundRow.rowParams[key] = value;
                    updatedRow.rowParams[key] = value;
                });

                if (!_.isEmpty(body.markdowns)) {
                    _.merge(foundRow.markdowns, body.markdowns);
                    updatedRow.markdowns = body.markdowns;
                    foundRow.markModified('markdowns');
                }

                foundRow.published = published;
                updatedRow.published = published;
                foundRow.updatedAt = moment().utc();

                foundRow.markModified('rowParams');
                foundRow.save(error => callback(error));
            });

            if (published) {
                tasks.push(async.apply(addRowValuesToCache, foundRow));
            }

            tasks.push(async.constant(foundRow));

            return async.waterfall(tasks, callback);
        },
    ], async (err, modifiedRow) => {
        try {
            if (err) {
                winston.error('An error occurred while updating a dataset.', err);
                return res.status(500).json({ error: 'An error occurred while updating a dataset.' });
            }

            await updateDataset({ datasetId, updatedRow, pKey: modifiedRow.pKey, created: modifiedRow.created });

            return res.json(modifiedRow);
        } catch (err) {
            winston.error('An error occurred while updating a dataset.', err);
            return res.status(500).json({ error: 'An error occurred while updating a dataset.' });
        }
    });
}

function removeDateset({ params: { datasetId, rowId } }, res) {
    if (!datasetId || !rowId) {
        return res.status(500).json({ error: 'Missing dataset id or row id or both.' });
    }

    const ProcessedRowObjects = getProcessedRowObjectsModel(datasetId);

    return async.waterfall([
        (callback) => ProcessedRowObjects.findById(rowId, callback),
        (foundRow, callback) => {
            const tasks = [
                async.apply(removeRowValuesFromCache, foundRow),
                callback => foundRow.remove(callback),
            ];

            return async.waterfall(tasks, callback);
        },
    ], async (err, { pKey }) => {
        try {
            if (err) {
                winston.error('An error occurred while deleting a dataset.', err);
                return res.status(500).json({ error: 'An error occurred while deleting a dataset.' });
            }

            await updateDataset({ datasetId, pKey, remove: true });

            return res.json({ success: true });
        } catch (err) {
            winston.error('An error occurred while deleting a dataset.', err);
            return res.status(500).json({ error: 'An error occurred while deleting a dataset.' });
        }

    });
}

function processCustomFields(dataset, row, callback) {
    _.forEach(dataset.customFieldsToProcess, (customField) => {
        let useDelimiter = false;

        if (customField.delimiterOnFields && customField.delimiterOnFields.length === 1 &&
            customField.fieldsToMergeIntoArray.length === 1) {
            useDelimiter = true;
        }

        if (useDelimiter) {
            let delimiter = customField.delimiterOnFields[0];
            if (delimiter === '" "') {
                delimiter = ' ';
            }

            const value = _.get(row, customField.fieldsToMergeIntoArray[0]);

            if (!_.isEmpty(value)) {
                row[customField.fieldName] = value.toString().split(delimiter).map(_.trim);
            }
        } else {
            row[customField.fieldName] = customField.fieldsToMergeIntoArray.map(field => row[field]);
        }
    });

    callback(null, row);
}
