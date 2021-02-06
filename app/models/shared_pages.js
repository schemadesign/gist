var mongoose_client = require('./mongoose_client');

var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var MongooseScheme = Schema({
    dateCreated: { type: Date, default: Date.now },
    //
    pageType: String,
    viewType: String, // will not be on every share - only on array views
    //
    dataset: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },
    rowObjectId: String, // will not be on every share - only for object details, at present
    query: Schema.Types.Mixed,
    queryString: String,
    annotation: String,
    other: Schema.Types.Mixed, //leaving intentionally vague for now in case similar use cases pop up
    renderingOptions: Schema.Types.Mixed,
    imageUrl: String

});
var modelName = 'SharedPage';

var deepPopulate = require('mongoose-deep-populate')(mongoose);
MongooseScheme.plugin(deepPopulate);


var Model = mongoose.model(modelName, MongooseScheme);

Model.FindOneWithId = function (id, fn) {
    Model.findOne({ _id: id })
        .deepPopulate('dataset dataset._team')
        .exec(fn);
};

module.exports = Model;
