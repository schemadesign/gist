function Content($resource) {
    return $resource(
        '/api/dataset/content/:datasetId/:entryId',
        {
            datasetId: '@datasetId',
            entryId: '@entryId',
            rowName: '@rowName'
        },
        {
            createField: { url: '/api/dataset/content/:datasetId/createField/:name', method: 'POST' },
            removeField: { url: '/api/dataset/content/:datasetId/removeField/:name', method: 'POST' },
            query: { method: 'GET', isArray: false },
            update: { method: 'PUT' },
        },
    );
}

angular.module('arraysApp')
    .factory('Content', Content);
