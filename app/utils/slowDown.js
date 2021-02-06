const winston = require('winston');
const SlowDown = require('express-slow-down');
const { slowDownStore } = require('./mongoStore');

const windowTime = 15 * 60 * 1000; //15 minutes

const slowDown = (delayAfter = 20, windowTimeMs = windowTime) => new SlowDown({
    store: slowDownStore,
    windowMs: windowTimeMs,
    delayAfter,
    delayMs: 500,
    onLimitReached: (req) => {
        winston.error(`Throttled path: ${req.route.path}`);
        winston.error(`Throttled ip: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);
    }
});

module.exports = slowDown;
