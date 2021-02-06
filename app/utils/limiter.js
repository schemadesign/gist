const RateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const { limiterStore } = require('./mongoStore');

const dbURI = process.env.MONGODB_URI;

const windowTime = 15 * 60 * 1000; //15 minutes

const limiter = new RateLimit({
    store: limiterStore,
    windowMs: windowTime,
    max: 100, // 100 requests per 15 minutes
});

module.exports = limiter;
