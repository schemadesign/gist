const mongoose_client = require('./mongoose_client');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;

const apiKeySchema = Schema({
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    key: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestDomains: [{ type: String }],
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const deepPopulate = require('mongoose-deep-populate')(mongoose);
apiKeySchema.plugin(deepPopulate);

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
