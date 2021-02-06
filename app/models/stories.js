var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;

var storySchema = Schema({

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    caption: String,
    isPublic: Boolean,
    sharedPages: [{ type: Schema.Types.ObjectId, ref: 'SharedPage' }],
    datasourceDescription: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

var deepPopulate = require('mongoose-deep-populate')(mongoose);
storySchema.plugin(deepPopulate);


var Story = mongoose.model('Story', storySchema);

module.exports = Story;
