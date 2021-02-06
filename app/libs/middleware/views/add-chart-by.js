var winston = require('winston');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var getCoercionOperations = require('./get-coercion-operations').getCoercionOperations;

module.exports.addChartBy = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;
    var query = req.query;
    var masterViewSettings = req.viewSettings;

    var chartBy = {};

    chartBy.chartBy = query.chartBy; // the human readable col name - real col name derived below
    chartBy.defaultChartByColumnName_humanReadable = fieldOverrideIfExists(dataSourceDescription.fe_views.views[type].defaultChartByColumnName, dataSourceDescription);

    chartBy.colNames_orderedForChartByDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'ChartBy', getCoercionOperations('defaultChartByColumnName', masterViewSettings));

    chartBy.chartBy_realColumnName = chartBy.chartBy ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(chartBy.chartBy, dataSourceDescription) :
        (dataSourceDescription.fe_views.views[type].defaultChartByColumnName === 'Object Title') ? importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views[type].defaultChartByColumnName, dataSourceDescription) :
            dataSourceDescription.fe_views.views[type].defaultChartByColumnName;

    req.chartBy = chartBy;

    winston.debug('added chartBy');
    next();
};
