var winston = require('winston');
var express = require('express');
var router = express.Router();

// Express middleware
var addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;


// get a map's graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    var controller = require('../../../../controllers/client/data_preparation/map');

    controller.BindData(req.dataSource, req.dataPrepOptions, function (err, data) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource map graph-data , err: %s', err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
