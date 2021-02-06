const winston = require('winston');
const express = require('express');
const ConnectSequence = require('connect-sequence');
const { isNil } = require('lodash');
const router = express.Router();
const slowDown = require('../utils/slowDown');

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

const objectDetailMiddlewareHead = [
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

    new ConnectSequence(req, res, next)
        .appendIf(isPaginatedSet, ...objectDetailMiddlewarePaginated)
        .run();
}

// object detail route that was reached via a shared arrays core view
// e.g. if you open a shared gallery view and click one of the objects
router.get('/:shared_page_id/:object_id', [
    addSharedPage,
], objectDetailMiddlewareHead, addPaginatedMiddlewares, objectDetailMiddlewareTail);

// shared arrays core view OR directly shared object details
// At this point we know the pageType (array_view or object_details)
// and will use a different render middleware based on which one it is

// array_view shared page
router.get('/:shared_page_id/', [
    addSharedPage,
    function (req, res, next) {
        if (req.sharedPage.doc.pageType === 'object_details') {
            // pass control to the next route (skip the rest of the stack)
            winston.info('object details page, skipping first middleware stack');
            next('route');
        } else {
            next();
        }
    },
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
]);

// object_details shared page
const slowAfterReloads = 15;
const windowTime = 1 * 60 * 1000; //1 minute
router.get('/:shared_page_id/', slowDown(slowAfterReloads, windowTime), objectDetailMiddlewareHead, addPaginatedMiddlewares, objectDetailMiddlewareTail);

module.exports = router;
