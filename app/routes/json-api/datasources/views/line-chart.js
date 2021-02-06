var winston = require('winston');
var express = require('express');
var router = express.Router();

// Express middleware
var addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;


// get a lineChart's graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    // Controller
    var controller;
    if (req.simpleChart) {
        controller = require('../../../../controllers/client/data_preparation/cartesian_charts/simple_cartesian_charts');
    } else {
        controller = require('../../../../controllers/client/data_preparation/cartesian_charts/cartesian_charts');
    }
    controller.BindData(req.dataSource, req.dataPrepOptions, 'lineGraph', function (err, data) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource lineChart graph-data , err: %s', err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
