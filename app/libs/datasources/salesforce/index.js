const winston = require('winston');
const qs = require('querystring');
const request = require('request');
const { Readable } = require('stream');
const { has, get, omit } = require('lodash');

const { oauthPostToken } = require('../../../libs/oauth2');
const User = require('../../../models/users');
const { handleError } = require('../../../utils/requests');
const { RequestError } = require('../../../libs/system/errors');

const SALESFORCE_OAUTH_URL = 'https://login.salesforce.com/services/oauth2';
const REDIRECT_URI = `https://app.${process.env.HOST}/auth/salesforce`;
const API_URL = '/services/data/v45.0';

const authorizeURL = params => qs.unescape(`${SALESFORCE_OAUTH_URL}/authorize?${qs.stringify(params)}`);

const authorizationURI = user => authorizeURL({
    client_id: process.env.SALESFORCE_CONSUMER_KEY,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: user,
});

/**
 * Endpoint to redirect to the Salesforce permission request page.
 */
const requestPermissionLink = (req, res) => res.redirect(authorizationURI(req.user));

/**
 * Callback endpoint that Salesforce calls to provide a temporary code
 * to then be hashed with the app secret to request a long term access code.
 */
const salesforceCallback = ({ query: { error = null, code, state } }, res) => {
    if (error) {
        winston.error(`The Salesforce API returned with an error: ${error}`);

        return handleError(new RequestError(`The Salesforce API returned with an error: ${error}`), res);
    }

    const SALESFORCE_API_CONFIG = {
        client_id: process.env.SALESFORCE_CONSUMER_KEY,
        client_secret: process.env.SALESFORCE_CONSUMER_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code: code,
    };

    oauthPostToken(`${SALESFORCE_OAUTH_URL}/token`, SALESFORCE_API_CONFIG, {}, state, 'salesforceToken')
        .then(() => res.render('close'))
        .catch(error => {
            winston.error(`Ran into an error when Requesting a longterm token: ${error}`);

            return handleError(new RequestError(`Ran into an error when Requesting a longterm token: ${error}`), res);
        });
};

const validateToken = async (req, res) => {
    try {
        const user = await User.findById(req.user);
        if (!user.salesforceToken) {
            return res.json({ isValidToken: false });
        }

        return request.get(
            `${user.salesforceToken.instance_url}${API_URL}`,
            { headers: { Authorization: `Bearer ${user.salesforceToken.access_token}` } },
            (err, response, data) => {
                try {
                    const parsedData = JSON.parse(data);
                    const errorCode = get(parsedData, '[0]errorCode');
                    const isValidToken = !(err || errorCode);

                    if (!isValidToken) {
                        user.salesforceToken = null;
                        user.save();
                    }

                    return res.json({ isValidToken });
                } catch (e) {
                    return res.json({ isValidToken: false });
                }
            },
        );
    } catch (err) {
        return handleError(new RequestError('Salesforce error while validating token'), res);
    }
};

const getTables = async ({ user }, res) => {
    try {
        const { salesforceToken } = await User.findById(user);

        request.get(
            `${salesforceToken.instance_url}${API_URL}/sobjects`,
            { headers: { Authorization: `Bearer ${salesforceToken.access_token}` } },
            (err, response, data) => {
                const parsedData = JSON.parse(data);

                if (parsedData.sobjects) {
                    const tables = parsedData.sobjects.map(({ name }) => name);

                    return res.json({ tables });
                }

                return handleError(new RequestError('Salesforce error while getting tables from api'), res);
            },
        );
    } catch (err) {
        return handleError(new RequestError('Salesforce error while getting tables'), res);
    }
};

const getFields = async ({ user, query }, res) => {
    try {
        const { salesforceToken } = await User.findById(user);

        request.get(
            `${salesforceToken.instance_url}${API_URL}/sobjects/${query.table}/describe`,
            { headers: { Authorization: `Bearer ${salesforceToken.access_token}` } },
            (err, response, data) => {
                const parsedData = JSON.parse(data);

                if (!parsedData.fields) {
                    return res.json({ fields: [] });
                }

                const fields = parsedData.fields.map(({ name }) => name);

                return res.json({ fields });
            },
        );
    } catch (err) {
        return handleError(new RequestError('Salesforce error while getting fields'), res);
    }
};

const validateQuery = async ({ user, query }, res) => {
    try {
        const { salesforceToken } = await User.findById(user);

        if (!salesforceToken || !['fields', 'table'].every(item => has(query, item))) {
            return handleError(new RequestError('Missing query params'), res);
        }

        request.get(
            `${salesforceToken.instance_url}${API_URL}/queryAll/?q=SELECT ${query.fields} FROM ${query.table} LIMIT 1`,
            { headers: { Authorization: `Bearer ${salesforceToken.access_token}` } },
            (err, response, data) => {
                const parsedData = JSON.parse(data);
                const errorCode = get(parsedData, '[0]errorCode');

                if (err || errorCode) {
                    return handleError(new RequestError(err || errorCode), res);
                }

                return res.json(parsedData);
            },
        );
    } catch (err) {
        return handleError(new RequestError('Salesforce error while validating query'), res);
    }
};

const createReadStreamFromJSON = data => {
    const readable = new Readable();
    readable._read = () => {};
    readable.push(JSON.stringify(data));
    readable.push(null);
    return readable;
};

const queryDataset = (userId, { fields, table }) => new Promise(async (resolve, reject) => {
    try {
        const { salesforceToken } = await User.findById(userId);

        request.get(
            `${salesforceToken.instance_url}${API_URL}/queryAll/?q=SELECT ${fields} FROM ${table}`,
            { headers: { Authorization: `Bearer ${salesforceToken.access_token}` } },
            (err, response, data) => {
                if (err) {
                    return reject(err);
                }

                const parsedData = JSON.parse(data);

                return resolve(createReadStreamFromJSON(parsedData.records.map(item => omit(item, 'attributes'))));
            },
        );
    } catch (err) {
        return reject(err);
    }

});

module.exports = {
    requestPermissionLink,
    salesforceCallback,
    queryDataset,
    validateToken,
    validateQuery,
    getTables,
    getFields,
};

