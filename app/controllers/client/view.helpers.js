const { cond, constant, get, stubFalse, stubTrue, kebabCase, camelCase } = require('lodash');

const {
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_MAP,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
    VIEW_TYPE_TIMELINE,
} = require('../../config/views.config');

module.exports = { determineClickThroughView };

/**
 * @param {String} currentView
 * @param {Object} viewSettings
 * @returns {String|null}
 */
function determineClickThroughView(currentView, viewSettings) {
    const checkVisibility = viewType => () => get(viewSettings, [viewType, 'visible']);
    const checkView = viewType => viewType === currentView ? stubFalse : checkVisibility(camelCase(viewType));
    const kebabCaseConstant = viewType => constant(kebabCase(viewType));

    return cond([
        [checkView(VIEW_TYPE_GALLERY), kebabCaseConstant(VIEW_TYPE_GALLERY)],
        [checkView(VIEW_TYPE_TIMELINE), kebabCaseConstant(VIEW_TYPE_TIMELINE)],
        [checkView(VIEW_TYPE_SCATTERPLOT), kebabCaseConstant(VIEW_TYPE_SCATTERPLOT)],
        [checkView(VIEW_TYPE_MAP), kebabCaseConstant(VIEW_TYPE_MAP)],
        [checkView(VIEW_TYPE_BUBBLE_CHART), kebabCaseConstant(VIEW_TYPE_BUBBLE_CHART)],
        [checkView(VIEW_TYPE_TABLE), kebabCaseConstant(VIEW_TYPE_TABLE)],
        [stubTrue, constant(currentView)],
    ])();
}
