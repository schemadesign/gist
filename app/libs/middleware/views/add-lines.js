var winston = require('winston');
var _ = require('lodash');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');

module.exports.addLines = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;
    var lineTitles = [];

    let colFilterVals;
    if (req.colFilter.col) {
        try {
            const vals = JSON.parse(req.colFilter.col);
            if (Array.isArray(vals)) {
                colFilterVals = vals;
            }
        } catch (e) {
            colFilterVals = [req.colFilter.col];
        }
    }

    _.each(dataSourceDescription.fe_views.views[type].lines, function (line) {
        // only add lines that are published as visible or is a simple chart that has a colFilter
        if (dataSourceDescription.fe_excludeFields[line] === false && (!colFilterVals || colFilterVals.some(col => col === line))) {
            lineTitles.push({
                realName: line,
                humanReadable: fieldOverrideIfExists(line, dataSourceDescription),
            });
        }
    });

    req.lines = lineTitles;
    req.simpleChart = dataSourceDescription.fe_views.views[type].simpleChart;

    winston.debug('added lines');
    next();
};
