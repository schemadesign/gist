const cors = require('cors');
const { URL } = require('url');

const API_ALLOWED = true;
const API_NOT_ALLOWED = false;

// Origin White list
const envOrigins = process.env.ORIGINS ? process.env.ORIGINS.split(',') : [];
const envAllowedOrigins = envOrigins.length ?
    envOrigins.map(origin => new RegExp(origin)) :
    [];

const allowedOrigins = [
    /^.*\.arrays.co$/,
    /^.*\.gist.info$/,
    /^gist.info$/,
    /^arrays.co$/,
].concat(envAllowedOrigins);


const checkPermissions = ({ isAnonymous }) => (req, res, next) => {
    req.isAnonymous = isAnonymous;
    if (process.env.NODE_ENV === 'testing') {
        return next();
    }

    if (isAnonymous || req.user) {
        return next();
    }

    return res.status(401).send({ error: 'session expired' });
};

const checkCors = (apiAllowed = API_NOT_ALLOWED) => apiAllowed ? cors() : cors({
    origin: function (origin, callback) {
        if (!origin || origin === 'undefined') {
            return callback(null, true);
        }

        const originUrl = new URL(origin);

        const allowed = allowedOrigins.some(allowedOrigin => allowedOrigin.test(originUrl.hostname));

        if (!allowed) {
            return callback(new Error(`The CORS policy for this site does not allow access from the specified Origin (${originUrl.hostname}).`), false);
        }

        return callback(null, true);
    },
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
});

module.exports = {
    API_ALLOWED,
    checkCors,
    checkPermissions,
};
