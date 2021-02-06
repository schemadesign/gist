var winston = require('winston');

var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var config = require('../../../controllers/client/config');
const { fieldOverrideIfExists } = require('../../../controllers/client/func');

// currently only for map
module.exports.addMapBy = function (req, res, next) {
    var dataSourceDescription = req.dataSource;
    var query = req.query;
    var type = req.camelCaseViewType;

    var mapBy = {
        mapBy: undefined,
        mapBy_realColumnName: undefined,
        colNames_orderedForMapByDropdown: undefined,
    };

    // the human readable col name - real col name derived below
    const defaultMapByColumnName = dataSourceDescription.fe_views.views[type].defaultMapByColumnName;
    const defaultMapByColumnName_humanReadable = fieldOverrideIfExists(defaultMapByColumnName, dataSourceDescription);

    // If a mapBy was passed in then use that, otherwise set it to the default mapBy
    mapBy.mapBy = query.mapBy || defaultMapByColumnName_humanReadable;

    mapBy.mapBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(mapBy.mapBy, dataSourceDescription);
    mapBy.mapBy_isDate = config.isDate(dataSourceDescription, mapBy.mapBy_realColumnName);

    mapBy.colNames_orderedForMapByDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'MapBy');

    req.mapBy = mapBy;

    winston.debug('added mapBy');
    next();
};
