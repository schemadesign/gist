(function() {
    angular.module('arraysApp')
        .factory('Datadotworld', ['$resource', function($resource) {

            return $resource('/api/datadotworld/datasets', { id: '@_id', owner: '@_owner' },
                {
                    get: { method: 'GET', url: '/api/datadotworld/datasets' },
                    getQueries: { method: 'GET', url: '/api/datadotworld/datasets/queries' },
                    getTables: { method: 'GET', url: '/api/datadotworld/datasets/tables' }
                });

        }]);
})();
