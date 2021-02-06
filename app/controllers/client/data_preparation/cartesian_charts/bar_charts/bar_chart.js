const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');
const moment = require('moment');

const processed_row_objects = require('../../../../../models/processed_row_objects');
const func = require('../../../func');
const colorPalette = require('../../../colorPalette');
const aggregateQueries = require('./bar_chart_aggregation_operators');
const datatypes = require('../../../../../libs/datasources/datatypes');

/**
 * @param {Object} dataSourceDescription
 * @param {Object} options
 * @param {Function} callback
 */
module.exports.BindData = function (dataSourceDescription, options, callback) {
    const meta = {
        onPageNum: options.onPageNum,
        routePath_base: options.routePath_base,
        filterObj: options.filterObj,
    };
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    // @todo does this belong here, or as a param on groupBy middleware?
    var groupByDurationForQuery;
    switch (options.groupByDuration) {
        case 'Year':
            groupByDurationForQuery = '%Y';
            break;
        case 'Month':
            groupByDurationForQuery = '%m-%Y';
            break;
        case 'Day':
            groupByDurationForQuery = '%d-%m-%Y';
            break;
        default:
            options.groupByDuration = null;
    }

    var stackedResultsByGroup = {};

    // graphData is exported and used by template for bar chart generation
    var graphData;

    var batch = new Batch();
    batch.concurrency(1);

    // Obtain Grouped ResultSet
    batch.push(async function (done) {

        winston.info('Obtaining Grouped ResultSet');

        var aggregationOperators = [];
        var _orErrDesc;

        if (options.isSearchActive) {
            _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, options.searchCol, options.searchQ);

            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }
            winston.info('Search is active, adding to query');
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        if (options.isFilterActive) { // rules out undefined filterCol
            _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, options.filterObj);

            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }
            winston.info('Filter is active, adding to query');
            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        aggregationOperators = func.publishMatch(aggregationOperators);
        var aggregateQuery = aggregateQueries.constructAggregationOperators(
            options.aggregateBy_realColumnName,
            options.stackBy_realColumnName,
            options.groupBy_realColumnName,
            groupByDurationForQuery,
        );

        aggregationOperators = aggregationOperators.concat(aggregateQuery);

        var doneFn = function (err, _multigroupedResults) {
            winston.info('Aggregate query is done, processing...');

            if (err) {
                return done(err);
            }

            if (_multigroupedResults === 'undefined' || _multigroupedResults === null) {
                _multigroupedResults = [];
            }
            winston.info('_multigroupedResults length: %s', _multigroupedResults.length);

            var _multigroupedResults_object = {};

            // in the end, the object will be constructed like this:
            // {category_value: [{'value': value_value, 'category': category_value, 'label': label_value}]}
            _.each(_multigroupedResults, function (el) {
                var category;

                if (options.groupByDuration) {
                    category = el.groupedCategory || datatypes.originalValue(dataSourceDescription.raw_rowObjects_coercionScheme[options.groupBy_realColumnName], el.category);
                } else if (options.groupBy_isDate) {
                    category = moment(el.category).utc().format(options.groupBy_outputInFormat);
                    // mongodb changes to local time so we're formatting back to utc
                    el.category = category;
                } else {
                    category = el.category;
                }

                if (_multigroupedResults_object[category] === undefined) {
                    _multigroupedResults_object[category] = [];
                }
                _multigroupedResults_object[category].push(el);
            });

            if (Object.keys(_multigroupedResults_object).length > 10000) {
                winston.info('number of bars exceeds limit; discontinue data processing');
                return callback(null, { docs: [], undisplayableData: true });
            }

            var exitFlag = false;

            _.forOwn(_multigroupedResults_object, function (_groupedResults, category) {

                if (_groupedResults.length > 1000) {
                    exitFlag = true;
                    // To exit a lodash for loop, must explicitly return false
                    return false;
                }

                var displayableCategory = category;

                if (options.groupBy_isDate && !options.groupByDuration) {
                    // since category is a key - we need to send the moment utc version
                    // otherwise it will be an invalid date
                    displayableCategory = category;
                }

                if (options.groupBy_isDate && options.groupByDuration) {
                    // mm-yyyy isn't a valid date so it has to be changed to mm-dd-yyyy
                    if (options.groupByDuration === 'Month') {
                        category = category.split('-');
                        category = new Date(category[0] + '-01-' + category[1]);
                        displayableCategory = moment(category, moment.ISO_8601).utc().format('MMM YYYY');
                    }
                }
                displayableCategory = func.ValueToExcludeByOriginalKey(
                    displayableCategory, dataSourceDescription, options.groupBy_realColumnName, 'barChart');

                if (!displayableCategory) {
                    return;
                }

                var finalizedButNotCoalesced_groupedResults = [];

                _.each(_groupedResults, function (el) {
                    var displayableLabel;
                    var displayableRealCategory;
                    // add category to graph data
                    if (options.groupBy_isDate) {
                        displayableRealCategory = displayableCategory;
                    } else {
                        displayableRealCategory = el.category;
                    }

                    if (options.stackBy_isDate) {
                        displayableLabel = func.formatCoercedField(options.stackBy_realColumnName, el.label, dataSourceDescription);
                    } else {
                        displayableLabel = el.label;
                    }

                    displayableLabel = func.ValueToExcludeByOriginalKey(
                        displayableLabel, dataSourceDescription, options.stackBy_realColumnName, 'barChart');

                    if (_.isNil(displayableLabel)) {
                        return;
                    }

                    finalizedButNotCoalesced_groupedResults.push({
                        value: el.value,
                        label: displayableLabel,
                        realCategoryData: displayableRealCategory,
                    });
                });

                var summedValuesByLowercasedLabels = {};
                var titleWithMostMatchesAndMatchAggregateByLowercasedTitle = {};

                _.each(finalizedButNotCoalesced_groupedResults, function (el) {
                    var label = el.label;
                    var value = el.value;
                    var label_toLowerCased = label.toString().toLowerCase();

                    if (!summedValuesByLowercasedLabels[label_toLowerCased]) {
                        summedValuesByLowercasedLabels[label_toLowerCased] = [];
                    }
                    var existing_valueSum = summedValuesByLowercasedLabels[label_toLowerCased][0] || 0;
                    var new_valueSum = existing_valueSum + value;
                    summedValuesByLowercasedLabels[label_toLowerCased][0] = new_valueSum;
                    // add category to graph data
                    summedValuesByLowercasedLabels[label_toLowerCased][1] = el.realCategoryData;
                    //
                    var existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchAggregateByLowercasedTitle[label_toLowerCased] || {
                        label: '',
                        value: -900000000000000,
                    };
                    if (existing_titleWithMostMatchesAndMatchCount.value < value) {
                        var new_titleWithMostMatchesAndMatchCount = { label: label, value: value };
                        titleWithMostMatchesAndMatchAggregateByLowercasedTitle[label_toLowerCased] = new_titleWithMostMatchesAndMatchCount;
                    }
                });
                var lowercasedLabels = Object.keys(summedValuesByLowercasedLabels);
                var groupedResults = [];

                _.each(lowercasedLabels, function (key) {
                    var summedValue = summedValuesByLowercasedLabels[key][0];
                    var reconstitutedDisplayableTitle = key;
                    var titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchAggregateByLowercasedTitle[key];
                    if (typeof titleWithMostMatchesAndMatchCount === 'undefined') {
                        winston.error('This should never be undefined.');
                        callback(new Error('Unexpectedly undefined title with most matches'), null);
                        return;
                    } else {
                        reconstitutedDisplayableTitle = titleWithMostMatchesAndMatchCount.label;
                    }

                    groupedResults.push({
                        value: summedValue,
                        label: reconstitutedDisplayableTitle,
                        category: summedValuesByLowercasedLabels[key][1],
                    });
                });

                stackedResultsByGroup[displayableCategory] = groupedResults;

            });

            if (exitFlag) {
                winston.info('number of bar slices exceeds limit; discontinue data processing');
                return callback(null, { docs: [], undisplayableData: true });
            }

            winston.info('stackedResultsByGroup is ready');

            // var barColors = dataSourceDescription.fe_views.views.barChart.stackedBarColors ?
            // dataSourceDescription.fe_views.views.barChart.stackedBarColors : [];

            graphData = {
                categories: [],
                data: [],
                type: options.type,
            };

            for (var category in stackedResultsByGroup) {
                if (stackedResultsByGroup.hasOwnProperty(category)) {
                    graphData.categories.push(category);
                    graphData.data.push(stackedResultsByGroup[category]);
                }
            }

            if (graphData.categories.every((value) => !_.isNaN(+value))) {
                graphData.categories = _.sortBy(graphData.categories, (value) => +value);
            }

            winston.info('...done processing data');

            done();
        };
        const data = await processedRowObjects_mongooseModel
            .aggregate(aggregationOperators.concat([{ $count: 'count' }]));
        const nonpagedCount = _.get(data, '[0].count', 0);

        meta.nonpagedCount = nonpagedCount;
        meta.pageSize = options.limit < nonpagedCount ? options.limit : nonpagedCount;
        meta.numPages = Math.ceil(nonpagedCount / options.limit);

        const paginationAggregation = [
            { $skip: options.skipNResults },
            { $limit: options.limit },
        ];

        winston.info('Ready for aggregate query');
        processedRowObjects_mongooseModel
            .aggregate(aggregationOperators.concat(paginationAggregation))
            .allowDiskUse(true)/* or we will hit mem limit on some pages*/
            .exec(doneFn);
    });

    batch.end(function (err) {
        if (err) {
            return callback(err);
        }

        var numberOfResults;
        var categoriesLength = graphData.categories.length;
        if (categoriesLength === 1) {
            numberOfResults = graphData.data[0].length;
        } else {
            numberOfResults = categoriesLength;
        }

        var labels = [];

        _.forEach(graphData.data, function (group) {
            _.forEach(group, function (datum) {
                if (labels.indexOf(datum.label) === -1) {
                    labels.push(datum.label);
                }
            });
        });

        var colors = colorPalette.processColors(labels, dataSourceDescription._team.colorPalette, dataSourceDescription.colorMapping);

        var colorMap = {};
        _.forEach(labels, function (label, i) {
            colorMap[label] = colors[i];
        });

        _.forEach(graphData.data, function (group) {
            _.forEach(group, function (datum) {
                datum.color = colorMap[datum.label];
            });
        });

        const isPercentValue = (columnName) => func.isPercentOperation(dataSourceDescription, columnName);

        meta.isGroupByPercent = isPercentValue(options.groupBy_realColumnName);
        meta.isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);
        meta.isStackByPercent = isPercentValue(options.stackBy_realColumnName);

        const data = {
            // graphData contains all the data rows; used by the template to create the barchart
            graphData: graphData,
            docs: graphData.data.length ? [1] : [], // For determining if there is any data in view
            numberOfResults: numberOfResults,
            annotations: options.annotations,
            units: options.units,
            meta,
        };

        winston.info('Returning data');

        callback(err, data);
    });
};
