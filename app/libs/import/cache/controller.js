const async = require('async');
const winston = require('winston');
const path = require('path');
const moment = require('moment');
const { isNil, toLower, uniqBy, includes } = require('lodash');

const processed_row_objects = require('../../../models/processed_row_objects');

const _generateUniqueFilterValueCacheCollection = (job, dataSourceDescription, callback) => {

    const dataSource_title = dataSourceDescription.title;

    let collectionId = dataSourceDescription._id;
    if (dataSourceDescription.schemaId) {
        collectionId = dataSourceDescription.schemaId;
    }

    if (dataSourceDescription.lastImportTriggeredBy === 'automated') {
        collectionId = `${collectionId}-automated`;
    }

    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(collectionId);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    processedRowObjects_mongooseModel.findOne({}, (err, sampleDoc) => {
        if (err) {
            return callback(err);
        }
        if (!sampleDoc) {
            return callback(new Error('Empty dataset on caching filters'));
        }

        const limitToNTopValues = 180;

        let filterKeys = Object.keys(sampleDoc.rowParams);

        function _filtering() {

            if (!dataSourceDescription.fe_excludeFields) {
                dataSourceDescription.fe_excludeFields = {};
            }
            if (!dataSourceDescription.fe_filters) {
                dataSourceDescription.fe_filters = {};
                dataSourceDescription.fe_filters.fieldsNotAvailable = [];
            }

            filterKeys = filterKeys.filter(key => !dataSourceDescription.fe_excludeFields[key]);
        }

        function _isObject(filterValue) {
            // todo: why does it check if the object is a Date?
            if (typeof (filterValue) === 'object') {
                const parsedFilterValue = Date.parse(filterValue);
                if (isNaN(parsedFilterValue)) {
                    return true;
                }
            }
            return false;
        }

        if (dataSourceDescription._team && dataSourceDescription._team.isEnterprise) {

            try {
                const controller = require(path.join(
                    __dirname, '/../../../../user/',
                    dataSourceDescription._team.subdomain, '/src/import',
                ));

                if (typeof controller.filterKeys !== 'undefined') {

                    filterKeys = controller.filterKeys();

                } else {
                    _filtering();
                }

            } catch (e) {
                _filtering();
            }

        } else {
            _filtering();

        }

        const uniqueFieldValuesByFieldName = {};

        for (let i = 0; i < filterKeys.length; i++) {
            const key = filterKeys[i];
            uniqueFieldValuesByFieldName[key] = [];
        }

        async.each(filterKeys, (key, cb) => {
            // Commented out the count section for the comma-separated as individual filters.
            const uniqueStage = { $group: { _id: {}, count: { $sum: 1 } } };
            uniqueStage.$group._id = `$rowParams.${key}`;

            processedRowObjects_mongooseModel.aggregate([
                { $unwind: `$rowParams.${key}` },
                uniqueStage,
                { $sort: { count: -1 } },
                { $limit: limitToNTopValues }, // To escape that aggregation result exceeds maximum document size (16MB)
            ]).allowDiskUse(true).exec((err, results) => {
                if (err) {
                    return cb(err);
                }

                if (isNil(results)) {
                    winston.error(`Unexpectedly empty unique field value aggregation for field named: ${key}`);
                    return cb(new Error('Unexpectedly empty unique field value aggregation for field'));
                }

                if (results.length > 0) {
                    const valuesRaw = results.map(el => {
                        const value = el._id;
                        if (typeof value === 'string') {
                            return value.trim();
                        } else {
                            return value;
                        }
                    });

                    // flatten array of arrays (for nested tables)
                    let values = [].concat.apply([], valuesRaw).filter((elem) => {
                        // don't include objects or empty strings
                        return (elem !== '' && !_isObject(elem)) || moment(new Date(elem)).isValid();
                    });

                    values = uniqBy(values, toLower);
                    values = values.splice(0, limitToNTopValues);
                    values.sort();

                    uniqueFieldValuesByFieldName[key] = values;
                }

                cb();
            });

        }, err => {

            if (err) {
                return callback(err);
            }

            const persistableDoc = {
                srcDocPKey: collectionId,
                limitedUniqValsByColName: uniqueFieldValuesByFieldName,
            };
            const cached_values = require('../../../models/cached_values');
            cached_values.findOneAndUpdate({ srcDocPKey: collectionId }, persistableDoc, {
                upsert: true,
                new: true,
            }, err => {
                if (err) {
                    return callback(err);
                }

                winston.info('Inserted cachedUniqValsByKey for "' + dataSource_title + '".');
                job.log('  Inserted cachedUniqValsByKey for "' + dataSource_title + '".');
                callback();
            });

        });
    });
};

const _dataSourcePostImportCachingFunction = (indexInList, dataSourceDescription, job, callback) => {
    const dataSource_title = dataSourceDescription.title;
    const fe_visible = dataSourceDescription.fe_visible;
    if (fe_visible === false) {
        winston.warn('⚠️  The data source "' + dataSource_title + '" had fe_visible=false, so not going to generate its unique filter value cache.');
        return callback(null);
    }

    if (dataSourceDescription.schemaId) {
        winston.info('🔁  ' + indexInList + ': Generated post-import caches for "' + dataSource_title + '" (appended dataset: ' +
            dataSourceDescription.fileName + ')');
    }

    winston.info('🔁  ' + indexInList + ': Generated post-import caches for "' + dataSource_title + '"');

    _generateUniqueFilterValueCacheCollection(job, dataSourceDescription, err => {
        if (err) {
            winston.error('Error encountered while post-processing "' + dataSource_title + '".');
            return callback(err);
        }

        callback();
    });
};

module.exports.GeneratePostImportCaches = (dataSourceDescriptions, job, fn) => {
    let i = 1;

    async.eachSeries(dataSourceDescriptions, (dataSourceDescription, callback) => {
        _dataSourcePostImportCachingFunction(i, dataSourceDescription, job, callback);
        i++;
    }, err => {
        if (err) {
            winston.info('Error encountered during post-import caching:', err);
        } else {
            winston.info('Post-import caching done.');
        }
        fn(err);
    });
};
