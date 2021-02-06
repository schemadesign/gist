angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one.content', {
                abstract: true,
                url: '/content?page&title&filterBy&sortBy',
                reloadOnSearch: false,
                templateUrl: 'javascripts/dashboard/routes/dataset/one/content/content.template.html',
                controller: 'ContentCtrl',
                controllerAs: 'contentCtrl',
            });
    });
