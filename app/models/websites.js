var mongoose_client = require('./mongoose_client');
var integerValidator = require('mongoose-integer');

var mongoose = mongoose_client.mongoose;
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var websiteSchema = Schema({
    title: String,
    slug: String,
    homepage: { type: Schema.Types.ObjectId, ref: 'Page' },
    pages: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    brandColor: {
        accent: { type: String, default: '#005CB5' }
    },
    published: { type: Boolean, default: false }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

websiteSchema.plugin(integerValidator);
websiteSchema.plugin(deepPopulate);

websiteSchema.pre('save', function(next) {
    this._wasNew = this.isNew;
    next();
});

var Website = mongoose.model('Website', websiteSchema);

module.exports = Website;
