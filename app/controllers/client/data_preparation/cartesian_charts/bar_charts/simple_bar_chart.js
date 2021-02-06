const winston = require('winston');
const async = require('async');
const { get } = require('lodash');

const func = require('../../../func');
const processed_row_objects = require('../../../../../models/processed_row_objects');
const colorPalette = require('../../../colorPalette');
const aggOperatorsHelpers = require('../../data_prep_helpers/filters_aggregation_helpers');

module.exports.BindData = (dataSourceDescription, options, callback) => {
    const meta = {
        onPageNum: options.onPageNum,
        routePath_base: options.routePath_base,
        filterObj: options.filterObj,
    };
    const constructBaseQuery = cb => {
        const group = {
            $group: {
                _id: {
                    groupBy: '$rowParams.' + options.groupBy_realColumnName,
                },
            },
        };

        const project = {
            $project: {
                _id: 0,
                category: '$_id.groupBy',
            },
        };
        // Get the Mongoose model based on the dataSourceDescription id
        const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
        const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

        const args = {
            group: group,
            project: project,
            aggregationOperators: [],
            processedRowObjects_mongooseModel: processedRowObjects_mongooseModel,
        };
        cb(null, args);
    };

    const addSearchToQuery = (args, cb) => {
        // Use the aggregation operators helpers to add the search operators to the query
        try {
            args.aggregationOperators = aggOperatorsHelpers.addSearchToQuery(dataSourceDescription, options, args.aggregationOperators);
        } catch (e) {
            winston.warn('Search was requested, but came across an error: ' + e.message);
        }
        cb(null, args);
    };

    const addFiltersToQuery = (args, cb) => {
        // Use the aggregation operators helpers to add filter operators to the query
        try {
            args.aggregationOperators = aggOperatorsHelpers.addFiltersToQuery(dataSourceDescription, options, args.aggregationOperators);
        } catch (e) {
            winston.warn('Filters were requested, but came across an error: ' + e.message);
        }
        cb(null, args);
    };

    const appendBarsToQuery = (args, cb) => {
        async.each(options.bars, (bar, next) => {
            args.group.$group[bar.realName + '_value'] = { $sum: '$rowParams.' + bar.realName };
            args.project.$project[bar.realName + '_value'] = 1;

            next();

        }, () => {
            // Concat the group and project arguments & call the callback
            args.aggregationOperators = args.aggregationOperators.concat([args.group, args.project, { $sort: { category: 1 } }]);
            cb(null, args);
        });
    };

    const performQuery = async (args, cb) => {
        const data = await args.processedRowObjects_mongooseModel
            .aggregate(args.aggregationOperators.concat([{ $count: 'count' }]));
        const nonpagedCount = get(data, '[0].count', 0);

        meta.nonpagedCount = nonpagedCount;
        meta.pageSize = options.limit < nonpagedCount ? options.limit : nonpagedCount;
        meta.numPages = Math.ceil(nonpagedCount / options.limit);

        const paginationAggregation = [
            { $skip: options.skipNResults },
            { $limit: options.limit },
        ];
        const docs = await args.processedRowObjects_mongooseModel.aggregate(args.aggregationOperators.concat(paginationAggregation));
        cb(null, docs);
    };

    const makeGraphData = (docs, cb) => {
        const multiGroupedData = [];
        const graphData = {};
        graphData.categories = [];
        graphData.type = options.type;
        graphData.labels = options.bars.map(bar => bar.humanReadable);
        graphData.fields = dataSourceDescription.raw_rowObjects_coercionScheme;

        async.eachOf(docs, (doc, docIndex, nextDoc) => {
            multiGroupedData.push([]);
            const category = options.groupBy_isDate ?
                func.formatCoercedField(options.groupBy_realColumnName, doc.category, dataSourceDescription) :
                doc.category;
            graphData.categories.push(category);

            async.each(options.bars, (bar, nextBar) => {
                multiGroupedData[docIndex].push({
                    value: func.unitMultiplier(doc[bar.realName + '_value'], options.units),
                    label: bar.humanReadable,
                    category: category,
                });

                nextBar();
            }, () => nextDoc());
        }, () => {
            if (multiGroupedData.length > 1000) {
                winston.info('number of bars exceeds limit; discontinue data processing');
                return cb(null, null);
            }

            graphData.data = multiGroupedData;
            try {
                graphData.colors = colorPalette.processColors(graphData.labels, dataSourceDescription._team.colorPalette, dataSourceDescription.colorMapping);
            } catch (e) {
                winston.error('Process Color Error: ' + e);
            }
            cb(null, graphData);
        });
    };

    async.waterfall([
        constructBaseQuery,
        addSearchToQuery,
        addFiltersToQuery,
        appendBarsToQuery,
        performQuery,
        makeGraphData,
    ], (err, graphData) => {
        if (err) {
            winston.error('Error getting processed row objects for the dataset %s : ', dataSourceDescription.title, err);
            return callback(err);
        }

        if (!graphData) {
            return callback(null, { docs: [], undisplayableData: true });
        }

        meta.numberOfResults = graphData.data.length;

        var data = {
            title: dataSourceDescription.title,
            description: dataSourceDescription.description,
            graphData: graphData,
            docs: graphData.data.length ? [1] : [],
            numberOfResults: graphData.categories.length,
            annotations: options.annotations,
            units: options.units,
            inputDateFormat: options.groupBy_inputFormat,
            meta,
        };

        callback(err, data);
    });
};
