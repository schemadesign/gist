const winston = require('winston');
const express = require('express');
const router = express.Router();

const controller = require('../../../../controllers/client/data_preparation/object_details');
const { handleError } = require('../../../../utils/requests');

router.get('/graph-data', function (req, res, next) {
    try {
        controller.BindData(req, req.sourceKey, req.query.objectId, false, req.query.revision, function (err, data) {
            if (err) {
                winston.error('Error getting bind data for json-api datasource object details graph-data , err: %s', err);
                return next(err);
            }

            winston.info('returning graph data');
            res.json(data);
        });
    } catch (err) {
        winston.error('Error getting bind data for json-api datasource object details data', err);
        handleError(err, res);
    }
});

module.exports = router;
