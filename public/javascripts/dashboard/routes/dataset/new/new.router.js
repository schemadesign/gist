angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.new', {
                url: '/new',
                templateUrl: 'javascripts/dashboard/routes/dataset/new/new.template.html',
                controller: 'DatasetNewCtrl',
                controllerAs: 'datasetNewCtrl',
            });
    });
