((arrays, $, d3) => {
    Object.assign(arrays, {
        initPieChart,
    });

    /**
     * Gist Core view: Pie Chart
     */
    function initPieChart(options) {
        function toggleAccessibility(view) {
            if (options.accessibility) {
                view.find('.gist-accessibility-on').show();
                view.find('.gist-accessibility-off').hide();
            } else {
                view.find('.gist-accessibility-on').hide();
                view.find('.gist-accessibility-off').show();
            }
        }

        $(document).ready(function() {
            let pieChart;
            const apiRoute = arrays.getApiRoute(options, '/views/pie-chart/graph-data');
            const view = $(options.viewSelector);

            toggleAccessibility(view);

            // hide UI elements
            if (options.puppeteer) {
                view.find('.gist-legend').hide();
                view.find('.gist-controls').hide();
                view.removeClass('gist-legend-opened');
            }

            // ajax call with object
            $.get(apiRoute, function(data) {
                // no data
                if (data.docs.length === 0) {
                    // hide loading template
                    view.find('.gist-loading').hide();

                    // show no-data template
                    view.find('.gist-no-data').show();

                    arrays.takeScreenshot();

                    // skip rendering the visualization
                    return;
                }

                // shared d3 dispatch for sending events between pie chart and legend
                const dispatch = d3.dispatch(
                    'legendListItem_mouseenter',
                    'legendList_mouseout',
                    'legendListItem_click'
                );

                const { isChartByPercent, isAggregateByPercent, sum } = data.meta;

                const renderPieChart = () =>
                    new arrays.PieChart()
                        .setDispatch(dispatch)
                        .init(data.graphData, {
                            ...options,
                            isAggregateByPercent,
                            isChartByPercent,
                            sum,
                            showPercentage: options.showPercentage,
                        })
                        .render(`${options.viewSelector} .gist-pie-chart-main`, {
                            innerRadius: 0.0,
                            outerRadius: 1.0,
                            useWindowResizeEvent: false,
                        });

                // hide loading template
                view.find('.gist-loading').hide();

                view.find('.gist-toggle-accessibility').click(function() {
                    handleClickEvent('accessibility');
                    toggleAccessibility(view);
                });

                function adjustChartSize() {
                    if (!options.isExternalAccess) {
                        return;
                    }

                    const visualization = view.find('.gist-visualization');
                    const parent = view.parents('.gist-component')[0];
                    const height = parent.style.height || arrays.constants.MIN_CHART_HEIGHT_EXTENDED;
                    const width = parent.style.width;

                    visualization.css('max-height', height);

                    if (width !== '') {
                        visualization.css('max-width', width);
                    }
                }

                function handleClickEvent(option) {
                    arrays.updateQuery(options, option, !options[option]);

                    // main chart
                    view.find('.gist-visualization-container').remove();
                    pieChart = renderPieChart();

                    // legend list
                    view.find('.gist-legend-list-item').remove();
                    legendList = new arrays.LegendList()
                        .setDispatch(dispatch)
                        .init(data.graphData, options)
                        .setColors(pieChart.getColors())
                        .render(`${options.viewSelector} .gist-legend-list`);
                }

                // single result
                if (data.graphData.data.length === 1) {
                    arrays.showSingleResultModal();
                }

                // main chart
                pieChart = renderPieChart();

                // legend list
                var legendList = new arrays.LegendList()
                    .setDispatch(dispatch)
                    .init(data.graphData, options)
                    .setColors(pieChart.getColors())
                    .render(`${options.viewSelector} .gist-legend-list`);

                // when mouse enters legend item, highlight the appropriate slice
                dispatch.on('legendListItem_mouseenter', function(element, d, i) {
                    pieChart.highlightSlice(i);
                });
                // when mouse exits legend as a whole, reset highlight
                dispatch.on('legendList_mouseout', function() {
                    pieChart.resetHighlight();
                });
                dispatch.on('legendListItem_click', function(element, d, i) {
                    pieChart.clickLegendItem(element, d, i);
                });

                arrays.takeScreenshot();

                arrays.addResizeEventListener(() => {
                    view.find('.gist-visualization-container').remove();
                    pieChart = renderPieChart();
                });

                adjustChartSize();

                /**
                 * Toggle legend
                 */
                view.find('.gist-legend-open').on('click', function(e) {
                    view.addClass('gist-legend-opened');
                });

                /**
                 * Close legend
                 */
                view.find('.gist-legend-close').on('click', function(e) {
                    view.removeClass('gist-legend-opened');
                });

                /**
                 * If the legend is closed when pressing the link to the legend
                 * Open it up!
                 */
                view.find('.gist-skip-to-legend').keydown(function(e) {
                    if (e.which === 13) {
                        view.addClass('gist-legend-opened');
                    }
                });

                initScrollMagic(true);
            });
        });
    }
})(window.arrays, window.jQuery, window.d3);
