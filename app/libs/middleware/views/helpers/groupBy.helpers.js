const { cond, constant, eq, has, stubTrue } = require('lodash');

const { RealColumnNameFromHumanReadableColumnName } = require('../../../datasources/imported_data_preparation');
const {
    SETTING_DEFAULT_GROUP_BY_DURATION,
    SETTING_DEFAULT_GROUP_BY_RANGE,
    SETTING_DEFAULT_GROUP_BY_COLUMN_NAME,
    SETTING_DEPENDS_ON_SORT_BY,
} = require('../../../../config/views.config');
const { fieldOverrideIfExists } = require('../../../../controllers/client/func');
const { equals } = require('../../../../utils/helpers');

const TYPE_DATE = 'date';
const TYPE_NUMBER = 'number';
const TYPE_STRING = 'string';

module.exports = {
    getDefaultGroupByColumnName,
    getGroupByTypeFromSortBy,
    invalidateGroupBy,
};

/**
 * @param {String} groupByType
 * @param {Object} dataSourceDescription
 * @param {String?} defaultGroupByDuration
 * @param {String?} defaultGroupByRange
 * @param {String?} defaultGroupByColumnName
 * @returns {String|undefined}
 */
function getDefaultGroupByColumnName(
    groupByType,
    dataSourceDescription,
    { defaultGroupByDuration, defaultGroupByRange, defaultGroupByColumnName }
) {
    if (groupByType === TYPE_DATE) {
        return defaultGroupByDuration;
    }

    if (groupByType === TYPE_NUMBER) {
        return defaultGroupByRange;
    }

    return fieldOverrideIfExists(defaultGroupByColumnName, dataSourceDescription);
}

/**
 * @param {Boolean} isDate
 * @param {Boolean} isNumber
 * @param {Object[]} masterViewSettings
 * @returns {String|null}
 */
function getGroupByTypeFromSortBy({ isDate, isNumber } = {}, masterViewSettings) {
    const findSetting = settingName => masterViewSettings.find(({ name }) => name === settingName);
    const getType = cond([
        [() => isDate && findSetting(SETTING_DEFAULT_GROUP_BY_DURATION), constant(TYPE_DATE)],
        [() => isNumber && findSetting(SETTING_DEFAULT_GROUP_BY_RANGE), constant(TYPE_NUMBER)],
        [
            () => has(findSetting(SETTING_DEFAULT_GROUP_BY_COLUMN_NAME), SETTING_DEPENDS_ON_SORT_BY),
            constant(TYPE_STRING),
        ],
        [stubTrue, constant(null)],
    ]);

    return getType();
}

function invalidateGroupBy(
    groupBy,
    groupByType,
    dataSourceDescription,
    { fieldsNotAvailableAsGroupByColumns = [], durationsAvailableForGroupBy = [], rangesAvailableForGroupBy = [] }
) {
    const { fe_excludeFields } = dataSourceDescription;
    const groupByRealColumnName = RealColumnNameFromHumanReadableColumnName(groupBy, dataSourceDescription, true);
    const stringGroupBy = () =>
        eq(fe_excludeFields[groupByRealColumnName], false) && !fieldsNotAvailableAsGroupByColumns[groupByRealColumnName]
            ? groupBy
            : undefined;
    const dateGroupBy = () => (durationsAvailableForGroupBy.includes(groupBy) ? groupBy : undefined);
    const numberGroupBy = () => (rangesAvailableForGroupBy.includes(groupBy) ? groupBy : undefined);
    const getDefaultGroupBy = cond([
        [equals(TYPE_STRING), stringGroupBy],
        [equals(TYPE_DATE), dateGroupBy],
        [equals(TYPE_NUMBER), numberGroupBy],
        [stubTrue, constant(groupBy)],
    ]);

    return getDefaultGroupBy(groupByType);
}
