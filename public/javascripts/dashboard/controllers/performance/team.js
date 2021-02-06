angular.module('arraysApp')
    .controller('PerformanceTeamCtrl', ['$scope', 'PerformanceService', 'PerformanceDataFunc', 'PerformanceData', 'PerformanceGraphData', '$timeout',
        function ($scope, PerformanceService, PerformanceDataFunc, PerformanceData, PerformanceGraphData, $timeout) {

            var units = $scope.units;
            var days = $scope.days;

            // Longest unit of time, should default to 'year' if not overridden by a dashboard extension
            var longestUnit = units[units.length - 1];

            /**
             * Get all data for this tab
             */
            $scope.getTabData = function () {
                // Trigger after view load
                $timeout(function () {
                    updateTotalPageViews();
                    updateTotalUniquePageViews();
                    $scope.updateReferrers('', '', 'week');
                    $scope.updateTechnology('browser', '', 'week');
                }, 0);
            };

            function decimalRound(number, precision) {
                var factor = Math.pow(10, precision);
                return Math.round(number * factor) / factor;
            }

            /**
             * Get all page views for a row of tiles
             */
            function updateTotalPageViewsByType(row, type, callback) {

                // Set all tiles as 'loading'
                for (var i = 0; i < units.length; i++) {
                    $scope[row][units[i]] = {
                        loading: true,
                    };
                }

                var cachedDataKey = 'totalPageViews.' + type;
                var cachedData = PerformanceData.get(cachedDataKey, longestUnit);

                if (cachedData) {
                    callback(cachedData);
                } else {
                    PerformanceService.getTotalPageViews($scope.team._id, longestUnit, type)
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, cachedDataKey, longestUnit);

                            callback(data);
                        })
                        .catch(function (response) {
                            console.log(response);

                            // Set all tiles as 'N/A'
                            for (var i = 0; i < units.length; i++) {
                                $scope[row][units[i]] = null;
                            }

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.history');
                            }, 0);
                        });
                }
            }

            // Single Page Views
            $scope.pageViews = {};

            function updateTotalPageViews() {
                // Set line chart to loading
                $scope.$broadcast('arraysViz.load.history');

                updateTotalPageViewsByType('pageViews', 'general', function (data) {
                    updateTiles(data, 'pageViews');

                    // Create default line chart: total page views over past month
                    $scope.updateHistory('general', '', 'month');
                });
            }

            // Unique Page Views
            $scope.uniquePageViews = {};

            function updateTotalUniquePageViews() {
                updateTotalPageViewsByType('uniquePageViews', 'unique', function (data) {
                    updateTiles(data, 'uniquePageViews');
                });
            }

            function updateTiles(data, row) {

                var compareUnit;
                var current;
                var previous;
                var change;

                // Set all values
                for (var i = 0; i < units.length; i++) {
                    compareUnit = PerformanceDataFunc.splitCurrentPrevious(data.series, days[i]);

                    current = PerformanceDataFunc.sumValuesFromSeries(compareUnit.current, data.values)['page viewed'];
                    previous = PerformanceDataFunc.sumValuesFromSeries(compareUnit.previous, data.values)['page viewed'];
                    change = 0; // reset in loop

                    if (previous) {
                        change = ((current / previous) - 1) * 100;
                    }

                    // Default if no change
                    var changeString = '-';

                    if (change) {
                        // Remove '-' if already a negative value
                        changeString = (change > 0) ? '+' : '';
                        changeString += decimalRound(change, 1) + '%';
                    }

                    $scope[row][units[i]].primary = arrays.displayNumberWithComma(current);
                    $scope[row][units[i]].secondary = changeString;

                    $scope[row][units[i]].loading = false;
                }
            }

            /**
             * History line chart
             */
            var historyOptions = {
                viewOptions: {
                    viewInteractivity: true,
                },
                outputInFormat: 'MMM D, YYYY',
                groupBy_isDate: true,
            };

            $scope.updateHistory = function (title, viewFilter, timeUnit) {
                var days = PerformanceDataFunc.unitToDays(timeUnit);

                var cachedDataKey = 'totalPageViews.' + title;
                var cachedData = PerformanceData.get(cachedDataKey, longestUnit);

                var graphData = PerformanceGraphData.lineChart(cachedData);

                if (graphData) {
                    var historyData = {
                        data: [
                            graphData.data[0].slice(0, days),
                        ],
                        labels: graphData.labels,
                        colors: ['#75A7FF'],
                    };

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.history', historyData, historyOptions);
                    }, 0);
                }
            };

            /**
             * Referrers
             */
            var pathOfEntryOptions = angular.extend({
                groupBy: 'Referrer',
                aggregateBy: 'page viewed',
                stackBy: 'Referrer',
            }, $scope.horizontalBarChartOptions);

            $scope.updateReferrers = function (title, viewFilter, unit) {

                $scope.$broadcast('arraysViz.load.pathofEntry');

                // Use cached data if available, otherwise GET it
                var cachedData = PerformanceData.get('referrers', unit);

                if (cachedData) {
                    update(cachedData);
                } else {
                    PerformanceService.getReferrers($scope.team._id, unit, 'general')
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, 'referrers', unit);

                            update(data);
                        })
                        .catch(function (response) {
                            console.log(response);

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.pathofEntry');
                            }, 0);
                        });
                }

                function update(data) {
                    const pathOfEntryData = PerformanceGraphData.barChart(data);

                    pathOfEntryData.colors = ['#75A7FF', '#61C3C3', '#FFC739', '#F44951', '#AC61FA'];

                    const orderedCategories = _.sortBy(pathOfEntryData.data, (item) => item[0].value)
                        .reverse()
                        .map((item) => item[0].category);

                    pathOfEntryData.categories = pathOfEntryData.categories.map((value) => orderedCategories.indexOf(value) + 1);

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.pathofEntry', pathOfEntryData, pathOfEntryOptions);
                    }, 0);
                }

            };

            /**
             * Technology
             */
            var technologyOptions = {
                viewOptions: {
                    viewInteractivity: false,
                },
                // TODO labelling this generically until this can be updated for proper display in tooltip
                groupBy: 'Technology',
                aggregateBy: 'Page views',
            };

            var technologyRenderOptions = {
                innerRadius: 0.75, tooltipPositionScaleFactor: 1.25,
            };

            $scope.updateTechnology = function (technology, viewFilter, unit) {

                $scope.$broadcast('arraysViz.load.technology');

                var cachedDataKey = 'technology.' + technology;

                // Use cached data if available, otherwise GET it
                var cachedData = PerformanceData.get(cachedDataKey, unit);

                if (cachedData) {
                    update(cachedData);
                } else {
                    PerformanceService.getTechnology($scope.team._id, unit, 'general', technology)
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, cachedDataKey, unit);

                            update(data);
                        })
                        .catch(function (response) {
                            if (response && response.error) {
                                console.log(response.error);
                            }

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.technology');
                            }, 0);
                        });
                }

                function update(data) {

                    var technologyData = PerformanceGraphData.pieChart(data);
                    technologyData.colors = ['#75A7FF', '#61C3C3', '#FFC739', '#F44951', '#AC61FA'];

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.technology', technologyData, technologyOptions, technologyRenderOptions);
                    }, 0);
                }
            };

        }]);
