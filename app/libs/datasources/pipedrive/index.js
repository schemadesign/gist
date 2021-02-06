const winston = require('winston');
const qs = require('querystring');
const User = require('../../../models/users');
const { oauthPostToken } = require('../../oauth2');
const { getAllData } = require('./pipedrive-data-helpers');

const pipedriveAuthURL = 'https://oauth.pipedrive.com/oauth';
const redirectURI = `${process.env.USE_SSL === 'true' ? 'https://' : 'http://'}app.${process.env.HOST}/auth/pipedrive`;
const base64IdAndSecret = Buffer.from(`${process.env.PIPEDRIVE_CLIENT_ID}:${process.env.PIPEDRIVE_CLIENT_SECRET}`).toString('base64');


const authorizeURL = params => {
    return qs.unescape(`${pipedriveAuthURL}/authorize?${qs.stringify(params)}`);
};

const authorizationURI = user => {
    return authorizeURL({
        client_id: process.env.PIPEDRIVE_CLIENT_ID,
        redirect_uri: redirectURI,
        state: user
    });
};

const getPipedriveTokenFromUserId = async userId => {
    const user = await User.findById(userId);
    if (Date.now() > user.pipedriveToken.expires_at) {
        // The token has expired, and we need to request a new one.
        const form = {
            refresh_token: user.pipedriveToken.refresh_token,
            grant_type: 'refresh_token'
        };

        const headers = {
            Authorization: `Basic ${base64IdAndSecret}`,
            contentType: 'application/x-www-form-urlencoded'
        };

        return await oauthPostToken(`${pipedriveAuthURL}/token`, form, headers, userId, 'pipedriveToken');
    }

    return user.pipedriveToken.access_token;
};

const pipedriveBearerString = async user => `Bearer ${await getPipedriveTokenFromUserId(user)}`;

module.exports.requestPermissionLink = (req, res) => {
    return res.redirect(authorizationURI(req.user));
};

module.exports.pipedriveCallback = (req, res) => {
    if (req.query.error) {
        winston.error(`The Pipedrive API returned with an error: ${req.query.error}`);
        return res.render('error', { title: 'Pipedrive Authentication Failed', message: 'Pipedrive authentication could not be completed, please try again later.' });
    }

    const form = {
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: redirectURI,
        contentType: 'application/x-www-form-urlencoded'
    };

    const headers = {
        Authorization: `Basic ${base64IdAndSecret}`,
        contentType: 'application/x-www-form-urlencoded'
    };

    oauthPostToken(`${pipedriveAuthURL}/token`, form, headers, req.query.state, 'pipedriveToken').then(() => {
        return res.render('close');
    }).catch(error => {
        winston.error('Ran into an error when Requesting a longterm token.', error);
        return res.status(400).send(error);
    });
};

module.exports.getDeals = async (user, endpoint) => await getAllData(await pipedriveBearerString(user), endpoint);
