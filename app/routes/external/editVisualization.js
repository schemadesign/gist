const winston = require('winston');
const { camelCase, isEmpty } = require('lodash');
const express = require('express');

const { appendTokenToRequest, loginWithToken } = require('../../utils/auth');
const descriptions = require('../../models/descriptions');
const teams = require('../../models/teams');

const router = express.Router();

const errorMsg = {
    env: process.env,
    title: 'Oops!',
    message: 'Could not find the visualization.',
    err: 'Error: 404',
    has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
};

const editVisualization = async (req, res) => {
    try {
        const { uid, chartType, subdomain } = req.query;

        const team = await teams.findOne({ subdomain });

        if (isEmpty(team)) {
            winston.error(`Team not found for subdomain ${subdomain}`);
            return res.status(404).render('error', errorMsg);
        }

        const dataSource = await descriptions.findOne({ uid, _team: team._id });

        if (isEmpty(dataSource)) {
            winston.error(`Datasource not found for uid ${uid} and subdomain ${subdomain}`);
            return res.status(404).render('error', errorMsg);
        }

        return res.redirect(`/dashboard/dataset/${dataSource._id.toString()}/views/${camelCase(chartType)}`);
    } catch (error) {
        winston.error(error);

        return res.status(404).render('error', errorMsg);
    }
};

router.get('/', appendTokenToRequest, loginWithToken, editVisualization);

module.exports = router;
