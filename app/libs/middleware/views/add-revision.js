const winston = require('winston');

module.exports = { addRevision };

function addRevision(req, res, next) {
    const revision = Number.parseInt(req.query.revision);

    // Ignore 0 and NaN
    if (revision > 1) {
        req.revision = revision;
    }

    winston.debug('Added revision: %i', revision);
    next();
}
