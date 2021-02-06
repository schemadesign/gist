var winston = require('winston');
var express = require('express');
var router = express.Router();

// Express middleware
var addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;

// get a barChart's graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    var controller;

    // Controller
    if (req.simpleChart) {
        controller = require('../../../../controllers/client/data_preparation/cartesian_charts/bar_charts/simple_bar_chart');
    } else {
        controller = require('../../../../controllers/client/data_preparation/cartesian_charts/bar_charts/bar_chart');
    }

    controller.BindData(req.dataSource, req.dataPrepOptions, function (err, data) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource barChart graph-data, simple: %s, err: %s', Boolean(req.simpleChart), err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
