(function() {
    angular.module('arraysApp')
        .factory('Story', ['$resource', function($resource) {

            return $resource('/api/story/:id', { id: '@_id' },
                {
                    getAll: { method: 'GET', url: '/api/story', isArray: true },
                    save: { method: 'PUT' },
                    delete: { method: 'DELETE' }
                });

        }]);
})();
