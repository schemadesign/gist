angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider.state('dashboard.dataset.one.filters', {
            url: '/filters',
            templateUrl: 'javascripts/dashboard/routes/dataset/one/filters/filters.template.html',
            controller: 'DatasetFiltersCtrl',
            controllerAs: 'datasetFiltersCtrl',
        });
    });
