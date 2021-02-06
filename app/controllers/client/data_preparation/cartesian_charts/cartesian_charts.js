const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');
const moment = require('moment');

const processed_row_objects = require('../../../../models/processed_row_objects');
const func = require('../../func');
const colorPalette = require('../../colorPalette');
const { dateFormat, getSegmentId } = require('../data_prep_helpers/segmentBy.helpers');
const { getAggregationQuery } = require('../data_prep_helpers/aggregation.helpers');

/**
 * @param dataSourceDescription
 * @param options
 * @param viewType
 * @param {Function} callback
 */
module.exports.BindData = function(dataSourceDescription, options, viewType, callback) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const { segmentBy, chartByIsDate } = options.segmentBy;
    const isSegmentBy = segmentBy && segmentBy !== 'None' && chartByIsDate;
    const outputDateFormat = dateFormat[segmentBy];
    //
    let stackedResultsByGroup = {};
    ///
    // graphData is exported and used by template for chart generation
    let graphData = {};

    const batch = new Batch();
    batch.concurrency(1);

    // Obtain Grouped ResultSet
    batch.push(function(done) {
        winston.info('✅  Obtaining Grouped ResultSet');

        //
        let aggregationOperators = [];
        let _orErrDesc;

        if (options.isSearchActive) {
            _orErrDesc = func.activeSearch_matchOp_orErrDescription(
                dataSourceDescription,
                options.searchCol,
                options.searchQ
            );
            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }

            winston.info('✅  Search is active, adding to query');
            aggregationOperators.push(..._orErrDesc.matchOps);
        }

        if (options.isFilterActive) {
            // rules out undefined filterCol
            _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(
                dataSourceDescription,
                options.filterObj
            );
            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }

            winston.info('✅  Filter is active, adding to query');
            aggregationOperators.push(..._orErrDesc.matchOps);
        }

        aggregationOperators = func.publishMatch(aggregationOperators);

        const aggregationQuery = getAggregationQuery({ options, isSegmentBy, segmentBy });
        const doneFn = function(err, results = []) {
            winston.info('✅  Aggregate query is done, processing...');

            if (err) {
                return done(err);
            }

            winston.info('✅  results length: %s', results.length);

            const groupedResultsByStack = {};

            _.forEach(results, el => {
                const stack = _.isEmpty(el.stack) ? 'default' : el.stack;
                if (_.isNil(groupedResultsByStack[stack])) {
                    groupedResultsByStack[stack] = [];
                }
                groupedResultsByStack[stack].push(el);
            });

            // Bail out of data processing if there are an excessive # of categories (i.e. areas)
            if (Object.keys(groupedResultsByStack).length > 10000) {
                winston.info('number of areas exceeds limit; discontinue data processing');
                return callback(err, { docs: [], undisplayableData: true });
            }

            _.forOwn(groupedResultsByStack, (_groupedResults, stack) => {
                const displayableStack = func.ValueToExcludeByOriginalKey(
                    stack,
                    dataSourceDescription,
                    options.stackBy_realColumnName,
                    viewType
                );

                if (!displayableStack) {
                    return;
                }

                const finalizedButNotCoalesced_groupedResults = [];

                _groupedResults.forEach(function(el) {
                    let displayableLabel;

                    if (isSegmentBy) {
                        displayableLabel = moment(getSegmentId(el.date), outputDateFormat);
                    } else if (options.groupBy_isDate) {
                        displayableLabel = func.formatCoercedField(
                            options.groupBy_realColumnName,
                            el.label,
                            dataSourceDescription
                        );
                    } else {
                        displayableLabel = func.ValueToExcludeByOriginalKey(
                            el.label,
                            dataSourceDescription,
                            options.groupBy_realColumnName,
                            viewType
                        );
                        if (!displayableLabel) {
                            return;
                        }
                    }

                    finalizedButNotCoalesced_groupedResults.push({
                        y: el.value,
                        x: displayableLabel,
                    });
                });

                const summedValuesByLowercasedLabels = {};
                const titleWithMostMatchesAndMatchAggregateByLowercasedTitle = {};

                _.each(finalizedButNotCoalesced_groupedResults, el => {
                    const { x, y } = el;
                    const label_toLowerCased = x.toString().toLowerCase();

                    const existing_valueSum = summedValuesByLowercasedLabels[label_toLowerCased] || 0;

                    summedValuesByLowercasedLabels[label_toLowerCased] = existing_valueSum + y;

                    const existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchAggregateByLowercasedTitle[
                        label_toLowerCased
                    ] || {
                        x: '',
                        y: -Infinity,
                    };

                    if (existing_titleWithMostMatchesAndMatchCount.y < y) {
                        titleWithMostMatchesAndMatchAggregateByLowercasedTitle[label_toLowerCased] = { x, y };
                    }
                });

                const lowercasedLabels = Object.keys(summedValuesByLowercasedLabels);
                const groupedResults = [];

                _.forEach(lowercasedLabels, key => {
                    const summedValue = summedValuesByLowercasedLabels[key];
                    let reconstitutedDisplayableTitle = key;
                    const titleWithMostMatchesAndMatchCount =
                        titleWithMostMatchesAndMatchAggregateByLowercasedTitle[key];
                    if (typeof titleWithMostMatchesAndMatchCount === 'undefined') {
                        winston.error('❌  This should never be undefined.');
                        callback(new Error('Unexpectedly undefined title with most matches'), null);
                        return;
                    } else {
                        reconstitutedDisplayableTitle = titleWithMostMatchesAndMatchCount.x;
                    }

                    groupedResults.push({
                        x: reconstitutedDisplayableTitle,
                        y: summedValue,
                    });
                });

                if (options.stackBy_realColumnName) {
                    stackedResultsByGroup[displayableStack] = groupedResults;
                } else {
                    stackedResultsByGroup = groupedResults;
                }
                /* Make chart category colors consistent for different "Aggregate By" settings
                 The following code alphabetizes the categories which are properties of stackedResultsByGroup */
                if (!Array.isArray(stackedResultsByGroup)) {
                    const alphabetizedStackedResultsByGroup = {};
                    Object.keys(stackedResultsByGroup)
                        .sort()
                        .forEach(function(key) {
                            alphabetizedStackedResultsByGroup[key] = stackedResultsByGroup[key];
                        });
                    stackedResultsByGroup = alphabetizedStackedResultsByGroup;
                }
            });

            winston.info('✅  stackedResultsByGroup is ready');

            const modifyRow = row => {
                if (options.groupBy_isDate && !isSegmentBy) {
                    row.x = moment(row.x, options.groupBy_outputInFormat).utc();
                }
                row.y = Number(row.y);
                return row;
            };

            if (Array.isArray(stackedResultsByGroup)) {
                graphData = {
                    labels: [dataSourceDescription.title],
                    data: stackedResultsByGroup.map(row => modifyRow(row)),
                };
            } else {
                graphData = { labels: [], data: [] };

                _.forOwn(stackedResultsByGroup, (results, category) => {
                    graphData.labels.push(category);

                    // If the group by is a date, then reverse the results array b/c it's given in reverse chronological order
                    if (options.groupBy_isDate) {
                        results = results.reverse();
                    }
                    graphData.data.push(results.map(row => modifyRow(row)));
                });

                graphData.colors = colorPalette.processColors(
                    graphData.labels,
                    dataSourceDescription._team.colorPalette,
                    dataSourceDescription.colorMapping
                );
            }

            winston.info('✅  ...done processing data');

            done();
        };

        aggregationOperators = aggregationOperators.concat(aggregationQuery);

        winston.info('✅  Ready for aggregate query');
        processedRowObjects_mongooseModel
            .aggregate(aggregationOperators)
            .allowDiskUse(true)
            .exec(doneFn);
    });

    batch.end(function(err) {
        if (err) {
            return callback(err);
        }

        const isPercentValue = columnName => func.isPercentOperation(dataSourceDescription, columnName);
        const meta = {
            isStackByPercent: isPercentValue(options.stackBy_realColumnName),
            isAggregateByPercent: isPercentValue(options.aggregateBy_realColumnName),
            isGroupByPercent: isPercentValue(options.groupBy_realColumnName),
            isSegmentBy,
            outputDateFormat,
        };
        const data = {
            // graphData contains all the data rows; used by the template to create the chart
            graphData,
            inputDateFormat: '',
            units: options.units,
            docs: graphData.data.length ? [1] : [], // For determining if there is any data in view
            meta,
        };

        winston.info('✅  Returning data');
        callback(err, data);
    });
};
