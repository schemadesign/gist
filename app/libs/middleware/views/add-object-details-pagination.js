const winston = require('winston');
const { isNil } = require('lodash');

const {
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_TIMELINE,
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
    VIEW_TYPE_MAP,
    VIEW_TYPE_GLOBE,
    VIEW_TYPE_REGIONAL_MAP,
} = require('../../../config/views.config');
const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../models/processed_row_objects');
const { getProject } = require('../../../controllers/client/data_preparation/data_prep_helpers/project.helpers');
const { getSort } = require('../../../controllers/client/data_preparation/data_prep_helpers/sort.helpers');
const { getMatch } = require('../../../controllers/client/data_preparation/data_prep_helpers/match.helpers');
const {
    addDefaultAggregationOperators,
    aggregateProcessedRowObjects,
} = require('../../../controllers/client/data_preparation/data_prep_helpers/aggregation.helpers');

module.exports = { addObjectDetailsPagination };

const temporarilyPaginatedViews = [
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_TIMELINE,
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
    VIEW_TYPE_MAP,
    VIEW_TYPE_GLOBE,
    VIEW_TYPE_REGIONAL_MAP,
];

async function addObjectDetailsPagination(req, res, next) {
    const { dataSource, dataPrepOptions: options, viewType, query: { objectIndex } } = req;

    if (isNil(objectIndex) || !temporarilyPaginatedViews.includes(viewType)) {
        return next();
    }

    const parsedObjectIndex = Number.parseInt(objectIndex) || 0;
    const skip = Math.max(0, parsedObjectIndex - 1);
    const limit = 3;

    const { Model: processedRowObjectsModel } = Lazy_Shared_ProcessedRowObject_MongooseContext(dataSource._id);
    const aggregationOperators = addDefaultAggregationOperators(dataSource, options);
    const additionalProjects = getProject(viewType, dataSource, options);
    const preProjects = {
        $project: {
            _id: 1,
            ...additionalProjects,
        },
    };

    const postProjects = {
        $project: {
            id: '$_id',
            title: `$rowParams.${dataSource.objectTitle}`,
        },
    };
    const sort = getSort(viewType, dataSource, options);
    const match = getMatch(viewType, dataSource, options);
    const pagedAggregationOperators = aggregationOperators.concat([
        preProjects,
        { $match: match },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        postProjects,
    ]);
    const docs = await aggregateProcessedRowObjects(processedRowObjectsModel, pagedAggregationOperators);

    req.objectDetailsPagination = parsedObjectIndex === 0 ? { next: docs[1] } : { prev: docs[0], next: docs[2] };
    req.objectIndex = parsedObjectIndex;

    winston.debug('Added object details pagination');
    next();
}
