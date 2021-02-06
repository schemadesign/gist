const winston = require('winston');

const { isDate } = require('../../../controllers/client/config');

module.exports.addSegmentByBy = function(req, res, next) {
    const dataSourceDescription = req.dataSource;
    const type = req.camelCaseViewType;
    const { defaultSegmentByDuration, durationsAvailableForSegmentBy } = dataSourceDescription.fe_views.views[type];

    req.segmentBy = {
        segmentBy: req.query.segmentBy || defaultSegmentByDuration,
        querySegmentBy: req.query.segmentBy,
        segmentByOptions: durationsAvailableForSegmentBy,
        chartByIsDate: isDate(
            dataSourceDescription,
            req.chartBy.chartBy_realColumnName || req.groupBy.groupBy_realColumnName
        ),
    };

    winston.debug('added segmentBy');
    next();
};
