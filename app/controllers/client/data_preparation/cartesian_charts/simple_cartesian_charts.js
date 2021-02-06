const winston = require('winston');
const async = require('async');

const processed_row_objects = require('../../../../models/processed_row_objects');
const func = require('../../func');
const colorPalette = require('../../colorPalette');
const aggOperatorsHelpers = require('../data_prep_helpers/filters_aggregation_helpers');

module.exports.BindData = (dataSourceDescription, options, viewType, callback) => {
    // Add in the mongoose model here
    const baseQuery = cb => {
        // Get the Mongoose model based on the dataSourceDescription id
        const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
        const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

        const args = {
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

    const performQuery = (args, cb) => {
        // Perform the query with aggregation operators
        if (args.aggregationOperators.length > 0) {
            args.processedRowObjects_mongooseModel.aggregate(args.aggregationOperators)
                .exec(cb);
        } else {
            const fields = viewType === 'areaChart' ? options.areas : options.lines;

            args.processedRowObjects_mongooseModel.aggregate([
                {
                    $project: {
                        [`rowParams.${options.groupBy_realColumnName}`]: 1,
                        ...fields.reduce((prev, { realName }) => ({
                            ...prev,
                            [`rowParams.${realName}`]: 1,
                        }), {}),
                    },
                }])
                .exec(cb);
        }
    };

    const makeGraphData = (docs, cb) => {
        // Temp multigrouped data
        const humanReadableFields = [];
        const multiGroupedData = [];
        // graphData is exported and used by template for chart generation
        const graphData = {};

        // Date Field param used to get x field value from row parameters
        const dateField = options.groupBy_realColumnName;
        const fields = viewType === 'areaChart' ? options.areas : options.lines;

        async.eachOf(fields || options.lines, (field, fieldIndex) => {
            let i = 0;
            const uniqueXAxisFields = {};

            humanReadableFields.push(field.humanReadable);
            multiGroupedData.push([]);

            async.each(docs, rowItem => {
                const dateFieldValue = rowItem.rowParams[dateField];
                const lineFieldValue = func.unitMultiplier(rowItem.rowParams[field.realName], options.units);

                if (!uniqueXAxisFields.hasOwnProperty(dateFieldValue)) {
                    uniqueXAxisFields[dateFieldValue] = i;

                    if (lineFieldValue !== null) {
                        multiGroupedData[fieldIndex].push({
                            x: dateFieldValue,
                            y: lineFieldValue,
                        });
                        i++;
                    }
                } else {
                    const dataAtIndex = uniqueXAxisFields[dateFieldValue];

                    if (multiGroupedData[fieldIndex][dataAtIndex]) {
                        multiGroupedData[fieldIndex][dataAtIndex].y += lineFieldValue;
                    }
                }
            });
        });

        async.eachOf(multiGroupedData, (groupedData, index) => {
            multiGroupedData[index] = groupedData.sort((a, b) => a.x - b.x);
        });

        graphData.data = multiGroupedData;
        graphData.labels = humanReadableFields;
        graphData.docs = docs;

        try {
            graphData.colors = colorPalette.processColors(graphData.labels, dataSourceDescription._team.colorPalette, dataSourceDescription.colorMapping);
        } catch (e) {
            winston.error(e);
        }

        cb(null, graphData);
    };

    async.waterfall([
        baseQuery,
        addSearchToQuery,
        addFiltersToQuery,
        performQuery,
        makeGraphData,
    ], (err, graphData) => {
        if (err) {
            winston.error('Error getting processed row objects for the dataset %s : %s', dataSourceDescription.title, err);
            callback(err);
        } else {
            const isPercentValue = (columnName) => func.isPercentOperation(dataSourceDescription, columnName);
            const meta = {
                isStackByPercent: isPercentValue(options.stackBy_realColumnName),
                isAggregateByPercent: isPercentValue(options.aggregateBy_realColumnName),
                isGroupByPercent: isPercentValue(options.groupBy_realColumnName),
            };
            const data = {
                title: dataSourceDescription.title,
                description: dataSourceDescription.description,
                graphData,
                docs: graphData.docs.length ? [1] : [],
                annotations: options.annotations,
                units: options.units,
                inputDateFormat: options.groupBy_inputFormat,
                meta,
            };

            callback(null, data);
        }
    });
};
