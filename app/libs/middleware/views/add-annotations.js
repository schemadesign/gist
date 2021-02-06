var winston = require('winston');

module.exports.addAnnotations = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;

    req.annotations = dataSourceDescription.fe_views.views[type].annotations;

    winston.debug('added annotations');
    next();
};
