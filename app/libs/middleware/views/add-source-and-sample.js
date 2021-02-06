var winston = require('winston');
var Batch = require('batch');

var raw_source_documents = require('../../../models/raw_source_documents');
var processed_row_objects = require('../../../models/processed_row_objects');
var nested = require('../../../controllers/api/dataset/nested');
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');

module.exports.addSourceAndSample = function (req, res, next) {

    var dataSourceDescription = req.dataSource;
    var query = req.query;
    var filterObj = req.filter ? req.filter.filterObj : {};

    req.sourceDocURL = dataSourceDescription.urls ? dataSourceDescription.urls.length > 0 ? dataSourceDescription.urls[0] : null : null;

    var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    var nestedArray = [];
    var nestedPath;

    if (query.nested) {
        req.nested = query.nested;
        if (Array.isArray(query.nested)) {
            nestedArray = query.nested;
        } else {
            nestedArray.push(query.nested);
        }
        nestedArray = nestedArray.map(function (field) {
            return importedDataPreparation.RealColumnNameFromHumanReadableColumnName(field, dataSourceDescription);
        });
    }

    var constructedNestedObj = function (existing_nestedArray, this_nestedVal, nonNestedKeys) {

        if (nonNestedKeys && this_nestedVal && nonNestedKeys.indexOf(this_nestedVal) > -1) {
            existing_nestedArray = [];
        }
        var nestedObj = {};
        // make a copy of the filter object so as not to make changes to it
        for (var key in filterObj) {
            if (filterObj.hasOwnProperty(key)) {
                nestedObj[key] = filterObj[key];
            }
        }
        nestedObj['nested'] = [];
        var finishedNestedArray = existing_nestedArray.slice();

        if (this_nestedVal) {
            finishedNestedArray.push(this_nestedVal);
        }

        nestedObj.nested = finishedNestedArray;
        return nestedObj;
    };

    var batch = new Batch();
    batch.concurrency(1);

    // Obtain source document
    batch.push(function (done) {
        raw_source_documents.Model.findOne({ primaryKey: dataSourceDescription._id }, function (err, _sourceDoc) {
            if (err) {
                return done(err);
            }
            if (!_sourceDoc) {
                return done(new Error(`No source doc found for description: ${dataSourceDescription._id}`));
            }

            req.sourceDoc = _sourceDoc;
            done();
        });
    });

    // Obtain sample document
    batch.push(function (done) {
        if (nestedArray.length > 0) {
            nestedPath = nestedArray.join('.');
            var findQuery = {};
            findQuery['rowParams.' + nestedPath] = { $gt: {}, $ne: null };
            processedRowObjects_mongooseModel.findOne(findQuery, function (err, _sampleDoc) {
                if (err) {
                    return done(err);
                }
                if (!_sampleDoc) {
                    return done(new Error('No sample doc found'));
                }
                req.sampleDoc = _sampleDoc;
                req.sampleDoc.rowParams = nested.translateNestedFields(_sampleDoc.rowParams);
                done();
            });
        } else {
            const findQuery = dataSourceDescription.fe_fieldDisplayOrder.reduce(
                (acc, name) => ({ ...acc, [`rowParams.${name}`]: { $ne: null } }),
                {},
            );

            processedRowObjects_mongooseModel.findOne(findQuery, async function (err, _sampleDoc) {
                if (err) {
                    return done(err);
                }
                if (!_sampleDoc) {
                    winston.warn(`No sample doc found for description: ${dataSourceDescription._id}. Returning first sample doc.`);
                    req.sampleDoc = await processedRowObjects_mongooseModel.findOne({});
                    req.sampleDoc.rowParams = nested.translateNestedFields(req.sampleDoc.rowParams);
                    return done();
                }

                req.sampleDoc = _sampleDoc;
                req.sampleDoc.rowParams = nested.translateNestedFields(_sampleDoc.rowParams);
                done();
            });
        }
    });

    batch.end(function (err) {
        if (err) {
            winston.error('Error adding sourceDoc and sampleDoc: ', err);
            return next(err);
        } else {
            req.constructedNestedObj = constructedNestedObj;
            req.nestedArray = nestedArray;
            req.nestedPath = nestedPath;
            winston.debug('found sourceDoc and sampleDoc');
            next();
        }
    });
};
