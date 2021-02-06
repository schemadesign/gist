var winston = require('winston');
var express = require('express');
var router = express.Router();

// Express middleware
var addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;

// Controller
var controller = require('../../../../controllers/client/data_preparation/table');

// get the data for a table visualization
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    controller.BindData(req.dataSource, req.sampleDoc, req.dataPrepOptions, function (err, results) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource table data , err: %s', err);
            return next(err);
        }

        winston.info('returning results');
        results.meta.imageMeta = req.imageMeta;

        res.json(results);
    });
});

module.exports = router;
