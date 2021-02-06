'use strict';

/**
 * Set minicolors defaults
 */
angular.module('arraysApp')
    .config(['minicolorsProvider', function (minicolorsProvider) {
        angular.extend(minicolorsProvider.defaults, {
            control: 'hue',
            letterCase: 'uppercase',
            position: 'top left'
        });
    }]);
