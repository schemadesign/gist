const winston = require('winston');
const mongoose_client = require('./mongoose_client');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;
const mongooseContextsBySrcDocPKey = {};

const _New_RowObjectsModelName = function (objectId) {
    return 'RawRowObjects-' + objectId;
};

module.exports = {
    Lazy_Shared_RawRowObject_MongooseContext,
    New_templateForPersistableObject,
    InsertManyPersistableObjectTemplates,
};

function Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey) {
    let mongooseContext = mongooseContextsBySrcDocPKey[srcDocPKey];
    if (mongooseContext && typeof mongooseContext !== 'undefined') { // lazy cache, to avoid mongoose model re-definition error
        return mongooseContext;
    }
    //
    const forThisDataSource_RawRowObject_scheme = Schema({
        pKey: String,
        srcDocPKey: String,
        rowParams: Schema.Types.Mixed, // be sure to call .markModified(path) on the model before saving if you update this Mixed property
    });
    forThisDataSource_RawRowObject_scheme.index({ pKey: 1, srcDocPKey: 1 }, { unique: false });
    forThisDataSource_RawRowObject_scheme.index({ srcDocPKey: 1 }, { unique: false });
    //
    const forThisDataSource_rowObjects_modelName = _New_RowObjectsModelName(srcDocPKey);
    const forThisDataSource_RawRowObject_model = mongoose.model(forThisDataSource_rowObjects_modelName, forThisDataSource_RawRowObject_scheme,
        forThisDataSource_rowObjects_modelName.toLowerCase());
    //
    mongooseContext =
        {
            forThisDataSource_RawRowObject_scheme: forThisDataSource_RawRowObject_scheme,
            forThisDataSource_rowObjects_modelName: forThisDataSource_rowObjects_modelName,
            forThisDataSource_RawRowObject_model: forThisDataSource_RawRowObject_model,
        };
    mongooseContextsBySrcDocPKey[srcDocPKey] = mongooseContext;

    return mongooseContext;
}

function New_templateForPersistableObject(rowObject_primaryKey, sourceDocumentRevisionKey, rowParams) {
    return {
        pKey: rowObject_primaryKey, // Queries to find this unique row will have to happen
        srcDocPKey: sourceDocumentRevisionKey, // by pKey && srcDocPKey
        rowParams: rowParams,
    };
}

// fn: (err, [Schema.Types.ObjectId])
function InsertManyPersistableObjectTemplates(ordered_persistableObjectTemplateUIDs, persistableObjectTemplatesByUID, srcDocPKey, srcDocTitle, fn) {
    const num_parsed_orderedRowObjectPrimaryKeys = ordered_persistableObjectTemplateUIDs.length;
    winston.info('Inserting ' + num_parsed_orderedRowObjectPrimaryKeys + ' parsed rows for "' + srcDocTitle + '".');

    const forThisDataSource_mongooseContext = Lazy_Shared_RawRowObject_MongooseContext(srcDocPKey);
    const forThisDataSource_RawRowObject_model = forThisDataSource_mongooseContext.forThisDataSource_RawRowObject_model;
    const bulkWriteOptions = process.env.INSIGHT ? { ordered: true } : { ordered: false };

    mongoose_client.WhenMongoDBConnected(function () { // ^ we block because we're going to work with the native connection; Mongoose doesn't block til connected for any but its own managed methods
        const nativeCollection = forThisDataSource_RawRowObject_model.collection;

        const updateDocs = [];
        for (let rowIdx = 0; rowIdx < ordered_persistableObjectTemplateUIDs.length; rowIdx++) {
            const rowUID = ordered_persistableObjectTemplateUIDs[rowIdx];

            updateDocs.push({
                insertOne: { document: persistableObjectTemplatesByUID[rowUID] },
            });
        }
        nativeCollection.bulkWrite(updateDocs, bulkWriteOptions, function (err, result) {
            if (err) {
                winston.error('Error while saving raw row objects: ', err);
            } else {
                winston.info('Saved raw row objects.');
            }
            return fn(err, result);
        });
    });
}
