const MongoStore = require('rate-limit-mongo');
const winston = require('winston');

const dbURI = process.env.MONGODB_URI;

const limiterStore = new MongoStore({
    uri: dbURI,
    collectionName: 'expressRateRecords',
    errorHandler: winston.error,
});


const slowDownStore = new MongoStore({
    uri: dbURI,
    collectionName: 'slowDown',
    errorHandler: winston.error,
});


module.exports = {
    limiterStore,
    slowDownStore,
};
