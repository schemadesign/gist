angular.module('arraysApp')
    .controller('PerformancePagesCtrl', ['$scope', 'PerformanceService', 'PerformanceData', 'PerformanceGraphData', '$timeout',
        function ($scope, PerformanceService, PerformanceData, PerformanceGraphData, $timeout) {

            /**
             * Get all data for this tab
             */
            $scope.getTabData = function () {
                // Trigger after view load
                $timeout(function () {
                    $scope.updateTopPageViews('general', '', 'week');
                    $scope.updateTopUniquePageViews('unique', '', 'week');
                    $scope.updateHistory('general', '', 'month');
                }, 0);
            };

            /**
             * Top 5 pages
             */
            var topPageViewsOptions = angular.extend({
                groupBy: 'Page',
                aggregateBy: 'page viewed',
                stackBy: 'Page',
            }, $scope.horizontalBarChartOptions);

            $scope.updateTopPageViews = function (type, viewFilter, unit) {

                $scope.$broadcast('arraysViz.load.topPageViews');

                var cachedData = PerformanceData.get('topPageViews', unit);

                if (cachedData) {
                    update(cachedData);
                } else {
                    PerformanceService.getPageViews($scope.team._id, unit, type, 5)
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, 'topPageViews', unit);

                            update(data);
                        })
                        .catch(function (err) {
                            console.log(err);

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.topPageViews');
                            }, 0);
                        });
                }

                function update(data) {

                    const topPageViewsData = PerformanceGraphData.barChart(data);
                    const orderedCategories = _.sortBy(topPageViewsData.data, (item) => item[0].value)
                        .reverse()
                        .map((item) => item[0].category);

                    topPageViewsData.categories = topPageViewsData.categories.map((value) => orderedCategories.indexOf(value) + 1);
                    topPageViewsData.colors = ['#75A7FF', '#61C3C3', '#FFC739', '#F44951', '#AC61FA'];

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.topPageViews', topPageViewsData, topPageViewsOptions);
                    }, 0);
                }
            };

            /**
             * Top 5 unique pages
             */
            var topUniquePageViewsOptions = angular.extend({
                groupBy: 'Page',
                aggregateBy: 'page viewed',
                stackBy: 'Page',
            }, $scope.horizontalBarChartOptions);

            $scope.updateTopUniquePageViews = function (type, viewFilter, unit) {

                $scope.$broadcast('arraysViz.load.topUniquePageViews');

                var cachedData = PerformanceData.get('topUniquePageViews', unit);

                if (cachedData) {
                    update(cachedData);
                } else {
                    PerformanceService.getPageViews($scope.team._id, unit, type, 5)
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, 'topUniquePageViews', unit);

                            update(data);
                        })
                        .catch(function (err) {
                            console.log(err);

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.topUniquePageViews');
                            }, 0);
                        });
                }

                function update(data) {
                    const topUniquePageViewsData = PerformanceGraphData.barChart(data);
                    const orderedCategories = _.sortBy(topUniquePageViewsData.data, (item) => item[0].value)
                        .reverse()
                        .map((item) => item[0].category);

                    topUniquePageViewsData.categories = topUniquePageViewsData.categories.map((value) => orderedCategories.indexOf(value) + 1);
                    topUniquePageViewsData.colors = ['#75A7FF', '#61C3C3', '#FFC739', '#F44951', '#AC61FA'];

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.topUniquePageViews', topUniquePageViewsData, topUniquePageViewsOptions);
                    }, 0);
                }
            };

            /**
             * Page views per page/visualization
             */
            var historyOptions = {
                redirectBaseUrl: '',
                outputInFormat: 'MMM D, YYYY',
                groupBy_isDate: true,
            };

            $scope.updateHistory = function (type, viewFilter, unit) {

                $scope.$broadcast('arraysViz.load.history');

                var cachedDataKey = 'pageViews.' + type;
                var cachedData = PerformanceData.get(cachedDataKey, unit);

                if (cachedData) {
                    update(cachedData);
                } else {
                    PerformanceService.getPageViews($scope.team._id, unit, type, 5)
                        .then(function (response) {
                            var data = response.data.data;

                            PerformanceData.add(data, cachedDataKey, unit);

                            update(data);
                        })
                        .catch(function (err) {
                            console.log(err);

                            $timeout(function () {
                                $scope.$broadcast('arraysViz.error.history');
                            }, 0);
                        });
                }

                function update(data) {
                    var historyData = PerformanceGraphData.lineChart(data);
                    historyData.colors = ['#75A7FF', '#61C3C3', '#FFC739', '#F44951', '#AC61FA'];

                    $scope.historyData = historyData;

                    $timeout(function () {
                        $scope.$broadcast('arraysViz.init.history', historyData, historyOptions);
                    }, 0);
                }
            };

        },
    ]);
