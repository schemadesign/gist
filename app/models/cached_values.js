var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var CachedUniqValsByKey_scheme = Schema({
    srcDocPKey: String,
    limitedUniqValsByColName: Schema.Types.Mixed
});
var modelName = 'CachedUniqValsByKey';
module.exports = mongoose.model(modelName, CachedUniqValsByKey_scheme);
