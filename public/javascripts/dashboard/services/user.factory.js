(function() {
    angular.module('arraysApp').factory('User', [
        '$resource',
        function($resource) {
            return $resource(
                '/api/user',
                { id: '@_id' },
                {
                    search: { url: '/api/user/search', method: 'GET', isArray: true },
                    update: { method: 'POST', url: '/api/user/:id' },
                    remove: { method: 'DELETE', url: '/api/user/:id' },
                    getAll: { method: 'GET', url: '/api/user/getAll/:teamId', isArray: true },
                    checkPw: { method: 'POST', url: '/api/user/:id/checkPw' },
                    updateProfile: { method: 'PUT', url: '/api/user/:id/updateProfile' },
                    sampleImported: { method: 'PUT', url: 'api/user/sampleImported/:id' },
                    currentUser: { method: 'GET', url: '/api/user/currentUser' },
                }
            );
        },
    ]);
})();
