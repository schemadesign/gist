const winston = require('winston');
const express = require('express');
const path = require('path');
const fs = require('fs');

const { puppeteerJSAuth } = require('../libs/middleware/puppeteer-js-auth');
const { ensureAuthorizedLegacy } = require('../libs/middleware/ensure-authorized');
const Team = require('../controllers/api/team');
const team_show_controller = require('../controllers/client/data_preparation/team/show');
const index_controller = require('../controllers/client/data_preparation');
const { version } = require('../../package.json');

const router = express.Router();

// serving static file
router.get('/static/*', function (req, res) {
    var u = req.url;
    u = u.split('?').shift();
    var customStaticFileLocation = path.join(__dirname, '/../../user/' + req.subdomains[0], u);
    res.sendFile(customStaticFileLocation);
});

router.get('/signup/*', function (req, res) {
    return res.render('signup/index', {
        env: process.env,
        has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
    });
});

router.get('/dashboard', function (req, res) {
    if (process.env.NODE_ENV === 'enterprise') {

        return res.render('dashboard/index', {
            env: process.env,
            user: req.user,
        });

    }

    // redirect to main domain
    var rootDomain = process.env.USE_SSL === 'true' ? 'https://app.' : 'http://app.';
    rootDomain += process.env.HOST ? process.env.HOST : 'localhost:9080';
    return res.redirect(rootDomain + '/dashboard');
});

router.get('/env', function (req, res) {
    if (process.env.NODE_ENV === 'enterprise') {
        var host = process.env.HOST || 'localhost:9080';
        var obj = {
            node_env: process.env.NODE_ENV,
            host: host,
            s3Bucket: process.env.DO_S3_BUCKET,
            s3Domain: process.env.DO_S3_ENDPOINT,
            authProtocol: process.env.AUTH_PROTOCOL,
            subdomain: process.env.SUBDOMAIN,
            hasSubteams: process.env.SUBTEAMS,
            userEngageAPIKey: process.env.USERENGAGE_API_KEY ? process.env.USERENGAGE_API_KEY : '',
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

    }

    // redirect to main domain
    var rootDomain = process.env.USE_SSL === 'true' ? 'https://app.' : 'http://app.';
    rootDomain += process.env.HOST ? process.env.HOST : 'localhost:9080';
    return res.redirect(rootDomain + '/env');
});

router.get('/:source_key', puppeteerJSAuth, ensureAuthorizedLegacy, function (req, res, next) {
    var source_key = req.params.source_key;
    if (source_key == null || typeof source_key === 'undefined' || source_key == '') {
        return next(new Error('source_key missing'));
    }
    try {
        let customViewFileLocation = path.join(__dirname, '/../../user/', req.subdomains[0], '/views/index');
        fs.exists(customViewFileLocation);
        res.render(customViewFileLocation);
    } catch (e) {
        let rootDomain = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
        rootDomain += process.env.HOST ? process.env.HOST : 'localhost:9080';
        return res.redirect(`${rootDomain}/${source_key}`);
    }
});

// FOR AJAX CALLS, MULTIPLE VIEWS WILL BE get(/:source_key/getData/:view)
// AJAX
// TODO: it this routing use somewhere?
router.get('/:source_key/getData', puppeteerJSAuth, ensureAuthorizedLegacy, function (req, res, next) {
    var team = req.subdomains[0];
    if (!team && process.env.SUBDOMAIN) {
        team = process.env.SUBDOMAIN;
    }

    var controller = require('../../user/' + team + '/src/controller');
    winston.debug('getting bind data for team: %s', team);

    controller.BindData(req, function (err, bindData) {
        if (err) {
            winston.error('Error getting bind data for custom view %s , err: %s', team, err);
            return next(err);
            // return res.status(500).send(err.response || 'Internal Server Error');
        }
        winston.info('  getting data for custom view: %s', team);
        res.json(bindData);

    });
});

// team page
router.get('/', function (req, res) {
    var title;
    if (process.env.SUBTEAMS) {
        title = req.subdomains[0];
    } else {
        title = process.env.SUBDOMAIN;
    }

    if (title === process.env.SUBDOMAIN && process.env.SUBTEAMS) {
        index_controller.BindData(req, function (err, bindData) {
            if (err) {
                winston.error('Error getting bind data for Array index: ', err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }
            return res.render('array/index', bindData);
        });
    } else {
        Team.getTeamBySubdomain(req, function (err, teamDescriptions) {
            if (teamDescriptions.length === 0) {
                var data = {
                    env: process.env,
                    team: {
                        title: title,
                    },
                };
                return res.render('team/show', data);
            }

            if (err && err.message !== 'No SubDomain Asked!') {
                winston.error('Error getting bind data during authorizing : ', err);
                return res.status(500).send(err.response || 'Internal Server Error');
            }

            team_show_controller.BindData(req, teamDescriptions[0], function (err, bindData) {
                if (err) {
                    winston.error('Error getting bind data for Team show: ', err);
                    return res.status(500).send(err.response || 'Internal Server Error');
                }
                return res.render('team/show', bindData);
            });

        });
    }
});

module.exports = router;
