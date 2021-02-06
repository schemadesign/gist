const winston = require('winston');
const qs = require('querystring');
const User = require('../../../models/users');
const request = require('request');
const { oauthPostToken } = require('../../../libs/oauth2');
const { defaultTo, toLower } = require('lodash');

const datadotworldAuthURL = 'https://data.world/oauth';
const datadotworldApiURL = 'https://api.data.world/v0';
const datadotworldRedirectURI = `${process.env.USE_SSL === 'true' ? 'https://' : 'http://'}app.${process.env.HOST}/auth/datadotworld`;


const authorizeURL = params => {
    return qs.unescape(`${datadotworldAuthURL}/authorize?${qs.stringify(params)}`);
};

const authorizationURI = user => {
    return authorizeURL({
        client_id: process.env.DATA_DOT_WORLD_CLIENT_ID,
        redirect_uri: datadotworldRedirectURI,
        state: user,
    });
};

const getdatadotworldTokenFromUserId = async userId => {
    const user = await User.findById(userId);
    if (Date.now() > user.datadotworldToken.expires_at) {
        // The token has expired, and we need to request a new one.
        const form = {
            refresh_token: user.datadotworldToken.refresh_token,
            grant_type: 'refresh_token',
        };

        return await oauthPostToken(`${datadotworldAuthURL}/access_token`, form, {}, userId, 'datadotworldToken');
    }

    return user.datadotworldToken.access_token;
};

const datadotworldBearerString = async user => `Bearer ${await getdatadotworldTokenFromUserId(user)}`;

/**
 * Endpoint to redirect to the Data.world permission request page.
 */
module.exports.requestPermissionLink = (req, res) => {
    return res.redirect(authorizationURI(req.user));
};

module.exports.datadotworldCallback = (req, res) => {
    if (req.query.error) {
        winston.error(`The datadotworld API returned with an error: ${req.query.error}`);
        return res.render('error', {
            title: 'Data.world Authentication Failed',
            message: 'Data.world authentication could not be completed, please try again later.',
        });
    }

    const form = {
        code: req.query.code,
        client_id: process.env.DATA_DOT_WORLD_CLIENT_ID,
        client_secret: process.env.DATA_DOT_WORLD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        contentType: 'application/x-www-form-urlencoded',
        response_type: 'code',
    };

    oauthPostToken(`${datadotworldAuthURL}/access_token`, form, {}, req.query.state, 'datadotworldToken').then(() => {
        return res.render('close');
    }).catch(error => {
        winston.error('Ran into an error when Requesting a longterm token.', error);
        return res.status(400).send(error);
    });
};

/**
 * Gets datasets(projects) that the authenticated user owns.
 */
module.exports.getDatasets = async (req, res) => {
    request.get(
        `${datadotworldApiURL}/user/datasets/own`,
        { headers: { Authorization: await datadotworldBearerString(req.user) } },
        (error, response, body) => {
            if (error) {
                return res.status(400).send(error);
            }

            return res.json(JSON.parse(body));
        },
    );
};

/**
 * Gets queries that exist on a certain dataset(project).
 */
module.exports.getQueries = async (req, res) => {
    request.get(
        `${datadotworldApiURL}/datasets/${req.query.owner}/${req.query.id}/queries`,
        { headers: { Authorization: await datadotworldBearerString(req.user) } },
        (error, response, body) => {
            if (error) {
                return res.status(400).send(error);
            }

            return res.json(JSON.parse(body));
        },
    );
};

/**
 * Gets a list of tables from the passed dataset(project)'s schema.
 */
module.exports.getTables = async (req, res) => {
    request.post(
        `${datadotworldApiURL}/sql/${req.query.owner}/${req.query.id}`,
        {
            headers: { Authorization: await datadotworldBearerString(req.user) },
            form: { query: 'SELECT tableName FROM TABLES' },
        },
        (error, response, body) => {
            if (error) {
                return res.status(400).send(error);
            }

            return res.json({ records: JSON.parse(body) });
        },
    );
};

/**
 * Takes in a userId and that user's datadotworld source object to format a Query to Data.world's API and query the necessary
 * data for the visualization.
 * @param userId
 * @param datadotworld
 */
module.exports.queryDataset = async (userId, datadotworld) => {
    const requestURL = `${datadotworldApiURL}/${toLower(defaultTo(datadotworld.language, 'sql'))}/${datadotworld.owner}/${datadotworld.id}`;
    const query = defaultTo(datadotworld.query, `SELECT * FROM ${datadotworld.table}`);

    return request.post(
        requestURL,
        { headers: { Authorization: await datadotworldBearerString(userId) }, form: { query } },
    );
};
