angular
    .module('arraysApp')
    .config(function ($stateProvider) {
        $stateProvider
            .state('dashboard.dataset.one.process', {
                url: '/process',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/process/process.template.html',
                controller: 'DatasetProcessCtrl as datasetProcessCtrl',
            });
    });
