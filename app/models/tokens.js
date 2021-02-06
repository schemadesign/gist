const mongoose_client = require('./mongoose_client');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;

const tokenSchema = Schema({
    token: String,
    apiKey: { type: Schema.Types.ObjectId, ref: 'ApiKey' },
    usedAt: { type: Date, default: null },
}, { timestamps: true });

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
