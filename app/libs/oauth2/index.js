const request = require('request');
const User = require('../../models/users');


/**
 * Request to the passed oauthUrl to get/renew a long term token, and then saves that token with a specific expires_at date.
 * @param {string} oauthUrl
 * @param {Object} form
 * @param {Object} headers
 * @param {string} userId
 * @param {string} tokenSource
 */
const oauthPostToken = (oauthUrl, form, headers = {}, userId, tokenSource) => new Promise((resolve, reject) => {
    request.post(oauthUrl, { form, headers }, async (error, response, token) => {
        const parsedToken = JSON.parse(token);

        if (error) {
            return reject(error);
        }
        if (parsedToken.errorCode || parsedToken.error_description) {
            return reject(parsedToken.errorCode || parsedToken.error_description);
        }

        // Calculate the expiration date
        parsedToken.expires_at = Date.now() + (parsedToken.expires_in * 1000);

        try {
            await User.findByIdAndUpdate(userId, { $set: { [tokenSource]: parsedToken } });
        } catch (updateError) {
            return reject(updateError.message);
        }

        return resolve(parsedToken.access_token);
    });
});

module.exports.oauthPostToken = oauthPostToken;
