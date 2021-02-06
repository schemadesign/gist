((arrays, $, d3, _) => {
    Object.assign(arrays, {
        initAreaChart,
    });

    /**
     * Gist Core view: Area Chart
     *
     * Customizations from base AreaChart class:
     *     - custom sizing of container
     *     - two area charts rendered, the second one with a brush for navigating a subset of the data
     */
    function initAreaChart(options) {
        $(document).ready(function() {
            const view = $(options.viewSelector);
            const loadingElement = view.find('.gist-loading');
            const controlsElement = view.find('.gist-controls');
            const noDataElement = view.find('.gist-no-data');
            const accessibilityOnElement = view.find('.gist-accessibility-on');
            const accessibilityOffElement = view.find('.gist-accessibility-off');
            const visualizationContainerElement = view.find('.gist-visualization-container');
            const toggleAccessibilityElement = view.find('.gist-toggle-accessibility');

            const monthsToQuarters = {
                11: '1Q',
                2: '2Q',
                5: '3Q',
                8: '4Q',
            };

            const formatDate = function(args) {
                let quarter;
                let year = args.date.getFullYear();
                if (args.isQuarter) {
                    const monthString = args.date.getMonth().toString();
                    if (monthString === '11') {
                        year++;
                    }
                    quarter = monthsToQuarters[monthString] + year.toString();
                } else {
                    quarter = (year + 1).toString();
                }
                return quarter;
            };

            const formatAreaGraphData = function(args) {
                _.each(args.data, function(dataObjects) {
                    if (args.isDate) {
                        _.forEach(dataObjects, function(xyCoordinates) {
                            let quarterDate = null;

                            if (_.isNumber(xyCoordinates.x)) {
                                xyCoordinates.y = new Date(xyCoordinates.y);
                                quarterDate = xyCoordinates.y;
                            } else {
                                xyCoordinates.x = new Date(xyCoordinates.x);
                                quarterDate = xyCoordinates.x;
                            }

                            if (xyCoordinates.y === '') {
                                xyCoordinates.y = 0;
                            }

                            if (xyCoordinates.x === '') {
                                xyCoordinates.x = 0;
                            }

                            xyCoordinates.quarter = formatDate({
                                isQuarter: args.isQuarter,
                                date: quarterDate,
                            });
                        });
                    }

                    dataObjects.sort(function(a, b) {
                        return a.x - b.x;
                    });
                });
            };

            const apiRoute = arrays.getApiRoute(options, '/views/area-chart/graph-data');

            if (options.accessibility) {
                accessibilityOnElement.show();
                accessibilityOffElement.hide();
            } else {
                accessibilityOnElement.hide();
                accessibilityOffElement.show();
            }

            const navRenderOptions = {
                xAxis: true,
                yAxis: false,
                xAxisTicks: true,
                yAxisTicks: false,
                mouseEvents: false,
                brush: true,
            };

            $.get(apiRoute, function(data) {
                if (!data.docs.length) {
                    loadingElement.hide();
                    noDataElement.show();
                    arrays.takeScreenshot();

                    return;
                }

                const dispatch = d3.dispatch('updateBrush');
                const $container = view.find('.gist-area-chart-container');
                const isQuarter = data.inputDateFormat.includes('Q');
                const isPreviewAndMobile = arrays.isPreviewAndMobile();

                function handleClickEvent(option) {
                    arrays.updateQuery(options, option, !options[option]);
                    visualizationContainerElement.remove();

                    const { viewSelector } = options;
                    const mainContainer = `${viewSelector} .gist-area-chart-main`;
                    const navContainer = `${viewSelector} .gist-area-chart-nav`;
                    const chartContainer = '.gist-visualization-container';

                    $(`${mainContainer} ${chartContainer}, ${navContainer} ${chartContainer}`).remove();

                    const areaChart = new arrays.CoreAreaChart()
                        .setDispatch(dispatch)
                        .init(data.graphData, options)
                        .setColors()
                        .render(mainContainer);

                    if (options.displayNavigationChart) {
                        new arrays.AreaChart()
                            .setDispatch(dispatch)
                            .setBrushTarget(areaChart)
                            .init(data.graphData, options)
                            .setColors()
                            .render(navContainer, navRenderOptions);
                    }
                }

                toggleAccessibilityElement.click(function() {
                    handleClickEvent('accessibility');
                    if (options.accessibility) {
                        accessibilityOnElement.show();
                        accessibilityOffElement.hide();
                    } else {
                        accessibilityOnElement.hide();
                        accessibilityOffElement.show();
                    }
                });

                formatAreaGraphData({
                    data: data.graphData.data,
                    isQuarter,
                    isDate: options.groupBy_isDate,
                });

                $.extend(true, options, {
                    annotations: data.annotations,
                    units: data.units,
                });

                loadingElement.hide();
                controlsElement.show();

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
                const areaChart = new arrays.CoreAreaChart()
                    .setDispatch(dispatch)
                    .init(data.graphData, extendedOptions)
                    .render(`${options.viewSelector} .gist-area-chart-main`);

                if (options.displayNavigationChart) {
                    options._margin = {
                        top: 15,
                        right: 15,
                        bottom: 30,
                        left: 7,
                    };
                    new arrays.AreaChart()
                        .setDispatch(dispatch)
                        .setBrushTarget(areaChart)
                        .init(data.graphData, extendedOptions)
                        .render(`${options.viewSelector} .gist-area-chart-nav`, navRenderOptions);
                }

                arrays.takeScreenshot();

                initScrollMagic();
            });
        });
    }
})(window.arrays, window.jQuery, window.d3, window._);
