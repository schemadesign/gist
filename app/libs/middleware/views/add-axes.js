const winston = require('winston');
const importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
const getCoercionOperations = require('./get-coercion-operations').getCoercionOperations;
const fieldOverrideIfExists = require('../../../controllers/client/func').fieldOverrideIfExists;

module.exports.addAxes = function (req, res, next) {
    const dataSourceDescription = req.dataSource;
    const query = req.query;
    const type = req.camelCaseViewType;
    const masterViewSettings = req.viewSettings;

    const axes = {
        xAxis: undefined,
        yAxis: undefined
    };

    // yAxis
    const yAxis = query.yAxis;
    axes.yAxis_humanReadable = fieldOverrideIfExists(yAxis || dataSourceDescription.fe_views.views[type].defaultYAxisField, dataSourceDescription);
    axes.yAxis_realName = yAxis ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(yAxis, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views[type].defaultYAxisField === 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(axes.yAxis_humanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views[type].defaultYAxisField;

    // xAxis
    const xAxis = query.xAxis;
    axes.xAxis_humanReadable = fieldOverrideIfExists(xAxis || dataSourceDescription.fe_views.views[type].defaultXAxisField, dataSourceDescription);
    axes.xAxis_realName = xAxis ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(xAxis, dataSourceDescription) : (typeof dataSourceDescription.fe_views.views[type].defaultXAxisField === 'undefined') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(axes.xAxis_humanReadable, dataSourceDescription) : dataSourceDescription.fe_views.views[type].defaultXAxisField;

    axes.colNames_orderedForXAxisDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'defaultXAxisField', getCoercionOperations('defaultXAxisField', masterViewSettings));
    axes.colNames_orderedForYAxisDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'defaultYAxisField', getCoercionOperations('defaultYAxisField', masterViewSettings));

    axes.defaultXAxisField = dataSourceDescription.fe_views.views[type].defaultXAxisField;
    axes.defaultYAxisField = dataSourceDescription.fe_views.views[type].defaultYAxisField;

    // keep these undefined
    if (xAxis) {
        axes.xAxis = xAxis;
    }
    if (yAxis) {
        axes.yAxis = yAxis;
    }

    req.axes = axes;

    winston.debug('added axes');
    next();
};
