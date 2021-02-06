const winston = require('winston');
const express = require('express');
const router = express.Router();

// Express middleware
const addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;

// controller
const simpleChart = require('../../../../controllers/client/data_preparation/pieSet/simplePieSet');
const advancedChart = require('../../../../controllers/client/data_preparation/pieSet/pieSet');

// get a pie set's graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    const controller = req.simpleChart ? simpleChart : advancedChart;

    try {
        controller.BindData(req.dataSource, req.dataPrepOptions, function (err, data) {
            if (err) {
                winston.error('Error getting bind data for json-api datasource pie set graph-data , err: %s', err);
                return next(err);
            }

            winston.debug('returning graph data');
            res.json(data);
        });
    } catch (err) {
        winston.error('Error getting bind data for json-api datasource pie set graph-data , err: %s', err);
        next(err);
    }
});

module.exports = router;
