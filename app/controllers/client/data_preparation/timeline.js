const winston = require('winston');
const { cond, constant, get, stubTrue } = require('lodash');

const { VIEW_TYPE_TIMELINE } = require('../../../config/views.config');
const { calculatePageRanges } = require('./data_prep_helpers/pagination_helpers');
const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../models/processed_row_objects');
const { getTimelineSort } = require('./data_prep_helpers/sort.helpers');
const { getTimelineProject } = require('./data_prep_helpers/project.helpers');
const {
    getGroupByDurationParams,
    getGroupByRangeParams,
    getGroupByColumnParams,
} = require('./data_prep_helpers/group.helpers');
const { processDocs } = require('./data_prep_helpers/gallery.helpers');
const { processGroupedResults, getCountAggregationOperators } = require('./data_prep_helpers/timeline.helpers');
const {
    addDefaultAggregationOperators,
    aggregateProcessedRowObjects,
    getFieldTypeAggregationOperators,
} = require('./data_prep_helpers/aggregation.helpers');
const func = require('../func');

module.exports = { bindData };

async function bindData(dataSource, options) {
    const {
        filterObj,
        groupBy_realColumnName,
        groupSize,
        limit,
        onPageNum,
        pageNumber,
        routePath_base,
        sortBy_realColumnName,
        groupBy_isDate,
        groupBy_isNumber,
        groupByRange,
        groupByDuration,
    } = options;

    const timelineViewSettings = dataSource.fe_views.views.timeline;
    const { Model: processedRowObjects_mongooseModel } = Lazy_Shared_ProcessedRowObject_MongooseContext(dataSource._id);
    const groupByRealColumnNamePath = `rowParams.${groupBy_realColumnName}`;
    const wholeFilteredSetAggregationOperators = addDefaultAggregationOperators(dataSource, options);
    const fieldCheckMatch = getFieldTypeAggregationOperators(groupByRealColumnNamePath, {
        isDate: groupBy_isDate,
        isNumber: groupBy_isNumber,
    });

    wholeFilteredSetAggregationOperators.unshift(fieldCheckMatch);
    const getGroupParams = cond([
        [constant(groupBy_isDate), () => getGroupByDurationParams(groupBy_realColumnName, groupByDuration)],
        [constant(groupBy_isNumber), () => getGroupByRangeParams(groupBy_realColumnName, groupByRange)],
        [stubTrue, () => getGroupByColumnParams(groupBy_realColumnName)],
    ]);

    const groupParams = getGroupParams();
    const { groupIdQueryHelper, groupByDateFormat, groupIdProject } = groupParams;

    winston.debug('Getting nonPagedCount');

    const countWholeFilteredSetAggregationOperators = getCountAggregationOperators(
        wholeFilteredSetAggregationOperators,
        groupParams,
        options
    );

    const nonPagedResults = await aggregateProcessedRowObjects(
        processedRowObjects_mongooseModel,
        countWholeFilteredSetAggregationOperators
    );
    const nonPagedCount = groupSize === -1 ? get(nonPagedResults, [0, 'count'], 0) : nonPagedResults.length;

    winston.debug('Found %i non-paged docs', nonPagedCount);

    const skipNResults = limit * (Math.max(pageNumber, 1) - 1);

    const sort = getTimelineSort(dataSource, options);
    const additionalProject = getTimelineProject(dataSource, options);
    const project = {
        _id: 1,
        pKey: 1,
        ...additionalProject,
    };
    const resultsProject = { $slice: groupSize === -1 ? ['$results', skipNResults, limit] : ['$results', groupSize] };

    const getAggregationGroupParams = cond([
        [
            constant(groupBy_isDate),
            constant({
                startDate: { $min: `$${groupByRealColumnNamePath}` },
                endDate: { $max: `$${groupByRealColumnNamePath}` },
            }),
        ],
        [constant(groupBy_isNumber), constant({ group: { $first: `$${groupByRealColumnNamePath}` } })],
        [stubTrue, constant({ group: { $first: `$${groupByRealColumnNamePath}` } })],
    ]);
    const getAggregationProjectParams = cond([
        [
            constant(groupBy_isDate),
            constant({
                startDate: 1,
                endDate: 1,
            }),
        ],
        [constant(groupBy_isNumber), constant({ group: groupIdProject })],
        [stubTrue, constant({ group: 1 })],
    ]);
    const sortGroupParams = groupBy_isDate ? { startDate: -sort._id } : { group: sort._id };

    const aggregationGroupParams = getAggregationGroupParams();
    const aggregationProjectParams = getAggregationProjectParams();
    const unwind = [{ $unwind: `$${groupByRealColumnNamePath}` }];

    if (!groupBy_isDate && !groupBy_isNumber) {
        unwind.push({ $unwind: `$${groupByRealColumnNamePath}` });
    }

    const aggregationOperators = wholeFilteredSetAggregationOperators.concat([
        { $project: project },
        ...unwind,
        { $sort: sort },
        {
            $group: {
                _id: groupIdQueryHelper,
                total: { $sum: 1 },
                results: {
                    $push: {
                        _id: '$_id',
                        rowParams: '$rowParams',
                        pKey: '$pKey',
                    },
                },
                ...aggregationGroupParams,
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                results: resultsProject,
                ...aggregationProjectParams,
            },
        },
        { $sort: sortGroupParams },
    ]);

    if (groupSize !== -1) {
        aggregationOperators.push({ $skip: skipNResults });
        aggregationOperators.push({ $limit: limit });
    }

    const docs = await aggregateProcessedRowObjects(processedRowObjects_mongooseModel, aggregationOperators);
    const groupedResults = docs.map(group => {
        group.results = processDocs(group.results, dataSource, VIEW_TYPE_TIMELINE, timelineViewSettings, options);

        return group;
    });
    const processedResults = processGroupedResults(groupedResults, dataSource, options, groupParams);
    const pageRanges = calculatePageRanges(nonPagedCount);

    const isPercentValue = columnName => func.isPercentOperation(dataSource, columnName);
    const isGroupByPercent = isPercentValue(groupBy_realColumnName);
    const isSortByPercent = isPercentValue(sortBy_realColumnName);

    const data = {
        data: processedResults,
        included: {
            dataSource,
        },
        meta: {
            numberOfResults: groupedResults.length,
            numPages: Math.ceil(nonPagedCount / limit),
            nonpagedCount: nonPagedCount,
            pageRanges,
            onPageNum,
            routePath_base,
            filterObj,
            groupByDateFormat,
            groupSize,
            hasImages: true,
            isGroupByPercent,
            isSortByPercent,
        },
    };

    winston.debug('Done preparing data for timeline');

    return data;
}
