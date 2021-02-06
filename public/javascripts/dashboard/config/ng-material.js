'use strict';

/**
 * Disable ngMaterial ink effects
 */
angular
    .module('arraysApp')
    .config(['$mdInkRippleProvider',
        function($mdInkRippleProvider) {
            $mdInkRippleProvider.disableInkRipple();
        }
    ]);
