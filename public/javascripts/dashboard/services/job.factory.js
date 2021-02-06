(function() {
    angular.module('arraysApp')
        .factory('Job', ['$resource', function($resource) {

            return $resource('/api/job/:id', { id: '@_id' }, {
                get: { url: '/api/job/:id', method: 'GET' },
                getLog: { url: '/api/job/:id/log', method: 'GET', isArray: true },
                search: { url: '/api/job/search', method: 'GET', isArray: true },
                delete: { url: '/api/job/:id', method: 'DELETE' }
            });
        }]);
})();
