(function () {
    angular.module('arraysApp')
        .factory('RegisterLink', ['$resource', function ($resource) {
            return $resource('/api/register-link', { id: '@_id' }, {
                generate: { method: 'GET', url: '/api/register-link' },
            });
        }]);
})();
