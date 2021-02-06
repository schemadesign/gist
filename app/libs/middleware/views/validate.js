var winston = require('winston');

// @todo: flesh this out
// https://github.com/ctavan/express-validator

module.exports.validate = function (req, res, next) {
    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            var err = new Error('Error validating request');
            winston.error('Error validating request');
            result.array().forEach(function (error) {
                winston.error(JSON.stringify(error));
            });
            return next(err);
        }

        winston.debug('parameters validated');
        next();
    });
};
