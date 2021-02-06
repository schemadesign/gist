var winston = require('winston');


module.exports.addPreview = function(req, res, next) {
    req.preview = !!req.query.preview;
    winston.debug('added Preview');
    next();
};
