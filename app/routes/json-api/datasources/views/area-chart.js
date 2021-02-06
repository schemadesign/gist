var winston = require('winston');
var express = require('express');
var router = express.Router();

var simpleChart = require('../../../../controllers/client/data_preparation/cartesian_charts/simple_cartesian_charts');
var advancedChart = require('../../../../controllers/client/data_preparation/cartesian_charts/cartesian_charts');

// Express middleware
var addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;


// get an area chart's graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    var controller;

    // Controller
    controller = advancedChart;

    if (req.simpleChart) {
        controller = simpleChart;
    }

    controller.BindData(req.dataSource, req.dataPrepOptions, 'areaChart', function (err, data) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource areaChart graph-data , err: %s', err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
