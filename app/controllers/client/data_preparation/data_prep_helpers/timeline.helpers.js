const moment = require('moment');
const { cond, constant, stubTrue } = require('lodash');

const { DATE_DURATION_DECADE, DATE_DURATION_WEEK } = require('../../../../config/dataTypes/date.config');
const { VIEW_TYPE_TIMELINE } = require('../../../../config/views.config');
const { determineClickThroughView } = require('../../view.helpers');
const { addDate } = require('../../../../../nunjucks/add-date');
const { dateFormat } = require('../../../../../nunjucks/date-format');
const { constructedFilterObj } = require('../../../../../nunjucks/constructed-filter-obj');
const { constructedRoutePath } = require('../../../../../shared/url');

module.exports = {
    processGroupedResults,
    getCountAggregationOperators,
};

/**
 * @param {Object[]} groupedResults
 * @param {Object} dataSource
 * @param {Object} options
 * @param {Object} groupParams
 * @returns {Object[]}
 */
function processGroupedResults(groupedResults, dataSource, options, groupParams) {
    const { groupByUnit, filterDateFormat, groupNumber } = groupParams;
    const {
        defaultGroupByColumnName_humanReadable,
        embedded,
        filterObj,
        groupBy,
        groupBy_realColumnName,
        groupSize,
        isPreview,
        searchCol,
        searchQ,
        groupBy_isDate,
        groupBy_isNumber,
        sortBy_realColumnName,
        secondaryCol,
        sortDirection,
        groupByDuration,
    } = options;

    if (groupBy_isDate) {
        // Make sure each week's start date falls on Sunday
        if (groupByDuration === DATE_DURATION_WEEK) {
            groupedResults.forEach(group => {
                group.startDate = moment
                    .utc(group.startDate)
                    .startOf('week')
                    .toDate();
            });
        }

        // Make sure each decade's start date and end date are correct
        // at this point they are the min/max of the grouped data
        // but we want them to be the min/max of the full decade
        if (groupByDuration === DATE_DURATION_DECADE) {
            groupedResults.forEach(group => {
                const year = moment.utc(group.startDate).year();
                const truncYear = year - (year % 10);
                group.startDate = moment.utc(truncYear, 'YYYY').toDate();
                group.endDate = addDate(group.startDate, 10, groupByUnit);
            });
        }
    }

    if (groupSize === -1) {
        return groupedResults;
    }

    groupedResults.forEach(group => {
        const getFilterValue = cond([
            [
                constant(groupBy_isDate),
                () => getFilterDateRange(group.startDate, group.endDate, groupByUnit, filterDateFormat, options),
            ],
            [constant(groupBy_isNumber), () => getFilterNumberRange(group.group, groupNumber)],
            [stubTrue, () => group.group],
        ]);

        const filterValue = getFilterValue();
        const filterField = groupBy || defaultGroupByColumnName_humanReadable;

        group.viewAllFilter = { [filterField]: filterValue };

        if (groupSize >= group.total) {
            return;
        }

        const filterObjForThisFilterColVal = constructedFilterObj(filterObj, filterField, filterValue, false);
        const viewAllLinkTo =
            determineClickThroughView(VIEW_TYPE_TIMELINE, dataSource.fe_views.views) || VIEW_TYPE_TIMELINE;
        const viewAllUrl = `/${dataSource.uid}/${viewAllLinkTo}`;

        const queryObj = {
            embed: embedded,
            preview: isPreview,
            searchCol,
            searchQ,
            sortBy: sortBy_realColumnName,
            sortDirection,
            secondaryCol,
        };

        if (viewAllLinkTo === VIEW_TYPE_TIMELINE) {
            queryObj.groupSize = -1;

            if (groupBy_realColumnName) {
                queryObj.groupBy = groupBy_realColumnName;
            }
        }

        group.viewAllUrl = constructedRoutePath(viewAllUrl, filterObjForThisFilterColVal, queryObj);
    });

    return groupedResults;
}

/**
 * @param {String} startDate
 * @param {String} endDate
 * @param {String} groupByUnit
 * @param {String} filterDateFormat
 * @param {String} groupBy_realColumnName
 * @returns {String}
 */
function getFilterDateRange(startDate, endDate, groupByUnit, filterDateFormat, { groupBy_realColumnName }) {
    const utcStartDate = moment.utc(startDate);
    const utcEndDate = moment.utc(endDate);

    if (utcStartDate.isSame(utcEndDate)) {
        return dateFormat(utcStartDate, filterDateFormat);
    }

    const startEndDates = groupBy => {
        // For Decade grouping, startDate and endDate have already been adjusted
        if (groupBy === DATE_DURATION_DECADE) {
            return [utcStartDate, utcEndDate];
        }

        // For other groupings, endDate gets an amount added (e.g. 1 year for year grouping)
        return [utcStartDate.startOf(groupByUnit), utcEndDate.endOf(groupByUnit)];
    };
    const [formattedStartDate, formattedEndDate] = startEndDates(groupBy_realColumnName);

    const min = dateFormat(formattedStartDate, filterDateFormat);
    const max = dateFormat(formattedEndDate, filterDateFormat);

    return min === max ? min : JSON.stringify({ min, max });
}

/**
 * @param {Number} group
 * @param {Number} groupSize
 * @returns {String}
 */
function getFilterNumberRange(group, groupSize) {
    return JSON.stringify({
        min: group,
        max: group + groupSize - 1,
    });
}

/**
 * @param {Object[]} aggregationOperators
 * @param {String|Object} groupIdQueryHelper
 * @param {Object} options
 * @returns {Object[]}
 */
function getCountAggregationOperators(aggregationOperators, { groupIdQueryHelper }, options) {
    const { groupSize, groupBy_isDate, groupBy_isNumber, sortBy_realColumnName, groupBy_realColumnName } = options;
    const groupQuery = {
        $group: {
            _id: groupIdQueryHelper,
        },
    };

    if (groupSize === -1) {
        groupQuery.$group.count = { $sum: 1 };
    }

    const countAggregationOperators = [groupQuery];

    if (groupBy_isDate && groupBy_realColumnName === DATE_DURATION_DECADE) {
        countAggregationOperators.unshift({
            $project: {
                year: { $year: `$rowParams.${sortBy_realColumnName}` },
            },
        });
    }

    if (!groupBy_isDate && !groupBy_isNumber) {
        countAggregationOperators.unshift({
            $unwind: groupIdQueryHelper,
        });
    }

    return aggregationOperators.concat(countAggregationOperators);
}
