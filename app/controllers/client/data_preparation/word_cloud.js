const { isEmpty, isNil, maxBy, minBy } = require('lodash');

const processed_row_objects = require('../../../models/processed_row_objects');
const { constructedRoutePath } = require('../../../../shared/url');
const keywordsHelpers = require('../../../controllers/api/dataset/keywords-helpers');
const { addDefaultAggregationOperators } = require('./data_prep_helpers/aggregation.helpers');
const { determineClickThroughView } = require('../view.helpers');
const { VIEW_TYPE_WORD_CLOUD } = require('../../../config/views.config');

module.exports.bindData = async (dataSourceDescription, sampleDoc, options) => {

    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const aggregationOperators = addDefaultAggregationOperators(dataSourceDescription, options);
    const field = dataSourceDescription.fe_views.views.wordCloud.defaultGroupByColumnName;

    aggregationOperators.push({ $project: { field: `$rowParams.${field}` } });

    const docs = await processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec();
    const selectedKeywords = dataSourceDescription.fe_views.views.wordCloud.keywords;
    const sortedKeywords = keywordsHelpers.processKeywords(docs, field, dataSourceDescription);
    const groupedResults = sortedKeywords.filter(keyword => selectedKeywords.includes(keyword.word));

    const clickThroughView = determineClickThroughView(VIEW_TYPE_WORD_CLOUD, dataSourceDescription.fe_views.views);

    if (!isNil(clickThroughView)) {
        // calculate urlForFilterValue (link to filtered unit flow view)
        groupedResults.forEach(function (result) {
            const filterUrl = `/${dataSourceDescription.uid}/${determineClickThroughView(VIEW_TYPE_WORD_CLOUD, dataSourceDescription.fe_views.views)}`;
            result.urlForFilterValue = constructedRoutePath(filterUrl, options.filterObj, {
                embed: options.embedded,
                preview: options.isPreview,
                searchCol: options.defaultGroupByColumnName_humanReadable,
                searchQ: result.word,
                sortBy: options.sortBy_realColumnName,
                sortDirection: options.sortDirection,
            });
        });
    }

    if (isEmpty(groupedResults)) {
        return {
            data: [],
            meta: {
                hasKeywords: !isEmpty(selectedKeywords),
            },
        };
    }

    const minCount = minBy(groupedResults, 'count').count;
    const maxCount = maxBy(groupedResults, 'count').count;

    return {
        data: groupedResults,
        included: {
            dataSource: dataSourceDescription,
        },
        meta: {
            numberOfResults: groupedResults.length,
            minCount,
            maxCount,
        },
    };
};
