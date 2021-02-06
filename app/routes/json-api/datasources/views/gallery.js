const winston = require('winston');
const express = require('express');

const { addDataPrepOptions } = require('../../../../libs/middleware/views/add-data-prep-options');
const { bindData } = require('../../../../controllers/client/data_preparation/gallery');
const { handleError } = require('../../../../utils/requests');

const router = express.Router();

router.get('/graph-data', addDataPrepOptions, async (req, res) => {
    try {
        const results = await bindData(req.dataSource, req.dataPrepOptions);
        results.meta.imageMeta = req.imageMeta;

        winston.debug('Returning results');
        res.json(results);
    } catch (err) {
        winston.error('Error getting bind data for json-api datasource gallery data', err);
        handleError(err, res);
    }
});

module.exports = router;
