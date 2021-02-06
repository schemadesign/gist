const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME, isDate } = require('../../config');
const processed_row_objects = require('../../../../models/processed_row_objects');
const func = require('../../func');

/**
 * Scatterplot view action controller.
 * @param {Object} dataSourceDescription
 * @param {Object} options
 * @param {Function} callback
 */
module.exports.BindData = function (dataSourceDescription, options, callback) {

    var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    var documents;
    var wholeFilteredSetAggregationOperators = [];
    var nonpagedCount = 0;

    var batch = new Batch();
    batch.concurrency(1);

    // start constructing query
    batch.push(function (done) {

        winston.info('Constructing query step 1');

        var aggByNumberOfItems = function (aggregationOperators, image) {
            var unwind = [
                { $unwind: '$rowParams.' + options.xAxis_realName },
                { $unwind: '$rowParams.' + options.yAxis_realName },
            ];
            var group = [{
                $group: {
                    _id: {
                        xAxis: '$rowParams.' + options.xAxis_realName,
                        yAxis: '$rowParams.' + options.yAxis_realName,
                    },
                    value: { $addToSet: '$_id' },
                    title: { $addToSet: '$rowParams.' + dataSourceDescription.objectTitle },
                },
            }];
            var project = [{
                $project: {
                    _id: 0,
                    id: '$value',
                    objectTitle: '$title',
                    xAxis: '$_id.xAxis',
                    yAxis: '$_id.yAxis',
                    radius: { $size: '$value' },
                    count: { $size: '$value' },
                },
            }];
            var sort = {
                $sort: { count: 1 },
            };

            if (image) {
                group[0]['$group'].image = { $addToSet: '$rowParams.' + image };
                project[0]['$project'].image = '$image';
            }
            var fullAggregateQuery = unwind.concat(group, project, sort);
            return aggregationOperators.concat(fullAggregateQuery);
        };

        var nonAggregationQuery = function (aggregationOperators, image) {
            var project = [{
                $project: {
                    _id: 0,
                    id: '$_id',
                    objectTitle: '$rowParams.' + dataSourceDescription.objectTitle,
                    xAxis: '$rowParams.' + options.xAxis_realName,
                    yAxis: '$rowParams.' + options.yAxis_realName,
                    radius: '$rowParams.' + options.aggregateBy_realColumnName,
                },
            }];

            if (image) {
                project[0]['$project'].image = '$rowParams.' + image;
            }

            return aggregationOperators.concat(project);
        };

        var _orErrDesc;

        if (options.isSearchActive) {
            _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, options.searchCol, options.searchQ);
            if (_orErrDesc.err) {
                _orErrDesc.matchOps = [];
            }

            winston.info('Search is active, adding to query');
            wholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (options.isFilterActive) { // rules out undefined filterCol
            _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, options.filterObj);
            if (_orErrDesc.err) {
                _orErrDesc.matchOps = [];
            }

            winston.info('Filter is active, adding to query');
            wholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat(_orErrDesc.matchOps);
        }

        wholeFilteredSetAggregationOperators = func.publishMatch(wholeFilteredSetAggregationOperators);

        if (options.aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME) {
            winston.info('Aggregating by Number of Items');
            wholeFilteredSetAggregationOperators = aggByNumberOfItems(wholeFilteredSetAggregationOperators, dataSourceDescription.fe_image.field);
        } else {
            winston.info('No aggregation');
            wholeFilteredSetAggregationOperators = nonAggregationQuery(wholeFilteredSetAggregationOperators, dataSourceDescription.fe_image.field);
        }

        winston.info('Done with step 1');

        var countWholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat([
            { // Count
                $group: {
                    _id: 1,
                    count: { $sum: 1 },
                },
            },
        ]);

        var doneFn = function (err, results) {

            winston.info('...done');
            if (err) {
                return done(err);
            }
            if (results !== undefined && results !== null && results.length > 0) {
                nonpagedCount = results[0].count;
            }
            done();
        };

        winston.info('Ready for aggregate query 1...');
        processedRowObjects_mongooseModel.aggregate(countWholeFilteredSetAggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    });

    const formatField = (columnName, value) => func.formatCoercedField(columnName, value, dataSourceDescription);
    // Obtain grouped results
    batch.push(function (done) {

        var doneFn = function (err, groupedDocuments) {
            winston.info('...done');
            if (err) {
                return done(err);
            }
            // Check to see if the object title's operation is ToDate, if it is then we'll need to format it
            const objTitle = func.fieldOverrideIfExists(dataSourceDescription.objectTitle, dataSourceDescription);
            const objectTitleDate = options.cols_orderedForSearchByDropdown.find(col => col.name === objTitle).operation === 'ToDate';

            const { xAxis_realName, yAxis_realName, aggregateBy_realColumnName } = options;

            if (!groupedDocuments[0] || !groupedDocuments[0].rowParams) {
                documents = [];
                groupedDocuments.forEach(function (el, i) {
                    documents.push({
                        objectId: el.id,
                    });

                    const { xAxis, yAxis, radius } = el;
                    const item = documents[i];

                    item.x = xAxis;
                    item.xLabel = formatField(xAxis_realName, xAxis);

                    item.y = yAxis;
                    item.yLabel = formatField(yAxis_realName, yAxis);

                    item.radius = el.radius;
                    item.radiusLabel = formatField(aggregateBy_realColumnName, radius);

                    item.count = el.count;
                    item.title = objectTitleDate ? func.convertDateToBeRecognizable(el.objectTitle, dataSourceDescription.objectTitle, dataSourceDescription) : el.objectTitle;
                    item.image = el.image;
                });
            } else {
                documents = [];
            }

            done();
        };

        var pagedDocs_aggregationOperators = wholeFilteredSetAggregationOperators.concat([
            // Pagination
            { $skip: options.skipNResults },
            { $limit: options.limit },
        ]);

        winston.info('Ready for aggregate query 2...');
        processedRowObjects_mongooseModel.aggregate(pagedDocs_aggregationOperators).allowDiskUse(true).exec(doneFn);
    });

    batch.end(function (err) {

        if (err) {
            return callback(err);
        }

        const isPercentValue = (columnName) => func.isPercentOperation(dataSourceDescription, columnName);
        const isXAxisPercent = isPercentValue(options.xAxis_realName);
        const isYAxisPercent = isPercentValue(options.yAxis_realName);
        const isTitleByPercent = isPercentValue(dataSourceDescription.objectTitle);
        const isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);

        var data =
            {
                // graphData contains all the data rows; used by the template to create the visualization
                graphData: {
                    data: documents,
                },
                docs: documents.length ? [1] : [], // For determining if there is any data in view
                meta: {
                    numberOfResults: documents.length,
                    pageSize: options.limit < nonpagedCount ? options.limit : nonpagedCount,
                    numPages: Math.ceil(nonpagedCount / options.limit),
                    nonpagedCount: nonpagedCount,
                    onPageNum: options.onPageNum,
                    resultsOffset: options.resultsOffset,
                    routePath_base: options.routePath_base,
                    filterObj: options.filterObj,
                    XAxisIsDate: isDate(dataSourceDescription, options.xAxis_realName),
                    YAxisIsDate: isDate(dataSourceDescription, options.yAxis_realName),
                    isXAxisPercent,
                    isYAxisPercent,
                    isAggregateByPercent,
                    isTitleByPercent,
                },
            };

        winston.info('Returning data');

        callback(err, data);
    });
};
