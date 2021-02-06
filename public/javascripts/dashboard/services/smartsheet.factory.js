(function() {
    angular.module('arraysApp')
        .factory('Smartsheet', ['$resource', function($resource) {

            return $resource('/api/smartsheet/sheets',
                {
                    get: { method: 'GET', url: '/api/smartsheet/sheets' }
                });

        }]);
})();
