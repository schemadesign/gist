const winston = require('winston');
const { getAggregateGroups } = require('./pieSet.helpers');
const { matchExcludedFields } = require('../../func');

const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../../models/processed_row_objects');
const { groupSizes } = require('../../config');
const {
    activeSearch_matchOp_orErrDescription,
    activeFilter_matchOp_orErrDescription_fromMultiFilter,
    isPercentOperation,
} = require('../../func');
const { formatData } = require('./pieSet.helpers');
const { calculatePageRanges } = require('../data_prep_helpers/pagination_helpers');
const { getPieSetSort } = require('../data_prep_helpers/sort.helpers');

module.exports.BindData = async (dataSourceDescription, options, callback) => {
    const processedRowObjects_mongooseContext = Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const { segmentBy, chartByIsDate } = options.segmentBy;
    const isSegmentBy = segmentBy && segmentBy !== 'None' && chartByIsDate;

    winston.info('Obtaining Grouped ResultSet');

    const aggregationOperators = matchExcludedFields(dataSourceDescription, 'pieSet');

    if (options.isSearchActive) {
        const { matchOps, err } = activeSearch_matchOp_orErrDescription(
            dataSourceDescription,
            options.searchCol,
            options.searchQ
        );
        if (err) {
            return callback(err);
        }

        winston.info('Search is active, adding to query');
        aggregationOperators.push(...matchOps);
    }

    if (options.isFilterActive) {
        const { matchOps, err } = activeFilter_matchOp_orErrDescription_fromMultiFilter(
            dataSourceDescription,
            options.filterObj
        );
        if (err) {
            return callback(err);
        }

        winston.info('Filter is active, adding to query');
        aggregationOperators.push(...matchOps);
    }

    const { chartBy_realColumnName, groupBy_realColumnName } = options;

    const nonPageAggregationQuery = [
        { $unwind: `$rowParams.${groupBy_realColumnName}` },
        {
            $group: {
                _id: `$rowParams.${groupBy_realColumnName}`,
            },
        },
        {
            $group: {
                _id: null,
                size: { $sum: 1 },
            },
        },
    ];

    const sort = getPieSetSort(dataSourceDescription, options);
    const aggregateGroups = getAggregateGroups({ options, isSegmentBy, segmentBy });

    const aggregationQuery = [
        { $unwind: `$rowParams.${chartBy_realColumnName}` },
        { $unwind: `$rowParams.${groupBy_realColumnName}` },
        ...aggregateGroups,
        {
            $project: {
                _id: 0,
                title: '$_id',
                data: {
                    $slice: ['$data', groupSizes.pieSet],
                },
            },
        },
        {
            $sort: { title: sort },
        },
    ];

    const paginationAggregregationQuery = [{ $skip: options.skipNResults }, { $limit: options.limit }];

    const data = await processedRowObjects_mongooseModel
        .aggregate(aggregationOperators.concat(nonPageAggregationQuery))
        .allowDiskUse(true)
        .exec();

    aggregationOperators.push(...aggregationQuery, ...paginationAggregregationQuery);
    const { size: nonpagedCount } = data[0];

    const isPercentValue = columnName => isPercentOperation(dataSourceDescription, columnName);
    const isChartByPercent = isPercentValue(options.groupBy_realColumnName);
    const isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);

    const doneFn = (err, results) => {
        if (err) {
            return callback(err);
        }
        const { docs, flatResults, colors } = formatData({ results, options, dataSourceDescription, isSegmentBy });

        const data = {
            flatResults,
            docs,
            colors,
            meta: {
                numberOfResults: docs.length,
                pageSize: options.limit < nonpagedCount ? options.limit : nonpagedCount,
                numPages: Math.ceil(nonpagedCount / options.limit),
                nonpagedCount,
                pageRanges: calculatePageRanges(nonpagedCount),
                onPageNum: options.onPageNum,
                resultsOffset: options.resultsOffset,
                routePath_base: options.routePath_base,
                filterObj: options.filterObj,
                revision: options.revision,
                isChartByPercent,
                isAggregateByPercent,
            },
        };

        callback(null, data);
    };

    processedRowObjects_mongooseModel
        .aggregate(aggregationOperators)
        .allowDiskUse(true)
        .exec(doneFn);
};
