var winston = require('winston');

const { fieldOverrideIfExists } = require('../../../controllers/client/func');
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var config = require('../../../controllers/client/config');

module.exports.addStackBy = function (req, res, next) {

    var query = req.query;

    var dataSourceDescription = req.dataSource;
    var type = req.camelCaseViewType;

    var stackBy = {};

    stackBy.stackBy = query.stackBy; // the human readable col name - real col name derived below

    stackBy.defaultStackByColumnName_humanReadable = fieldOverrideIfExists(dataSourceDescription.fe_views.views[type].defaultStackByColumnName, dataSourceDescription);
    stackBy.stackBy_realColumnName = stackBy.stackBy ?
        importedDataPreparation.RealColumnNameFromHumanReadableColumnName(stackBy.stackBy, dataSourceDescription) :
        (dataSourceDescription.fe_views.views[type].defaultStackByColumnName === 'Object Title') ?
            importedDataPreparation.RealColumnNameFromHumanReadableColumnName(dataSourceDescription.fe_views.views[type].defaultStackByColumnName, dataSourceDescription) :
            dataSourceDescription.fe_views.views[type].defaultStackByColumnName;
    stackBy.stackBy_isDate = config.isDate(dataSourceDescription, stackBy.stackBy_realColumnName);
    stackBy.colNames_orderedForStackByDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSourceDescription, type, 'StackBy');

    req.stackBy = stackBy;

    winston.debug('added stackBy');
    next();
};
