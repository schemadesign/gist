function Salesforce($resource) {
    return $resource('/api/salesforce/', {}, {
        validateQuery: {
            method: 'GET',
            url: '/api/salesforce/validateQuery',
        },
        validateToken: {
            method: 'GET',
            url: '/api/salesforce/validateToken',
        },
        getTables: {
            method: 'GET',
            url: '/api/salesforce/tables',
        },
        getFields: {
            method: 'GET',
            url: '/api/salesforce/fields',
        },
    });
}

angular.module('arraysApp')
    .factory('Salesforce', Salesforce);
