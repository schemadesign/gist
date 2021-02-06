const winston = require('winston');
const express = require('express');
const router = express.Router();

// Express middleware
const addDataPrepOptions = require('../../../../libs/middleware/views/add-data-prep-options').addDataPrepOptions;
const { handleError } = require('../../../../utils/requests');

// Controller
const { bindData } = require('../../../../controllers/client/data_preparation/word_cloud');

// get the data for a word_cloud visualization
router.get('/graph-data', addDataPrepOptions, async (req, res) => {
    try {
        const results = await bindData(req.dataSource, req.sampleDoc, req.dataPrepOptions);

        winston.debug('Returning results');
        res.json(results);
    } catch (err) {
        winston.error('Error getting bind data for json-api datasource timeline data', err);
        handleError(err, res);
    }
});

module.exports = router;
