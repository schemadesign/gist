const winston = require('winston');
const express = require('express');
const ConnectSequence = require('connect-sequence');
const { isNil } = require('lodash');
const router = express.Router();

const slowDown = require('../utils/slowDown');

// Express middleware
const { validate } = require('../libs/middleware/views/validate');
const { ensureAuthorized } = require('../libs/middleware/ensure-authorized');
const { puppeteerJSAuth } = require('../libs/middleware/puppeteer-js-auth');
const { loadPreview } = require('../libs/middleware/views/load-preview');
const { addSourceKey } = require('../libs/middleware/views/add-source-key');
const { addCdn } = require('../libs/middleware/views/add-cdn');
const { addRevision } = require('../libs/middleware/views/add-revision');
const { addMeta } = require('../libs/middleware/views/add-meta');
const { exists } = require('../libs/middleware/views/exists');
const { addViewType } = require('../libs/middleware/views/add-view-type');
const { addUser } = require('../libs/middleware/views/add-user');
const { addSharedPage } = require('../libs/middleware/views/add-shared-page');
const { addSourceAndSample } = require('../libs/middleware/views/add-source-and-sample');
const { addStories } = require('../libs/middleware/views/add-stories');
const { addGroupBy } = require('../libs/middleware/views/add-group-by');
const { addChartBy } = require('../libs/middleware/views/add-chart-by');
const { addSegmentByBy } = require('../libs/middleware/views/add-segment-by');
const { addAggregateBy } = require('../libs/middleware/views/add-aggregate-by');
const { addAxes } = require('../libs/middleware/views/add-axes');
const { addRadius } = require('../libs/middleware/views/add-radius');
const { addSortBy } = require('../libs/middleware/views/add-sort-by');
const { addStackBy } = require('../libs/middleware/views/add-stack-by');
const { addMapBy } = require('../libs/middleware/views/add-map-by');
const { addGroupSize } = require('../libs/middleware/views/add-group-size');
const { addSecondaryCol } = require('../libs/middleware/views/add-secondary-col');
const { addFilter } = require('../libs/middleware/views/add-filter');
const { addColFilter } = require('../libs/middleware/views/add-col-filter');
const { addSearch } = require('../libs/middleware/views/add-search');
const { addPagination } = require('../libs/middleware/views/add-pagination');
const { addImageMeta } = require('../libs/middleware/views/add-image-meta');
const { addRoutePathBase } = require('../libs/middleware/views/add-route-path-base');
const { addBarsAndType } = require('../libs/middleware/views/add-bars-and-types');
const { addTimeValue } = require('../libs/middleware/views/add-time-value');
const { render: renderView } = require('../libs/middleware/views/render');
const { render: renderObjectDetails } = require('../libs/middleware/object-details/render');
const { addAreas } = require('../libs/middleware/views/add-areas');
const { addLines } = require('../libs/middleware/views/add-lines');
const { addPies } = require('../libs/middleware/views/add-pies');
const { addClickThroughView } = require('../libs/middleware/views/add-click-through-view');
const { addInstanceId } = require('../libs/middleware/views/add-instance-id');
const { addObjectDetailsPagination } = require('../libs/middleware/views/add-object-details-pagination');
const { addDataPrepOptions } = require('../libs/middleware/views/add-data-prep-options');

// Models
const View = require('../models/views');
const { VIEW_TYPE_GROUPED_GALLERY } = require('../config/views.config');

// Set up route handling for all built in views
// Refactored routes: initial page render - does NOT include graph data //
const middlewareHead = [
    addSharedPage,
    validate,
    addSourceKey,
    addCdn,
    addRevision,
    addUser,
    puppeteerJSAuth,
    ensureAuthorized,
];
const middlewareTail = [
    loadPreview,
    exists,
    addFilter,
    addColFilter,
    addSourceAndSample,
    addStories,
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
    addBarsAndType,
    addTimeValue,
    addAreas,
    addLines,
    addPies,
    addClickThroughView,
    addInstanceId,
    renderView,
];

const objectDetailMiddlewareHead = [
    addSharedPage,
    validate,
    addSourceKey,
    addRevision,
    addUser,
    ensureAuthorized,
    loadPreview,
];

const objectDetailMiddlewarePaginated = [
    addViewType,
    addMeta(),
    exists,
    addFilter,
    addColFilter,
    addSourceAndSample,
    addStories,
    addSortBy,
    addGroupBy,
    addChartBy,
    addAggregateBy,
    addAxes,
    addRadius,
    addStackBy,
    addMapBy,
    addGroupSize,
    addSecondaryCol,
    addSearch,
    addDataPrepOptions,
    addObjectDetailsPagination,
];

const objectDetailMiddlewareTail = [
    addRoutePathBase,
    renderObjectDetails,
];

function addPaginatedMiddlewares(req, res, next) {
    const isPaginatedSet = ({ query: { objectIndex } }) => !isNil(objectIndex);

    new ConnectSequence(req, res, next).appendIf(isPaginatedSet, ...objectDetailMiddlewarePaginated).run();
}

View.getAllBuiltInViews(function (err, defaultViews) {
    if (err) {
        winston.error('Error getting default views to bind for routes: ', err);
    } else {
        const slowAfterReloads = 15;
        const windowTime = 60 * 1000;

        defaultViews.push({ name: VIEW_TYPE_GROUPED_GALLERY });
        // views
        defaultViews.forEach(function (view) {
            router.get('/:source_key/' + view.name, slowDown(slowAfterReloads, windowTime), middlewareHead, addMeta(view), middlewareTail);
        });
        // object detail
        router.get('/:source_key/:object_id', slowDown(slowAfterReloads, windowTime), objectDetailMiddlewareHead, addPaginatedMiddlewares, objectDetailMiddlewareTail);
        // viz with no view specified
        router.get('/:source_key', slowDown(slowAfterReloads, windowTime), middlewareHead, addMeta());
    }
});

module.exports = {
    router,
    objectDetailMiddlewareHead,
    addPaginatedMiddlewares,
    objectDetailMiddlewareTail,
};
