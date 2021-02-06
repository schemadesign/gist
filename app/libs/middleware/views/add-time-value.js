var winston = require('winston');

var func = require('../../../controllers/client/func');

module.exports.addTimeValue = function (req, res, next) {

    var query = req.query;

    var timeValue = query.timeValue ? func.convertDateFromRecognizable(query.timeValue, req.groupBy.groupBy_realColumnName, req.dataSource) : null;

    req.timeValue = {
        timeValue: timeValue,
        outputFormat: func.getDateOutputFormat(req.groupBy.groupBy_realColumnName, req.dataSource)
    };

    winston.debug('added timeValue');
    next();
};
