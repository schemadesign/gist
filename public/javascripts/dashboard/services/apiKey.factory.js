(function () {
    angular.module('arraysApp')
        .factory('ApiKey', ['$resource', function ($resource) {
            return $resource('/api/apiKey', { id: '@_id' }, {
                getKey: { method: 'GET', url: '/api/apiKey/getKey/:id' },
                generate: { method: 'PUT', url: '/api/apiKey/generate' },
                submit: { method: 'POST', url: '/api/apiKey/update' },
            });
        }]);
})();
