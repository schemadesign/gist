const winston = require('winston');
const express = require('express');
const router = express.Router();

const addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;
const controller = require('../../../../controllers/client/data_preparation/treemap');

// get a treemap graphData
router.get('/graph-data', addDataPrepOptions, function (req, res, next) {
    controller.BindData(req.dataSource, req.dataPrepOptions, function (err, data) {
        if (err) {
            winston.error('Error getting bind data for json-api datasource treemap graph-data , err: %s', err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
