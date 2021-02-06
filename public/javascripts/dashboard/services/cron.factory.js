(function() {
    angular.module('arraysApp')
        .factory('Cron', ['$resource', function($resource) {
            return $resource('/api/dataset/cron/:datasetId', { datasetId: '@datasourceDescription' },
                {
                    update: { method: 'PUT', url: '/api/dataset/cron/:id' },
                    remove: { method: 'DELETE', url: '/api/dataset/cron/:id' },
                    save: { method: 'POST', url: '/api/dataset/cron' }
                }
            );
        }]);

})();
