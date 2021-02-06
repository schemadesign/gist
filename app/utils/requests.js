const winston = require('winston');

const { PublicError } = require('../libs/system/errors');

module.exports = {
    handleError,
};

/**
 * Returns true when an error occurred.
 * @param {Error} err
 * @param {Object} res
 * @param {String=} message
 * @returns {Boolean}
 */
function handleError(err, res, message = 'An unexpected error happened during request.') {
    if (err) {
        const code = err.statusCode || 500;
        let responseMessage = message;

        if (err instanceof PublicError) {
            responseMessage = err.message;
        } else if (['development', 'testing'].includes(process.env.NODE_ENV)) {
            responseMessage = `Non-public error: ${err.message}`;
        }

        winston.error(message, err);
        res.status(code).json({ error: responseMessage });

        return true;
    }

    return false;
}
