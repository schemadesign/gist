const winston = require('winston');
const qs = require('querystring');
const User = require('../../../models/users');
const request = require('request');
const crypto = require('crypto');
const { oauthPostToken } = require('../../../libs/oauth2');

const smartsheetLink = 'https://api.smartsheet.com/2.0/';
const smartsheetAuthURL = 'https://app.smartsheet.com/b/authorize';

const authorizeURL = params => {
    return `${smartsheetAuthURL}?${qs.stringify(params)}`;
};

const authorizationURI = user => {
    return authorizeURL({
        response_type: 'code',
        client_id: process.env.SMARTSHEET_CLIENT_ID,
        scope: 'READ_SHEETS',
        state: user,
    });
};

/**
 * Creates a hash of the Smartsheet app secret piped with the passed code.
 * @param {string} code
 */
const smartsheetHashWithToken = code => {
    return crypto.createHash('sha256')
        .update(`${process.env.SMARTSHEET_APP_SECRET}|${code}`)
        .digest('hex');
};

const getSmartsheetTokenFromUserId = async userId => {
    const user = await User.findById(userId);
    if (Date.now() > user.smartsheetToken.expires_at) {
        // The token has expired, and we need to request a new one.
        const form = {
            hash: smartsheetHashWithToken(user.smartsheetToken.refresh_token),
            client_id: process.env.SMARTSHEET_CLIENT_ID,
            refresh_token: user.smartsheetToken.refresh_token,
            grant_type: 'refresh_token',
            contentType: 'application/x-www-form-urlencoded',
        };

        return await oauthPostToken(`${smartsheetLink}token`, form, {}, userId, 'smartsheetToken');
    } else {
        return user.smartsheetToken.access_token;
    }
};

const smartsheetBearerString = async user => `Bearer ${await getSmartsheetTokenFromUserId(user)}`;

/**
 * Endpoint to redirect to the Smartsheet permission request page.
 */
module.exports.requestPermissionLink = (req, res) => {
    return res.redirect(authorizationURI(req.user));
};

/**
 * Callback endpoint that Smartsheet calls to provide a temporary code
 * to then be hashed with the app secret to request a long term access code.
 */
module.exports.smartsheetCallback = (req, res) => {
    if (req.query.error) {
        winston.error(`The Smartsheet API returned with an error: ${req.query.error}`);
        return res.status(400).send(req.query.error);
    }

    const form = {
        hash: smartsheetHashWithToken(req.query.code),
        client_id: process.env.SMARTSHEET_CLIENT_ID,
        code: req.query.code,
        grant_type: 'authorization_code',
        contentType: 'application/x-www-form-urlencoded',
    };

    oauthPostToken(`${smartsheetLink}token`, form, {}, req.query.state, 'smartsheetToken').then(() => {
        return res.render('close');
    })
        .catch(error => {
            winston.error(`Ran into an error when Requesting a longterm token: ${error}`);
            return res.status(400).send(error);
        });
};

/**
 * Get a list of Smartsheets that belong to the user's connected account.
 */
module.exports.getSheets = async (req, res) => {
    request.get(
        `${smartsheetLink}sheets`,
        { headers: { Authorization: await smartsheetBearerString(req.user) } },
        (error, response, body) => {
            if (error) {
                return res.status(400).send(error);
            }
            return res.send(body);
        },
    );
};

/**
 * Queries the Smartsheet API to get an individual Smartsheet data in CSV form.
 * @param {string} user
 * @param {string} sheetId
 */
module.exports.getSheet = async (user, sheetId) => {
    return request.get(
        `${smartsheetLink}sheets/${sheetId}`,
        {
            headers: {
                Authorization: await smartsheetBearerString(user),
                Accept: 'text/csv',
            },
        },
    );
};
