const mongoose_client = require('./mongoose_client');
const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;

const cronSchema = Schema({
    time: String,
    datasourceDescription: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },
    errorLog: String, //log the error on starting up the job
    retries: { type: Number, default: 0 },
    scheduledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: String, //running, pause
}, { timestamps: true });

const Cron = mongoose.model('Cron', cronSchema);

module.exports = Cron;

