angular.module('arraysApp')
    .controller('BasePerformanceCtrl', ['$scope', '$location',
        function($scope, $location) {

            $scope.navigate = function(step) {
                var path = step.replace(/\./g, '/');
                $location.path('/' + path);
            };

            // Shared options for HorizontalBarChart
            $scope.horizontalBarChartOptions = {
                viewOptions: {
                    viewInteractivity: false
                },
                margin: {
                    left: 120,
                    right: 40
                }
            };
        }])
    .controller('PerformanceCtrl', ['$scope', '$controller', 'datasets',
        function($scope, $controller, datasets) {

            // Make resolved datasets available in scope
            $scope.datasets = datasets;

            // Expose units and days to be used in extensions
            $scope.units = ['day', 'week', 'month', 'year'];
            $scope.days = [1, 7, 30, 365];

            angular.extend(this, $controller('BasePerformanceCtrl', {
                $scope: $scope
            }));

        }]);
