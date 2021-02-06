/* global arrays, d3, options */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Arrays Core view: Scatterplot
 *
 * Customizations from base Scatterplot class:
 *     - pagination
 */

$(document).ready(function () {
    var query = window.location.search;
    var apiRoute;

    if (options.sharedPage) {
        apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/' + query;
    } else {
        apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/scatterplot/graph-data' + query;
    }

    // ajax call with object
    $.get(apiRoute, function (data) {
        // no data
        if (data.docs.length === 0) {
            // hide loading template
            $('.gist-loading').hide();

            // show no-data template
            $('.gist-no-data').show();

            // screenshot callback
            if (typeof window.callPhantom === 'function') {
                window.callPhantom('takeShot');
            }

            // skip rendering the visualization
            return;
        }

        // hide loading template
        $('.gist-loading').hide();

        // show UI elements
        $('.gist-controls').show();

        // single result
        if (data.meta.numberOfResults === 1) {
            arrays.showSingleResultModal();
        }

        const { meta } = data;

        // filter count
        const getFilterCount = function (resultsOffset, nonpagedCount, numberOfResults) {
            const prefix = resultsOffset > 0 ? `${resultsOffset + 1} $ndash; ` : '';
            const count = (resultsOffset + numberOfResults).toLocaleString('en');
            const pageCount = nonpagedCount.toLocaleString('en');
            const resultText = nonpagedCount === 1 ? 'Result' : '<span data-l10n-id="results">Results</span>';

            return `${prefix}<span class="sort-criteria color-brand-hover">${count}</span> of ${pageCount} ${resultText}`;
        };

        $('.filter-count span').append(getFilterCount(meta.resultsOffset, meta.nonpagedCount, meta.numberOfResults));

        new arrays.PaginationNav().init(data, options).render('.gallery-pagination');

        const { isXAxisPercent, isYAxisPercent, isAggregateByPercent, isTitleByPercent, XAxisIsDate, YAxisIsDate } = meta;

        new arrays.CoreScatterplot().init(data.graphData, {
            ...options,
            isXAxisPercent,
            isYAxisPercent,
            isTitleByPercent,
            isAggregateByPercent,
            XAxisIsDate,
            YAxisIsDate,
        }).render('#scatterplot');

        // screenshot callback
        if (typeof window.callPhantom === 'function') {
            setTimeout(function () {
                window.callPhantom('takeShot');
            }, 1000);
        }
    });
});
