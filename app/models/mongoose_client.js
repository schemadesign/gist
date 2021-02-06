var mongoose = require('mongoose');
var winston = require('winston');

const { configureWinston } = require('../../app/utils/winston');

var mongoHost = process.env.MONGODB_HOST;
var mongoName = process.env.MONGODB_NAME;
var dbURI = process.env.MONGODB_URI;

if (process.env.NODE_ENV === 'testing') {
    configureWinston();
}

if (!dbURI && mongoHost && mongoName) {
    dbURI = 'mongodb://' + mongoHost + '/' + mongoName;
}

if (!dbURI) {
    winston.error('dbURI not set!');
    process.exit(9);
}

exports.dbURI = dbURI;

winston.info(`MongoDB URI: ${dbURI}`);
mongoose.Promise = Promise;

var connectionPromise = mongoose.connect(dbURI, {
    keepAlive: 1000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 200000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
});
module.exports.connectionPromise = connectionPromise;

mongoose.plugin(schema => { schema.options.usePushEach = true });

exports.mongoose = mongoose;
//
var isConnected = false;
var erroredOnConnection = false;
//
var connection = mongoose.connection;
connection.on('error', function (err) {
    erroredOnConnection = true;
    // winston.error("  MongoDB connection error:", err);
});
connection.once('open', function () {
    isConnected = true;
    // winston.info("📡  Connected to " + process.env.NODE_ENV + " MongoDB.");
});
connection.on('disconnected', function () {
    // winston.error("  MongoDB disconnected");
});
connection.on('reconnected', function () {
    // winston.info("📡  Reconnected to " + process.env.NODE_ENV + " MongoDB.");
});

process.on('SIGINT', function () {
    connection.close(function () {
        // winston.info("⚠️  Mongoose connection closed due to app termination");
        process.exit(0);

    });
});
exports.connection = connection;

//
function WhenMongoDBConnected(fn) {
    if (isConnected == true) {
        fn();
        return;
    } else if (erroredOnConnection == true) {
        winston.warn('⚠️  Not going to call blocked Mongo fn,', fn);

        return;
    }
    var period_ms = 100;
    // winston.info(" Waiting " + period_ms + "ms until MongoDB is connected….");
    setTimeout(function () {
        WhenMongoDBConnected(fn);
    }, period_ms);
}

exports.WhenMongoDBConnected = WhenMongoDBConnected;

var _mustBuildIndexes_hasBeenInitialized = false;
var _mustBuildIndexes_forNRemaining = 0;

function FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames) {
    if (_mustBuildIndexes_hasBeenInitialized == true) {
        winston.error('Mustn\'t call this more than once');
        process.exit(1);
    }
    _mustBuildIndexes_hasBeenInitialized = true;
    _mustBuildIndexes_forNRemaining = modelNames.length;
}

exports.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed = FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed;

function _mustBuildIndexes_areAllFinishedBuilding() {
    return _mustBuildIndexes_hasBeenInitialized == true &&
        _mustBuildIndexes_forNRemaining == 0;
}

function WhenIndexesHaveBeenBuilt(fn) {
    if (_mustBuildIndexes_areAllFinishedBuilding() == true) {
        // winston.info(" All indexes finished building.");
        fn();

        return;
    }
    setTimeout(function () {
        WhenIndexesHaveBeenBuilt(fn);
    }, 100);
}

exports.WhenIndexesHaveBeenBuilt = WhenIndexesHaveBeenBuilt;

function FromModel_IndexHasBeenBuiltForSchemeWithModelNamed(modelName) {
    _mustBuildIndexes_forNRemaining -= 1;
}

exports.FromModel_IndexHasBeenBuiltForSchemeWithModelNamed = FromModel_IndexHasBeenBuiltForSchemeWithModelNamed;

function _dropColletion(collection, cb) {

    if (!collection || collection == '') {
        cb(new Error('Must provide collection name to drop.'));
    }
    connection.db.dropCollection(collection, cb);

}

exports.dropCollection = _dropColletion;

function _renameCollection(collectionName, newCollectionName, cb) {
    connection.db.renameCollection(collectionName, newCollectionName, cb);
}

exports.renameCollection = _renameCollection;
