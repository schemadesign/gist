const express = require('express');
const router = express.Router();
const winston = require('winston');

const Team = require('../controllers/api/team');
const team_show_controller = require('../controllers/client/data_preparation/team/show');
const index_controller = require('../controllers/client/data_preparation');

const rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';
const baseURL = `${process.env.USE_SSL === 'true' ? 'https://' : 'http://'}${rootDomain}`;

router.get(
    ['/', '/visualizations', '/articles', '/insights'],
    function (req, res, next) {
        // is this logic out of date?
        // now that the home page is is the custom routes file
        if (process.env.NODE_ENV === 'enterprise') {
            if (req.subdomains[0] === process.env.SUBDOMAIN && process.env.SUBTEAMS) {
                return renderShowcase();
            } else {
                // Get the subdomain info and render!
                getTeamSubdomain();
            }
        } else {
            if (req.subdomains.length == 0 || (req.subdomains.length == 1 && req.subdomains[0] == 'www')) {
                return redirectToApp();
            }

            if (req.subdomains[0] == 'app') {
                return renderShowcase();
            } else {
                // Get the subdomain info and render!
                getTeamSubdomain();
            }
        }

        /**
         * Gets the team by subdomain, and then calls
         * team_show_controller to Bind the team data and render the team/show page
         */
        function getTeamSubdomain() {
            Team.getTeamBySubdomain(req, function (err, teamDescriptions) {
                if (err && err.message !== 'No SubDomain Asked!') {
                    winston.error('Error getting bind data during authorizing : ', err);
                    return next(err);
                }

                if (
                    !teamDescriptions ||
                    teamDescriptions.length == 0 ||
                    (err && err.message == 'No SubDomain Asked!')
                ) {
                    if (rootDomain === req.hostname) {
                        return redirectToApp();
                    } else {
                        return res.redirect(baseURL);
                    }
                }

                // If a subdomain is asked, the team page would be displayed at the base url
                team_show_controller.BindData(req, teamDescriptions[0], function (err, bindData) {
                    if (err) {
                        winston.error('Error getting bind data for Team show: ', err);
                        return next(err);
                    }
                    return res.render('team/show', bindData);
                });
            });
        }

        /**
         * Renders the showcase view with the index_controller BindData.
         */
        function renderShowcase() {
            index_controller.BindData(req, function (err, bindData) {
                if (err) {
                    winston.error('Error getting bind data for Array index: ', err);
                    return next(err);
                }
                return res.render('array/index', bindData);
            });
        }

        function redirectToApp() {
            let rootDomain = process.env.USE_SSL === 'true' ? 'https://app.' : 'http://app.';
            rootDomain += process.env.HOST ? process.env.HOST : 'localhost:9080';
            return res.redirect(rootDomain);
        }
    },
);
module.exports = router;
