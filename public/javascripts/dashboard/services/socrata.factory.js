(function () {
    angular.module('arraysApp')
        .factory('Socrata', ['$resource', function ($resource) {

            return $resource('/api/socrata', { q: '@_q', offset: '@_offset' },
                {
                    get: { method: 'GET', url: '/api/socrata' },
                });
        }]);
})();
