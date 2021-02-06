angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.team.api', {
                url: '/api',
                controller: 'ApiKeyCtrl',
                templateUrl: 'javascripts/dashboard/routes/team/apiKey/apiKey.html',
                controllerAs: 'apiKeyCtrl',
            });
    });
