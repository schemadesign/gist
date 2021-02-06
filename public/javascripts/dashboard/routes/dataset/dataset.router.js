angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset', {
                abstract: true,
                url: '/dataset',
                controller: 'DatasetCtrl',
                controllerAs: 'datasetCtrl',
            });
    });
