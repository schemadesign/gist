const express = require('express');
const router = express.Router();

// Express middleware
const validate = require('../../../libs/middleware/views/validate').validate;
const ensureAuthorized = require('../../../libs/middleware/ensure-authorized').ensureAuthorized;
const puppeteerJSAuth = require('../../../libs/middleware/puppeteer-js-auth').puppeteerJSAuth;
const loadPreview = require('../../../libs/middleware/views/load-preview').loadPreview;
const addSourceKey = require('../../../libs/middleware/views/add-source-key').addSourceKey;
const addCdn = require('../../../libs/middleware/views/add-cdn').addCdn;
const addRevision = require('../../../libs/middleware/views/add-revision').addRevision;
const addMeta = require('../../../libs/middleware/views/add-meta').addMeta;
const exists = require('../../../libs/middleware/views/exists').exists;
const addUser = require('../../../libs/middleware/views/add-user').addUser;
const addSourceAndSample = require('../../../libs/middleware/views/add-source-and-sample').addSourceAndSample;
const addGroupBy = require('../../../libs/middleware/views/add-group-by').addGroupBy;
const addChartBy = require('../../../libs/middleware/views/add-chart-by').addChartBy;
const addSegmentByBy = require('../../../libs/middleware/views/add-segment-by').addSegmentByBy;
const addAggregateBy = require('../../../libs/middleware/views/add-aggregate-by').addAggregateBy;
const addAxes = require('../../../libs/middleware/views/add-axes').addAxes;
const addRadius = require('../../../libs/middleware/views/add-radius').addRadius;
const addSortBy = require('../../../libs/middleware/views/add-sort-by').addSortBy;
const addStackBy = require('../../../libs/middleware/views/add-stack-by').addStackBy;
const addMapBy = require('../../../libs/middleware/views/add-map-by').addMapBy;
const { addGroupSize } = require('../../../libs/middleware/views/add-group-size');
const addSecondaryCol = require('../../../libs/middleware/views/add-secondary-col').addSecondaryCol;
const addFilter = require('../../../libs/middleware/views/add-filter').addFilter;
const addColFilter = require('../../../libs/middleware/views/add-col-filter').addColFilter;
const addSearch = require('../../../libs/middleware/views/add-search').addSearch;
const addPagination = require('../../../libs/middleware/views/add-pagination').addPagination;
const addImageMeta = require('../../../libs/middleware/views/add-image-meta').addImageMeta;
const addRoutePathBase = require('../../../libs/middleware/views/add-route-path-base').addRoutePathBase;
const addLines = require('../../../libs/middleware/views/add-lines').addLines;
const addBarsAndType = require('../../../libs/middleware/views/add-bars-and-types').addBarsAndType;
const addAreas = require('../../../libs/middleware/views/add-areas').addAreas;
const addPies = require('../../../libs/middleware/views/add-pies').addPies;
const addAnnotations = require('../../../libs/middleware/views/add-annotations').addAnnotations;
const addUnits = require('../../../libs/middleware/views/add-units').addUnits;
const addTimeValue = require('../../../libs/middleware/views/add-time-value').addTimeValue;
const { objectDetailMiddlewareHead, addPaginatedMiddlewares, objectDetailMiddlewareTail } = require('../../views');
const { addObjectDetailsPagination } = require('../../../libs/middleware/views/add-object-details-pagination');
const { addDataPrepOptions } = require('../../../libs/middleware/views/add-data-prep-options');

const middlewares = [
    objectDetailMiddlewareHead,
    addPaginatedMiddlewares,
    objectDetailMiddlewareTail,
    addDataPrepOptions,
    addObjectDetailsPagination,
];

router.use('/datasources/:source_key/views/object-details/', middlewares);
router.use('/datasources/:source_key/views/object-details/', require('./views/object-details.js'));

// middleware for all single datasource single view routes
router.use('/datasources/:source_key/views/:view_type', [
    validate,
    addSourceKey,
    addCdn,
    addRevision,
    addUser,
    puppeteerJSAuth,
    ensureAuthorized,
    addMeta(),
    loadPreview,
    exists,
    addFilter,
    addColFilter,
    addSourceAndSample,
    addSortBy,
    addGroupBy,
    addChartBy,
    addSegmentByBy,
    addAggregateBy,
    addAxes,
    addRadius,
    addStackBy,
    addMapBy,
    addGroupSize,
    addSecondaryCol,
    addSearch,
    addPagination,
    addImageMeta,
    addRoutePathBase,
    addLines,
    addBarsAndType,
    addAreas,
    addPies,
    addAnnotations,
    addUnits,
    addTimeValue
]);

// Individual visualizations' routers/routes
router.use('/datasources/:source_key/views/line-graph/', require('./views/line-chart.js'));
router.use('/datasources/:source_key/views/gallery/', require('./views/gallery.js'));
router.use('/datasources/:source_key/views/bar-chart/', require('./views/bar-chart.js'));
router.use('/datasources/:source_key/views/area-chart/', require('./views/area-chart.js'));
router.use('/datasources/:source_key/views/pie-chart/', require('./views/pie-chart.js'));
router.use('/datasources/:source_key/views/pie-set/', require('./views/pie-set.js'));
router.use('/datasources/:source_key/views/scatterplot/', require('./views/scatterplot.js'));
router.use('/datasources/:source_key/views/map/', require('./views/map.js'));
router.use('/datasources/:source_key/views/treemap/', require('./views/treemap.js'));
router.use('/datasources/:source_key/views/regional-map/', require('./views/regional-map.js'));
router.use('/datasources/:source_key/views/bubble-chart/', require('./views/bubble-chart.js'));
router.use('/datasources/:source_key/views/table/', require('./views/table.js'));
router.use('/datasources/:source_key/views/timeline/', require('./views/timeline.js'));
router.use('/datasources/:source_key/views/grouped-gallery/', require('./views/timeline.js'));
router.use('/datasources/:source_key/views/word-cloud/', require('./views/word-cloud.js'));
router.use('/datasources/:source_key/views/globe/', require('./views/globe.js'));

module.exports = router;
