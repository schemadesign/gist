const winston = require('winston');
const express = require('express');
const router = express.Router();

const addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;

router.get('/graph-data', addDataPrepOptions, ({ dataSource, dataPrepOptions }, res, next) => {
    const controller = require('../../../../controllers/client/data_preparation/pieChart/pieChart');

    controller.BindData(dataSource, dataPrepOptions, (err, data) => {
        if (err) {
            winston.error('Error getting bind data for json-api datasource pie chart graph-data , err: %s', err);
            return next(err);
        }

        winston.info('returning graph data');
        res.json(data);
    });
});

module.exports = router;
