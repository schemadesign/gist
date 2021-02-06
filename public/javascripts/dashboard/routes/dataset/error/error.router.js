angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.error', {
                url: '/error?id=&type=&errMsg=',
                templateUrl: 'javascripts/dashboard/routes/dataset/error/error.template.html',
                controller: 'DatasetErrorCtrl',
                controllerAs: 'datasetErrorCtrl',
            });
    });
