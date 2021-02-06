var winston = require('winston');
var mongoose_client = require('./mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
//
var RawSourceDocument_scheme = Schema({
    primaryKey: { type: String, index: true }, // NOTE: This primaryKey is the dataset id
    numberOfRows: Number,
    dateOfLastImport: Date
});


var modelName = 'RawSourceDocument';
var RawSourceDocument_model = mongoose.model(modelName, RawSourceDocument_scheme);
RawSourceDocument_model.on('index', function (error) {
    if (error) {
        winston.error('MongoDB index build error for \'' + modelName + '\':', error);
    } else {
        // winston.info("  Built indices for '" + modelName + "'");
        // Don't let app start listening until indices built; Coordinate via
        // mongoose client
        mongoose_client.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName);
    }
});

module.exports.ModelName = modelName;

module.exports.Model = RawSourceDocument_model;

module.exports.New_templateForPersistableObject = function (datasetId, /*parsed_rowObjectsById, parsed_orderedRowObjectPrimaryKeys,*/ numberOfRows) {
    return {
        primaryKey: datasetId,
        // parsed_rowObjectsById: parsed_rowObjectsById,
        // parsed_orderedRowObjectPrimaryKeys: parsed_orderedRowObjectPrimaryKeys,
        numberOfRows: numberOfRows
    };
};


module.exports.UpsertWithOnePersistableObjectTemplate = function (append, persistableObjectTemplate, fn) {
    winston.info('Going to save source document.');

    var updatedDocument = {};
    updatedDocument['primaryKey'] = persistableObjectTemplate.primaryKey;
    var numberOfRowsUpdateQuery = {};
    if (persistableObjectTemplate.numberOfRows && !append) {
        updatedDocument['numberOfRows'] = persistableObjectTemplate.numberOfRows;
    } else if (persistableObjectTemplate.numberOfRows && append) {
        numberOfRowsUpdateQuery = { numberOfRows: persistableObjectTemplate.numberOfRows };
    }
    updatedDocument['dateOfLastImport'] = new Date();

    var findOneAndUpdate_queryParameters =
        {
            primaryKey: persistableObjectTemplate.primaryKey
        };

    var query = {
        $set: updatedDocument
    };


    if (append) {
        query = {
            $set: updatedDocument, $inc: numberOfRowsUpdateQuery
        };
    }


    RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, query, {
        upsert: true
    }, function (err, doc) {
        if (err) {
            winston.error('Error while updating a raw source document: ', err);
        } else {
            winston.info('Saved source document object with pKey "' + persistableObjectTemplate.primaryKey + '".');
        }
        fn(err, doc);
    });
};

module.exports.IncreaseNumberOfRawRows = function (datasetId, numberOfRows, fn) {
    winston.info('Going to increase the number of raw rows in the source document.');


    var findOneAndUpdate_queryParameters =
        {
            primaryKey: datasetId
        };


    RawSourceDocument_model.findOneAndUpdate(findOneAndUpdate_queryParameters, {
        $set: { dateOfLastImport: new Date() },
        $inc: { numberOfRows: numberOfRows },
    }, {
        upsert: true
    }, function (err, doc) {


        if (err) {
            winston.error('Error while increasing the number of raw rows in a raw source document: ', err);
        } else {
            winston.info('Increased the number of raw rows in a source document object with datasetId : ' + datasetId);
        }
        fn(err, doc);
    });
};
