const winston = require('winston');
const { defaultTo } = require('lodash');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../../controllers/client/config');
const { fieldOverrideIfExists } = require('../../../controllers/client/func');
const {
    RealColumnNameFromHumanReadableColumnName,
    HumanReadableFEVisibleColumnNames_orderedForDropdown,
} = require('../../../libs/datasources/imported_data_preparation');
const { getCoercionOperations } = require('./get-coercion-operations');

module.exports = { addAggregateBy };

/**
 * aggregate by object has six fields:
 * - aggregateBy = the aggregate by field as supplied in the url query (either directly or via shared page). Will be
 * undefined if not explicitly specified, by design.
 * - aggregateBy_humanReadable = the aggregate column name that may or may not have been modified
 * - aggregateBy_realColumnName = the aggregate column name in its raw form
 * - colNames_orderedForAggregateByDropdown = column names to populate the dropdown
 * - defaultAggregateByColumnName = the default aggregate column name in its raw form
 * - defaultAggregateByColumnName_humanReadable = the default aggregate column name
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function addAggregateBy(req, res, next) {
    const {
        dataSource,
        query: { aggregateBy: queryAggregateBy },
        camelCaseViewType: viewType,
        viewSettings: masterViewSettings,
    } = req;
    const {
        defaultAggregateByColumnName,
        fieldsNotAvailableAsAggregateByColumns,
    } = dataSource.fe_views.views[viewType];
    const unavailableFields = defaultTo(fieldsNotAvailableAsAggregateByColumns, []);

    const aggregateBy = {
        aggregateBy: undefined,
    };

    if (queryAggregateBy) {
        aggregateBy.aggregateBy = queryAggregateBy;
    } else {
        aggregateBy.defaultAggregateByColumnName = defaultTo(defaultAggregateByColumnName, AGGREGATE_BY_DEFAULT_COLUMN_NAME);
    }

    if (!queryAggregateBy && defaultAggregateByColumnName) {
        aggregateBy.aggregateBy_humanReadable = fieldOverrideIfExists(aggregateBy.defaultAggregateByColumnName, dataSource);
        aggregateBy.aggregateBy_realColumnName = aggregateBy.defaultAggregateByColumnName;
    } else {
        aggregateBy.aggregateBy_humanReadable = defaultTo(aggregateBy.aggregateBy, aggregateBy.defaultAggregateByColumnName);
        aggregateBy.aggregateBy_realColumnName = defaultTo(RealColumnNameFromHumanReadableColumnName(aggregateBy.aggregateBy_humanReadable, dataSource), aggregateBy.aggregateBy_humanReadable);
    }

    aggregateBy.colNames_orderedForAggregateByDropdown = HumanReadableFEVisibleColumnNames_orderedForDropdown(dataSource, viewType, 'AggregateBy', getCoercionOperations('defaultAggregateByColumnName', masterViewSettings));

    if (!unavailableFields.includes(AGGREGATE_BY_DEFAULT_COLUMN_NAME)) {
        aggregateBy.colNames_orderedForAggregateByDropdown.push(AGGREGATE_BY_DEFAULT_COLUMN_NAME);
    }

    aggregateBy.defaultAggregateByColumnName_humanReadable = defaultTo(fieldOverrideIfExists(defaultAggregateByColumnName, dataSource), AGGREGATE_BY_DEFAULT_COLUMN_NAME);

    req.aggregateBy = aggregateBy;

    winston.debug('Added aggregateBy');
    next();
}
