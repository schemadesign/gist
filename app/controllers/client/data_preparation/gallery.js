const winston = require('winston');
const { get } = require('lodash');
const { VIEW_TYPE_GALLERY, GALLERY_STYLE_IMAGE } = require('../../../config/views.config');

const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../models/processed_row_objects');
const { calculateGalleryPageRanges } = require('../config');
const func = require('../func');
const { processDocs } = require('./data_prep_helpers/gallery.helpers');
const { getGallerySort } = require('./data_prep_helpers/sort.helpers');
const { getGalleryProject } = require('./data_prep_helpers/project.helpers');
const {
    addDefaultAggregationOperators,
    aggregateProcessedRowObjects,
} = require('./data_prep_helpers/aggregation.helpers');

module.exports = { bindData };

async function bindData(dataSource, options) {
    const { filterObj, limit, onPageNum, routePath_base, skipNResults } = options;
    const galleryViewSettings = dataSource.fe_views.views.gallery;
    const { galleryStyle } = galleryViewSettings;
    const { Model: processedRowObjects_mongooseModel } = Lazy_Shared_ProcessedRowObject_MongooseContext(dataSource._id);

    const wholeFilteredSetAggregationOperators = addDefaultAggregationOperators(dataSource, options);

    const groupQuery = {
        $group: {
            _id: null,
            count: { $sum: 1 },
        },
    };

    winston.debug('Getting nonPagedCount');

    const countWholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat([groupQuery]);
    const nonPagedResults = await aggregateProcessedRowObjects(processedRowObjects_mongooseModel, countWholeFilteredSetAggregationOperators);
    const nonPagedCount = get(nonPagedResults, [0, 'count'], 0);

    winston.debug('Found %i non-paged docs', nonPagedCount);

    const sort = getGallerySort(dataSource, options);
    const additionalProject = getGalleryProject(dataSource, options);
    const project = {
        _id: 1,
        pKey: 1,
        srcDocPKey: 1,
        ...additionalProject,
    };

    const pagedDocs_aggregationOperators = wholeFilteredSetAggregationOperators.concat([
        { $project: project },
        { $sort: sort },
        { $skip: skipNResults },
        { $limit: limit },
    ]);

    winston.debug('Getting paged docs');

    const docs = await aggregateProcessedRowObjects(processedRowObjects_mongooseModel, pagedDocs_aggregationOperators);
    const processedResults = processDocs(docs, dataSource, VIEW_TYPE_GALLERY, galleryViewSettings, options);

    const pageRanges = calculateGalleryPageRanges(nonPagedCount);
    const { fe_image } = dataSource;
    const hasImages = galleryStyle === GALLERY_STYLE_IMAGE && fe_image.gallery && fe_image.field.length;

    winston.debug('Returning %i docs', processedResults.length);

    const data = {
        data: processedResults,
        included: {
            dataSource: dataSource,
        },
        meta: {
            numberOfResults: processedResults.length,
            numPages: Math.ceil(nonPagedCount / limit),
            nonpagedCount: nonPagedCount,
            pageRanges,
            onPageNum,
            routePath_base,
            filterObj,
            hasImages,
        },
    };

    winston.debug('Done preparing data for gallery');

    return data;
}
