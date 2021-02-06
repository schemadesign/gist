var winston = require('winston');
var _ = require('lodash');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');

module.exports.addBarsAndType = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;
    var barTitles = [];

    let colFilterVals;
    if (req.colFilter && req.colFilter.col) {
        try {
            const vals = JSON.parse(req.colFilter.col);
            if (Array.isArray(vals)) {
                colFilterVals = vals;
            }
        } catch (e) {
            colFilterVals = [req.colFilter.col];
        }
    }

    _.each(dataSourceDescription.fe_views.views[type].bars, function (bar) {
        // only add bars that are published as visible
        if (dataSourceDescription.fe_excludeFields[bar] === false && (!colFilterVals || colFilterVals.some(col => col === bar))) {
            barTitles.push({
                realName: bar,
                humanReadable: fieldOverrideIfExists(bar, dataSourceDescription),
            });
        }
    });

    req.bars = {
        bars: barTitles,
        type: dataSourceDescription.fe_views.views[type].groupedBars ? 'grouped' : 'stacked',
    };
    req.simpleChart = dataSourceDescription.fe_views.views[type].simpleChart;

    winston.debug('added bars and type');
    next();
};
