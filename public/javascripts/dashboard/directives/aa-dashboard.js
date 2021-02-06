angular.module('arraysApp')
    .directive('aaToolbar', function () {
        return {
            restrict: 'E',
            scope: {
                title: '@title',
                cancel: '&?'
            },
            templateUrl: 'templates/blocks/dialog.toolbar.html'
        };
    })
    .directive('aaDialogActions', function () {
        return {
            restrict: 'E',
            scope: {
                confirm: '@confirm',
                isConfirmDisabled: '<isConfirmDisabled',
                warn: '@warn',
                cancel: '@cancel',
                hideCancel: '@hideCancel'
            },
            templateUrl: 'templates/blocks/dialog.actions.html'
        };
    })
    .directive('aaTooltip', function () {
        return {
            restrict: 'A',
            scope: {
                aaTooltip: '@'
            },
            transclude: true,
            template: `
                <span style="pointer-events: auto;">
                    <span ng-transclude />
                    <md-tooltip md-delay="600" ng-if="aaTooltip">{{ aaTooltip }}</md-tooltip>
                </span>
            `
        };
    })
    .directive('aaColorPicker', function () {
        return {
            restrict: 'E',
            scope: {
                selected: '=',
                unlist: '=?', // optional,
                palette: '=',
                custom: '='
            },
            templateUrl: 'templates/blocks/colorpicker.html',
            link: function (scope) {
                if (scope.palette && scope.palette.length > 0) {
                    scope.colors = scope.palette;
                } else {
                    scope.colors = [
                        '#1B6DFC',
                        '#0CB7FA',
                        '#FA79FC',
                        '#FB3705',
                        '#F9D307',
                        '#FA9007',
                        '#7D5807',
                        '#B2E606',
                        '#069908',
                        '#7B07FD'
                    ];
                }

                const defaultColor = '#005CB5';

                scope.pick = function (color) {
                    scope.selected = scope.selected === color ? defaultColor : color;
                };

                scope.unlist = scope.unlist || [];
            }
        };
    })
    .directive('aaMultiColorPicker', function () {
        return {
            restrict: 'E',
            scope: {
                colors: '='
            },
            templateUrl: 'templates/blocks/multicolorpicker.html',
            link: function (scope) {
                scope.newColor = '';
                scope.newColorValidity = false;

                // ensure there is a new color and that it is not a duplicate
                scope.$watch('newColor', function (newValue, oldValue) {
                    scope.newColorValidity = scope.newColor && (scope.colors.indexOf(scope.newColor) === -1);
                });

                scope.addColor = function () {
                    if (scope.newColor && scope.colors.indexOf(scope.newColor) === -1) {
                        scope.colors.push(scope.newColor);
                        scope.newColor = '';
                    }
                };
                scope.removeColor = function (ndex) {
                    scope.colors.splice(ndex, 1);
                };
            }
        };
    });
