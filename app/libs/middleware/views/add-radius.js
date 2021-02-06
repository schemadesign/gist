var winston = require('winston');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var getCoercionOperations = require('./get-coercion-operations').getCoercionOperations;

module.exports.addRadius = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var query = req.query;
    var type = req.camelCaseViewType;
    var masterViewSettings = req.viewSettings;

    var radius = {
        urlQuery: undefined,
    };

    var radiusUrlQuery = query.radius;
    var radiusUrl = radiusUrlQuery || dataSourceDescription.fe_views.views[type].defaultRadiusField;

    radius.defaultHumanReadable = fieldOverrideIfExists(radiusUrl, dataSourceDescription);

    radius.realName = radiusUrlQuery ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(radiusUrlQuery, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views[type].defaultRadiusField === 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(radius.defaultHumanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views[type].defaultRadiusField;

    radius.colNames = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'defaultRadiusField', getCoercionOperations('defaultRadiusField', masterViewSettings));

    radius.default = dataSourceDescription.fe_views.views[type].defaultRadiusField;

    req.radius = radius;

    if (radiusUrlQuery) {
        radius.urlQuery = radiusUrlQuery;
    }

    winston.debug('added radius');
    next();
};
