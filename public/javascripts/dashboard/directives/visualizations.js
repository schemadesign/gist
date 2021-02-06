angular.module('arraysApp')
    .directive('aaVisualization', function() {
        // Supported types
        var classes = {
            linechart: 'LineChart',
            horizontalbarchart: 'HorizontalBarChart',
            piechart: 'PieChart',
        };

        var types = Object.keys(classes);

        var templateUrls = {
            linechart: 'templates/visualizations/line-chart.html',
            horizontalbarchart: 'templates/visualizations/bar-chart.html',
            piechart: 'templates/visualizations/pie-chart.html'
        };

        return {
            restrict: 'E',
            scope: {
                // TODO consolidate
                type: '@vizType',
                data: '=?vizData',
                options: '=?vizOptions',
                renderOptions: '=?vizRenderOptions',
                id: '@vizId'
            },
            link: function(scope) {

                scope.selector = '#' + scope.id;

                // Normalize chart type
                scope.type = scope.type.toLowerCase().replace(/-/g, '');

                // Verify type is supported
                if (types.indexOf(scope.type) === -1) {
                    console.log('Visualization of type \'' + scope.type + '\' not supported.');
                }

                scope.visualizationTemplateUrl = templateUrls[scope.type];

                // Set defaults
                scope.options = scope.options || {};
                scope.renderOptions = scope.renderOptions || {};

                var vizClass = classes[scope.type];

                scope.$on('arraysViz.load.' + scope.id, function() {
                    // Start loading animation
                    scope.loading = true;
                    scope.error = '';
                });

                if (scope.type === 'linechart') {
                    scope.dispatch = d3.dispatch('updateBrush');
                }

                var destroyChart;

                if (scope.type === 'linechart') {
                    destroyChart = function() {
                        angular.element(scope.selector).empty();
                        angular.element(scope.selector + '-nav').empty();
                    };
                } else {
                    // All other charts
                    destroyChart = function() {
                        angular.element(scope.selector).empty();
                    };
                }

                var initChart;

                if (scope.type === 'linechart') {
                    initChart = function(data, options, renderOptions) {
                        scope.chart = new arrays.CoreLineChart()
                            .setDispatch(scope.dispatch)
                            .init(data, options)
                            .render(scope.selector);
                        scope.chartNav = new arrays.CoreLineChart()
                            .setDispatch(scope.dispatch)
                            .setBrushTarget(scope.chart)
                            .init(data, options)
                            // TODO add renderOptions, merged with these defaults
                            .render(scope.selector + '-nav', {
                                xAxis: true,
                                yAxis: false,
                                xAxisTicks: true,
                                yAxisTicks: false,
                                mouseEvents: false,
                                brush: true
                            });
                    };
                } else {
                    // All other charts
                    initChart = function(data, options, renderOptions) {
                        scope.chart = new arrays[vizClass]()
                            .init(data, options)
                            .render(scope.selector, renderOptions);
                    };
                }

                /**
                 * TODO On init the charts are destroyed and re-rendered instead of using arrays.Visualization#replaceData.
                 * arrays.Visualization#update does not retain renderOptions, causing undesired renderings after initial load
                 */
                scope.$on('arraysViz.init.' + scope.id, function(evt, data, options, renderOptions) {
                    scope.loading = false;

                    if (scope.chart) {
                        destroyChart();
                    }

                    // Allow values to be passed on init or set in scope (less ideal)
                    data = data || scope.data;
                    options = options || scope.options;
                    renderOptions = renderOptions || scope.renderOptions;

                    if (data.data.length) {
                        initChart(data, options, renderOptions);
                    } else {
                        scope.error = 'No data.';
                    }
                });

                /**
                 * On error/no data
                 */
                scope.$on('arraysViz.error.' + scope.id, function(evt, err) {
                    scope.loading = false;
                    scope.error = err || 'Error loading data.';

                    if (scope.chart) {
                        destroyChart();
                    }
                });
            },
            templateUrl: 'templates/visualizations/container.html'
        };
    });
