function Team($resource) {
    return $resource(
        '/api/team/:id',
        { id: '@_id' },
        {
            search: { url: '/api/team/search', method: 'GET', isArray: true },
            update: { method: 'PUT' },
            query: { url: '/api/team', method: 'GET', isArray: true },
            addAdmin: { url: '/api/team/admin/:id', method: 'PUT' },
            deleteAdmin: { url: '/api/team/admin/:_id', method: 'DELETE' },
            delete: { url: '/api/team/:id', id: '@_id', method: 'DELETE' },
        },
    );
}

angular.module('arraysApp')
    .factory('Team', Team);
