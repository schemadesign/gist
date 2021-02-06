const { defaultTo } = require('lodash');
const helmet = require('helmet');
const express = require('express');

const { errorLogger } = require('../utils/winston');
const { checkCors, API_ALLOWED } = require('./permissions');
const { version } = require('../../package.json');

const PROTOCOL = process.env.USE_SSL === 'true' ? 'https' : 'http';
const HOST = defaultTo(process.env.HOST, 'localhost:9080');
const ROOT_DOMAIN = `${PROTOCOL}://app.${HOST}`;
const API_VERSION = 'v1';

const _mountRoutes_monitoring = function (app) {
    app.get('/_ah/health', function (req, res) {
        res.set('Content-Type', 'text/plain');
        res.status(200).send('ok');
    });
};

const _mountRoutes_errorHandling = function (app) {
    // Add the error logger after all middleware and routes so that
    // it can log errors from the whole application. Any custom error
    // handlers should go after this.
    errorLogger(app);

    // eslint-disable-next-line no-unused-vars
    app.use(function (err, req, res, next) {
        const status = err.status || 404;
        const [title, message] = (status === 404) ?
            ['Oops!', 'The page you are looking for doesn\'t exist or has been moved.'] :
            ['Uh oh.', 'Something went wrong\u2026'];
        const error = process.env.NODE_ENV === 'development' ? err.toString() : `Error: ${status}`;

        res.status(status).render('error', {
            env: process.env,
            title,
            message,
            err: error,
            has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
        });
    });

    app.use(function (req, res) {
        res.status(404);
        res.render('error', {
            env: process.env,
            title: 'Oops!',
            message: 'The page you are looking for doesn\'t exist or has been moved.',
            err: 'Error: 404',
            has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
        });
    });
};

const _mountRoutes_endPoints = function (app) {
    app.all('*', function ({ subdomains, url }, res, next) {
        const redirectToRootDomainPatterns = [
            /^\/dashboard/,
            /^\/login/,
            /^\/signup/,
            /^\/auth/,
            /^\/product/,
            /^\/news/,
            /^\/pricing/,
            /^\/plans/,
        ];
        const isEnterprise = process.env.NODE_ENV === 'enterprise';
        const isRootDomain = subdomains.length === 1 && ['app', 'www'].includes(subdomains[0]);

        if (!isEnterprise && !isRootDomain && redirectToRootDomainPatterns.some(pattern => pattern.test(url))) {
            return res.redirect(ROOT_DOMAIN + url);
        }

        next();
    });

    app.use('/robots.txt', express.static(__dirname + '/../../robots.txt'));

    app.use('/', require('./homepage'));

    app.use('/s', require('./shared_pages'));
    app.use('/presentation', require('./stories'));
    app.use(`/json-api/${API_VERSION}`, checkCors(API_ALLOWED), function (req, res, next) {
        req.apiVersion = API_VERSION;
        next();
    }, require('./json-api/router'));
    app.use('/auth', helmet.frameguard(), checkCors(), require('./auth'));
    app.use('/login', helmet.frameguard(), checkCors(), function (req, res) {
        res.redirect('/auth/login');
    });
    app.use('/signup', helmet.frameguard(), checkCors(), require('./signup'));
    app.use('/reset', helmet.frameguard(), checkCors(), function (req, res) {
        // TODO: Perform an jwt auth here instead of in account.js / or better yet auth in both!
        res.render('auth/password', {
            env: process.env,
        });
    });

    app.use('/dashboard', helmet.frameguard(), checkCors(), require('./dashboard'));

    app.use('/api', helmet.frameguard(), require('./api'));

    app.use('/account', checkCors(), require('./account'));
    app.use('/edit-visualization', require('./external/editVisualization'));
    app.use('/create-visualization', require('./external/createVisualization'));
    app.use('/visualization-list', require('./external/visualizationList'));

    app.use('/', require('./articles'));
    app.use('/', checkCors(API_ALLOWED), require('./views').router);
};

module.exports.MountRoutes = function (app) {
    app.get('/env', function (req, res) {
        const obj = {
            node_env: process.env.NODE_ENV,
            host: HOST,
            s3Bucket: process.env.DO_S3_BUCKET,
            s3Domain: process.env.DO_S3_ENDPOINT,
            subdomain: process.env.SUBDOMAIN,
            authProtocol: process.env.AUTH_PROTOCOL,
            hasSubteams: process.env.SUBTEAMS,
            git: {
                branch: process.env.BRANCH_NAME,
                commit: process.env.COMMIT_HASH,
            },
            version,
            insight: process.env.INSIGHT,
            hide_business_links: process.env.HIDE_BUSINESS_LINKS,
            hasSmartsheetInfo: !!process.env.SMARTSHEET_CLIENT_ID,
            hasPipedriveInfo: !!process.env.PIPEDRIVE_CLIENT_ID,
            hasDatadotworldInfo: !!process.env.DATA_DOT_WORLD_CLIENT_ID,
            hasSalesforceInfo: !!process.env.SALESFORCE_CONSUMER_KEY
        };

        return res.json(obj);
    });

    _mountRoutes_monitoring(app);
    _mountRoutes_endPoints(app);
    _mountRoutes_errorHandling(app);
};
