var winston = require('winston');

module.exports.addUnits = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;

    req.units = dataSourceDescription.fe_views.views[type].units;

    winston.debug('added units');
    next();
};
