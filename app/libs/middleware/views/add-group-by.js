const winston = require('winston');

const importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
const func = require('../../../controllers/client/func');
const config = require('../../../controllers/client/config');
const { VIEW_TYPE_TIMELINE } = require('../../../config/views.config');
const { getCoercionOperations } = require('./get-coercion-operations');
const {
    getDefaultGroupByColumnName,
    getGroupByTypeFromSortBy,
    invalidateGroupBy,
} = require('./helpers/groupBy.helpers');

module.exports.addGroupBy = function(req, res, next) {
    const dataSourceDescription = req.dataSource;
    const type = req.camelCaseViewType;
    const masterViewSettings = req.viewSettings;
    const groupBy = {};
    const viewSettings = dataSourceDescription.fe_views.views[type];
    const groupByType = getGroupByTypeFromSortBy(req.sortBy, masterViewSettings);

    if (type === VIEW_TYPE_TIMELINE) {
        groupBy.groupBy = req.query.groupBy || viewSettings.defaultGroupByColumnName;
    } else {
        groupBy.groupBy = invalidateGroupBy(req.query.groupBy, groupByType, dataSourceDescription, viewSettings);
    }

    // the human readable col name - real col name derived below
    groupBy.defaultGroupByColumnName_humanReadable =
        groupBy.groupBy || getDefaultGroupByColumnName(groupByType, dataSourceDescription, viewSettings);

    groupBy.groupBy_realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
        groupBy.groupBy || groupBy.defaultGroupByColumnName_humanReadable,
        dataSourceDescription
    );

    const raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
    groupBy.groupBy_isDate = config.isDate(dataSourceDescription, groupBy.groupBy_realColumnName);
    groupBy.groupBy_isNumber = config.isNumber(dataSourceDescription, groupBy.groupBy_realColumnName);
    groupBy.groupBy_outputInFormat = '';
    groupBy.groupBy_inputFormat = '';

    const findOutputFormatObj = func.findItemInArrayOfObject(
        viewSettings.outputInFormat,
        groupBy.groupBy_realColumnName
    );

    if (findOutputFormatObj !== null) {
        groupBy.groupBy_outputInFormat = findOutputFormatObj.value;
    } else if (
        raw_rowObjects_coercionSchema &&
        raw_rowObjects_coercionSchema[groupBy.groupBy_realColumnName] &&
        raw_rowObjects_coercionSchema[groupBy.groupBy_realColumnName].outputFormat
    ) {
        groupBy.groupBy_outputInFormat = raw_rowObjects_coercionSchema[groupBy.groupBy_realColumnName].outputFormat;
        groupBy.groupBy_inputFormat = raw_rowObjects_coercionSchema[groupBy.groupBy_realColumnName].format;
    }

    groupBy.colNames_orderedForGroupByDropdown = importedDataPreparation.HumanReadableFEVisibleColumnNames_orderedForDropdown(
        dataSourceDescription,
        type,
        'GroupBy',
        getCoercionOperations('defaultGroupByColumnName', masterViewSettings)
    );

    const { durationsAvailableForGroupBy = [] } = viewSettings;
    const updatedDurations = durationsAvailableForGroupBy.map(item =>
        item === 'Disabled' ? config.GROUP_BY_DATE_DISABLED : item
    );

    if (groupBy.groupBy_isDate) {
        const selectedDuration = req.query.groupByDuration || viewSettings.defaultGroupByDuration;

        groupBy.groupByDuration = updatedDurations.includes(selectedDuration)
            ? selectedDuration
            : config.GROUP_BY_DATE_DISABLED;
    }

    if (groupBy.groupBy_isNumber) {
        groupBy.groupByRange = req.query.groupByRange || viewSettings.defaultGroupByRange;
    }

    groupBy.durationsAvailableForGroupBy = updatedDurations;
    groupBy.rangesAvailableForGroupBy = viewSettings.rangesAvailableForGroupBy || [];

    req.groupBy = groupBy;

    winston.debug('added groupBy');
    next();
};
