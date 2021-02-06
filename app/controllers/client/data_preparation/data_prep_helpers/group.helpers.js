const {
    DATE_DURATION_DECADE,
    DATE_DURATION_MONTH,
    DATE_DURATION_WEEK,
    DATE_DURATION_DAY,
} = require('../../../../config/dataTypes/date.config');
const { NUMBER_RANGE_MAP, NUMBER_RANGE_DEFAULT } = require('../../../../config/dataTypes/number.config');

module.exports = {
    getGroupByDurationParams,
    getGroupByRangeParams,
    getGroupByColumnParams,
};

/**
 * @param {String} groupBy
 * @param {String} sortBy
 * @returns
 * {
 *   filterDateFormat: String,
 *   groupByUnit: String,
 *   groupByDateFormat: String,
 *   groupIdQueryHelper: Object
 * }
 */
function getGroupByDurationParams(groupBy, duration) {
    if (duration === DATE_DURATION_DECADE) {
        return {
            groupByUnit: 'years',
            groupIdQueryHelper: { $subtract: ['$year', { $mod: ['$year', 10] }] },
            groupByDateFormat: 'YYYY',
            filterDateFormat: 'YYYY',
        };
    }

    if (duration === DATE_DURATION_MONTH) {
        return {
            groupByUnit: 'months',
            groupIdQueryHelper: {
                year: { $year: `$rowParams.${groupBy}` },
                month: { $month: `$rowParams.${groupBy}` },
            },
            groupByDateFormat: 'MMMM YYYY',
            filterDateFormat: 'YYYY-MM-DD',
        };
    }

    if (duration === DATE_DURATION_WEEK) {
        return {
            groupByUnit: 'weeks',
            groupIdQueryHelper: {
                year: { $year: `$rowParams.${groupBy}` },
                week: { $week: `$rowParams.${groupBy}` },
            },
            groupByDateFormat: 'MMMM Do YYYY',
            filterDateFormat: 'YYYY-MM-DD',
        };
    }

    if (duration === DATE_DURATION_DAY) {
        return {
            groupByUnit: 'days',
            groupIdQueryHelper: {
                year: { $year: `$rowParams.${groupBy}` },
                month: { $month: `$rowParams.${groupBy}` },
                day: { $dayOfMonth: `$rowParams.${groupBy}` },
            },
            groupByDateFormat: 'MMMM Do YYYY',
            filterDateFormat: 'YYYY-MM-DD',
        };
    }

    // groupBy === DATE_DURATION_YEAR
    return {
        groupByUnit: 'years',
        groupIdQueryHelper: { $year: `$rowParams.${groupBy}` },

        groupByDateFormat: 'Y',
        filterDateFormat: 'YYYY',
    };
}

/**
 * @param {String} groupBy
 * @param {String} sortBy
 * @returns
 * {
 *   groupIdQueryHelper: Object,
 *   groupIdProject: Object,
 *   groupNumber: Number
 * }
 */
function getGroupByRangeParams(groupBy, range) {
    const number = NUMBER_RANGE_MAP[range] || NUMBER_RANGE_DEFAULT;

    return {
        groupIdQueryHelper: { $floor: { $divide: [`$rowParams.${groupBy}`, number] } },
        groupIdProject: { $multiply: [{ $floor: '$_id' }, number] },
        groupNumber: number,
    };
}

/**
 * @param {String} groupBy
 * @returns
 * {
 *   groupIdQueryHelper: String
 * }
 */
function getGroupByColumnParams(groupBy) {
    return {
        groupIdQueryHelper: `$rowParams.${groupBy}`,
    };
}
