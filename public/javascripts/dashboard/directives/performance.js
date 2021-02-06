angular.module('arraysApp')
    .directive('aaPerformanceHeader', function() {
        // If a selection exists, check it against the options
        function validateSelection(selection, options) {
            if (selection && (options.indexOf(selection) === -1)) {
                console.log('Selection \'' + selection + '\' not a member of: ' + options);
            }
        }

        return {
            restrict: 'E',
            scope: {
                title: '@headerTitle',
                titles: '=?headerTitles',
                tooltip: '@?headerTooltip',
                viewFilter: '@?headerViewFilter',
                timeUnit: '@?headerTimeUnit',
                timeUnits: '=?headerTimeUnits',
                updateCallback: '=?headerUpdate'
            },
            link: function(scope) {
                // TODO this isn't a very Angular way but was having issues with all values being updated on change
                scope.settings = {
                    title: scope.title,
                    viewFilter: scope.viewFilter,
                    timeUnit: scope.timeUnit
                };

                scope.viewFilters = ['Top 5', 'Top 10', 'All'];
                validateSelection(scope.viewFilter, scope.viewFilters);

                scope.timeUnits = scope.timeUnits || ['day', 'week', 'month', 'year'];
                validateSelection(scope.timeUnit, scope.timeUnits);

                // TODO this isn't a very Angular way but was having issues with all values being updated on change
                scope.update = function(prop, value) {
                    scope.settings[prop] = value;
                    scope.updateCallback(scope.settings.title, scope.settings.viewFilter, scope.settings.timeUnit);
                };

                if (typeof scope.updateCallback !== 'function') {
                    scope.updateCallback = function() {
                        console.log('No headerUpdate function specified!');
                    };
                }
            },
            templateUrl: 'templates/performance/blocks/header.html'
        };
    })
    .directive('aaPerformanceTiles', function() {
        return {
            restrict: 'E',
            scope: {
                data: '=tilesData'
            },
            templateUrl: 'templates/performance/blocks/tiles.html'
        };
    })
    .directive('aaPerformanceTile', function() {
        return {
            restrict: 'E',
            scope: {
                title: '@tileTitle',
                data: '=tileData'
            },
            link: function(scope) {
                // Display 'N/A' if no data but allow 0 values
                scope.filterData = function(input) {
                    var formatted = input;

                    if (scope.data && scope.data.loading) {
                        formatted = '-';
                    } else if (typeof input === 'undefined') {
                        formatted = 'N/A';
                    }

                    return formatted;
                };
            },
            templateUrl: 'templates/performance/blocks/tile.html'
        };
    });
