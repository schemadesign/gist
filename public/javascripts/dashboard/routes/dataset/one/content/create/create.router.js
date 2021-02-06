angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one.content.create', {
                url: '/create',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/content/create/create.template.html',
                controller: 'ContentCreateCtrl',
                controllerAs: 'contentCreateCtrl',
            });
    });
