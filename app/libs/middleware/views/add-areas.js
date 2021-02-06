var winston = require('winston');
var _ = require('lodash');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');

module.exports.addAreas = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;
    var areaTitles = [];

    _.each(dataSourceDescription.fe_views.views[type].areas, function (area) {
        areaTitles.push({
            realName: area,
            humanReadable: fieldOverrideIfExists(area, dataSourceDescription),
        });
    });

    req.areas = areaTitles;
    req.simpleChart = dataSourceDescription.fe_views.views[type].simpleChart;

    winston.debug('added areas');
    next();
};
