/* global arrays, d3, options */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Arrays Core view: Bubble Chart
 *
 * Customizations from base Bubble Chart class:
 *     - pagination
 */

$(document).ready(function() {
    var query = window.location.search;
    var apiRoute;
    const view = $('.gist-section');

    if (options.sharedPage) {
        apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/' + query;
    } else {
        apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/bubble-chart/graph-data' + query;
    }

    // ajax call with object
    $.get(apiRoute, function(data) {
        // no data
        if (data.meta.numberOfResults === 0) {
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

        // hide UI elements
        if (options.puppeteer) {
            view.find('.gist-legend').hide();
            view.find('.gist-controls').hide();
            view.removeClass('gist-legend-opened');
        }

        // single result
        if (data.meta.numberOfResults === 1) {
            arrays.showSingleResultModal();
        }

        const { isTitleByPercent, isXAxisPercent, isYAxisPercent, isRadiusPercent } = data.meta;
        const bubbleChart = new arrays.CoreBubbleChart()
            .init(data.graphData, {
                ...options,
                isTitleByPercent,
                isXAxisPercent,
                isYAxisPercent,
                isRadiusPercent,
            })
            .render('#bubble-chart');

        // TODO: any way to get rid of this?
        $('.gist-legend-open').on('click', function(e) {
            setTimeout(function() {
                bubbleChart.resize();
            }, 500);
        });
        $('.gist-legend-close').on('click', function(e) {
            setTimeout(function() {
                bubbleChart.resize();
            }, 500);
        });

        // screenshot callback
        if (typeof window.callPhantom === 'function') {
            setTimeout(function() {
                window.callPhantom('takeShot');
            }, 1000);
        }

        initScrollMagic(true);
    });
});
