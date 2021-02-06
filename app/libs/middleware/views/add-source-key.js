const winston = require('winston');
const _ = require('lodash');

function getSubdomain(req) {
    if (req.query.subdomain) {
        return req.query.subdomain;
    }

    if (req.subdomains[0]) {
        return req.subdomains[0];
    }

    return process.env.SUB_DOMAIN;
}

module.exports.addSourceKey = (req, res, next) => {
    let sourceKey = _.defaultTo(req.sourceKey, req.params.source_key);
    let subdomain = getSubdomain(req);

    sourceKey = _.kebabCase(sourceKey);

    if (_.isUndefined(sourceKey)) {
        sourceKey = req.params[0].substring(1);
    }

    req.sourceKey = process.env.NODE_ENV === 'enterprise' ? sourceKey : `${subdomain}:${sourceKey}`;
    req.subdomain = subdomain;

    winston.debug(`added source key: ${req.sourceKey}`);
    next();
};
