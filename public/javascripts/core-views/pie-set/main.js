/* global arrays, d3, options, initScrollMagic */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Arrays Core view: Pie Set
 *
 * Customizations from base PieSet class:
 *     -
 */

$(document).ready(function () {

    var query = window.location.search;
    var apiRoute;

    if (options.sharedPage) {
        apiRoute = '/json-api/v1/sharedpages/' + options.sharedPageId + '/' + query;
    } else {
        apiRoute = '/json-api/v1/datasources/' + options.array_source_key + '/views/pie-set/graph-data' + query;
    }

    // ajax call with object
    $.get(apiRoute, function (data) {
        // no data
        if (data.docs.length === 0) {
            // hide loading template
            $('.gist-loading').hide();

            if (data.undisplayableData) {
                // show undisplayable-data template
                $('.gist-undisplayable-data').show();

                // show UI elements
                $('.gist-controls').show();
            } else {
                // show no-data template
                $('.gist-no-data').show();
            }

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
        if (options.accessibility) {
            $('.gist-accessibility-on').show();
            $('.gist-accessibility-off').hide();
        } else {
            $('.gist-accessibility-on').hide();
            $('.gist-accessibility-off').show();
        }

        // hide loading template
        $('.gist-loading').hide();

        $('.gist-toggle-accessibility').click(function () {
            handleClickEvent('accessibility');
            if (options.accessibility) {
                $('.gist-accessibility-on').show();
                $('.gist-accessibility-off').hide();
            } else {
                $('.gist-accessibility-on').hide();
                $('.gist-accessibility-off').show();
            }
        });

        // Set up window resize event handler.
        $(window).on('resize.gist-visualization.pie-set', function () {
            updateLegend();
        });

        var breakpointChange = arrays.isMobileBreakpoint();

        function getLegendListSelector() {
            return arrays.isMobileBreakpoint() ? '.gist-legend--mobile .gist-legend-list' : '.gist-legend--desktop .gist-legend-list';
        }

        function updateLegend() {
            var isMobileBreakpoint = arrays.isMobileBreakpoint();

            if (isMobileBreakpoint === breakpointChange) {
                return;
            }

            breakpointChange = isMobileBreakpoint;

            if (isMobileBreakpoint) {
                return $('.gist-legend--desktop .gist-legend-list-item').appendTo('.gist-legend--mobile .gist-legend-list');
            }

            return $('.gist-legend--mobile .gist-legend-list-item').appendTo('.gist-legend--desktop .gist-legend-list');
        }

        function handleClickEvent(option) {
            arrays.updateQuery(options, option, !options[option]);

            // main chart
            $('.pie-set-item').remove();
            pieSet = new arrays.PieSet().setDispatch(dispatch).init({
                data: data.docs,
                legendData: data.flatResults,
            }, options).render('#pie-set');

            colors = options.accessibility ? pieSet._colors : data.colors;
            // legend list
            $('.gist-legend-list-item').remove();
            legendList = new arrays.LegendList().setDispatch(dispatch).init({ data: data.flatResults }, options).setColors(colors).render(getLegendListSelector());
        }

        // single result
        if (data.docs.length === 1) {
            arrays.showSingleResultModal();
        }

        // Init scroll magic
        initScrollMagic();

        // shared d3 dispatch for sending events between pie chart and legend
        var dispatch = d3.dispatch('legendListItem_mouseenter', 'legendList_mouseout', 'legendListItem_click');

        if (!options.simpleChart) {
            if (options.viewOptions.viewControls) {
                const resultsLabels = ['Group', 'Groups'];
                const paginationLimitOptions = Object.assign({}, options, { resultsLabels });

                new arrays.PaginationLimitDropdown().init(data, paginationLimitOptions).render('.pagination-limit-dropdown');

                new arrays.PaginationPageDropdown().init(data, options).render('.pagination-page-dropdown');
            }

            new arrays.PaginationNav().init(data, options).render('.pie-set-pagination');
        }

        const { isChartByPercent, isAggregateByPercent, sum } = data.meta;
        // pie set
        var pieSet = new arrays.PieSet().setDispatch(dispatch).init({ data: data.docs, legendData: data.flatResults }, {
            ...options,
            isAggregateByPercent,
            isChartByPercent,
            sum,
            showPercentage: options.showPercentage,
        }).render('#pie-set');

        // legend list
        var colors = options.accessibility ? pieSet._colors : data.colors;
        var legendList = new arrays.LegendList().setDispatch(dispatch).init({ data: data.flatResults }, options).setColors(colors).render(getLegendListSelector());

        // when mouse enters legend item, highlight the appropriate slice
        dispatch.on('legendListItem_mouseenter', function (element, d, i) {
            pieSet.highlightSlice(d.label);
        });
        // when mouse exits legend as a whole, reset highlight
        dispatch.on('legendList_mouseout', function () {
            pieSet.resetHighlight();
        });
        // when legend list item is clicked, apply filter
        dispatch.on('legendListItem_click', function (element, d, i) {
            pieSet.clickLegendItem(element, d, i);
        });

        // screenshot callback
        if (typeof window.callPhantom === 'function') {
            window.callPhantom('takeShot');
        }
    });
});
