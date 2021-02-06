function View($resource) {
    return $resource('/api/view/', {}, {
        get: {
            url: '/api/view/:id',
        },
        getDetailed: {
            url: '/api/view/:id/dataset/:datasetId'
        }
    });
}

angular.module('arraysApp')
    .factory('View', View);
