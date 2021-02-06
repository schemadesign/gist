'use strict';

/**
 * IE caching fixes
 */
angular
    .module('arraysApp')
    .config(['$httpProvider',
        function($httpProvider) {
            // Fix for IE caching AJAX requests
            $httpProvider.defaults.cache = false;
            if (!$httpProvider.defaults.headers.get) {
                $httpProvider.defaults.headers.get = {};
            }
            // Disable IE ajax request caching
            $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
        }
    ]);
