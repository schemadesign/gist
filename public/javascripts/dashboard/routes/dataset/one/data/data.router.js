angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one.data', {
                url: '/data',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/data/data.template.html',
                controller: 'DatasetDataCtrl',
                controllerAs: 'datasetDataCtrl',
            });
    });
