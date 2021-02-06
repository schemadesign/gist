((arrays, $, d3) => {
    Object.assign(arrays, {
        initLineChart,
    });

    /**
     * Gist Core view: Bar Chart
     */
    function initLineChart(options) {
        /**
         * Arrays Core view: Line Chart
         *
         * Customizations from base LineChart class:
         *     - custom sizing of container
         *     - two line charts rendered, the second one with a brush for navigating a subset of the data
         */
        $(document).ready(function() {
            const view = $(options.viewSelector);
            const apiRoute = arrays.getApiRoute(options, '/views/line-graph/graph-data');

            // ajax call with object
            $.get(apiRoute, function(data) {
                // no data
                if (data.docs.length === 0) {
                    // hide loading template
                    view.find('.gist-loading').hide();

                    if (data.undisplayableData) {
                        // show undisplayable-data template
                        view.find('.gist-undisplayable-data').show();
                    } else {
                        // hide UI elements
                        view.find('.gist-controls').hide();

                        // show no-data template
                        view.find('.gist-no-data').show();
                    }

                    // screenshot callback
                    arrays.takeScreenshot();

                    // skip rendering the visualization
                    return;
                }

                // Augment options
                $.extend(true, options, {
                    annotations: data.annotations,
                    units: data.units,
                });

                if (options.accessibility) {
                    view.find('.gist-accessibility-on').show();
                    view.find('.gist-accessibility-off').hide();
                } else {
                    view.find('.gist-accessibility-on').hide();
                    view.find('.gist-accessibility-off').show();
                }

                view.find('.gist-toggle-accessibility').click(function() {
                    handleClickEvent('accessibility');
                    if (options.accessibility) {
                        view.find('.gist-accessibility-on').show();
                        view.find('.gist-accessibility-off').hide();
                    } else {
                        view.find('.gist-accessibility-on').hide();
                        view.find('.gist-accessibility-off').show();
                    }
                });

                // nav chart with brush
                var navRenderOptions = {
                    xAxis: true,
                    yAxis: false,
                    xAxisTicks: true,
                    yAxisTicks: false,
                    mouseEvents: false,
                    brush: true,
                };

                // shared d3 dispatch for sending events between nav chart and main chart
                var dispatch = d3.dispatch('updateBrush');

                function handleClickEvent(option) {
                    arrays.updateQuery(options, option, !options[option]);

                    // main chart
                    view.find('.gist-visualization-container').remove();
                    const lineChart = new arrays.CoreLineChart()
                        .setDispatch(dispatch)
                        .init(data.graphData, options)
                        .render(`${options.viewSelector} .gist-line-chart-main`);

                    if (options.displayNavigationChart) {
                        new arrays.LineChart()
                            .setDispatch(dispatch)
                            .setBrushTarget(lineChart)
                            .init(data.graphData, options)
                            .render(`${options.viewSelector} .gist-line-chart-nav`, navRenderOptions);
                    }
                }

                // hide loading template
                view.find('.gist-loading').hide();

                // Change chart's container height on resize.
                const $container = view.find('.gist-line-chart-container');
                const isPreviewAndMobile = arrays.isPreviewAndMobile();
                const setContainerHeight = function() {
                    const minHeight = arrays.constants.MIN_CHART_HEIGHT;
                    let height;

                    if (options.isExternalAccess) {
                        const parentHeight = view.parent().css('height');

                        height = parentHeight ? parseInt(parentHeight, 10) : minHeight;
                    } else {
                        const $filterTags = $('.gist-filter-tag');
                        const bottom = $filterTags.length === 0 ? window.innerHeight - 20 : $filterTags.offset().top;

                        height = bottom - $container.offset().top;
                    }

                    if (isPreviewAndMobile) {
                        height = Math.min(height, arrays.getIframeHeight());
                    }

                    $container.css('height', Math.max(minHeight, height));
                };

                $(window).resize(setContainerHeight);
                setContainerHeight();

                const extendedOptions = {
                    ...options,
                    ...data.meta,
                };
                const lineChart = new arrays.CoreLineChart()
                    .setDispatch(dispatch)
                    .init(data.graphData, extendedOptions)
                    .render(`${options.viewSelector} .gist-line-chart-main`);

                if (options.displayNavigationChart) {
                    // override default line chart margin
                    options._margin = {
                        top: 15,
                        right: 15,
                        bottom: 30,
                        left: 7,
                    };
                    // remove annotations for nav
                    delete options.annotations;

                    new arrays.LineChart()
                        .setDispatch(dispatch)
                        .setBrushTarget(lineChart)
                        .init(data.graphData, extendedOptions)
                        .render(`${options.viewSelector} .gist-line-chart-nav`, navRenderOptions);
                }

                // screenshot callback
                arrays.takeScreenshot();
                initScrollMagic(true);
            });
        });
    }
})(window.arrays, window.jQuery, window.d3);
