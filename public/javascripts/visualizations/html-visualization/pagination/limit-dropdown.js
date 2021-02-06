/* global arrays, jQuery, nunjucks */

/**
 * External namespace for arrays classes
 * @external arrays
 */
const RESULT_TYPE = 'result';
const GROUP_TYPE = 'group';
const TYPES = [RESULT_TYPE, GROUP_TYPE];

const DEFAULT_RESULTS_LABELS = ['Result', 'Results'];

/**
 * Creates a new PaginationLimitDropdown
 * @param {Object} options
 * @constructor
 * @extends PaginationComponent
 */
arrays.PaginationLimitDropdown = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.PaginationComponent.call(this);
};

// Create a PaginationLimitDropdown.prototype object that inherits from PaginationComponent.prototype.
arrays.PaginationLimitDropdown.prototype = Object.create(arrays.PaginationComponent.prototype);

// Set the "constructor" property to refer to PaginationLimitDropdown
arrays.PaginationLimitDropdown.prototype.constructor = arrays.PaginationLimitDropdown;

/**
 * Renders a PaginationLimitDropdown
 * @private
 */
arrays.PaginationLimitDropdown.prototype._render = function () {
    this._wrapper.html('');

    const meta = this._meta;
    const {
        resultsLabels = DEFAULT_RESULTS_LABELS,
        ...options
    } = this._options;

    // TODO: routePath_base is coming through with a query string (e.g. /path?revision=2)
    //  but the constructedRoutePath function doesn't currently reconcile existing query params
    //  and new query params passed in the third argument, so it will duplicate them
    //  (e.g. /path?revision=2&foo=bar&revision=2) which messes up subsequent constructed urls.
    //  Need to update constructedRoutePath in HTMLVisualization and in node-land so we don't
    //  need to strip off the querystring here.
    var routePath_base = meta.routePath_base.split('?')[0];

    var basePath = arrays.constructedRoutePath(routePath_base, meta.filterObj, options);
    var limit = options.limit ? options.limit : undefined;
    if (limit > meta.nonpagedCount) {
        limit = meta.nonpagedCount;
    }
    var pageRanges = meta.pageRanges;
    const numberOfResults = arrays.displayNumberWithComma(meta.nonpagedCount);
    const [singleResult, multipleResults] = resultsLabels;

    const type = resultsLabels[0].toLowerCase();
    const isDefinedType = TYPES.includes(type);

    document.l10n.formatValues(
        [`limit-dropdown-${type}`, {numberOfResults}],
    ).then(([translatedTailText]) => {
        let getTailText;

        if (isDefinedType) {
            getTailText = () => translatedTailText;
        } else {
            getTailText = _.cond([
                [arrays.equals(0), _.constant(`0 ${multipleResults}`)],
                [arrays.equals(1), _.constant(`of 1 ${singleResult}`)],
                [_.stubTrue, _.constant(`of ${numberOfResults} ${multipleResults}`)],
            ]);
        }

        const html = nunjucks.render('views/partials/pagination-limit-dropdown.njk', {
            basePath: basePath,
            limit: limit,
            pageRanges: pageRanges,
            tailText: getTailText(meta.nonpagedCount),
        });

        this._wrapper.append(html);
    });
};
