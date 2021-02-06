angular
    .module('arraysApp')
    .config(['$stateProvider', function ($stateProvider) {
        $stateProvider
            .state('dashboard.dataset.one.settings', {
                url: '/settings',
                controller: 'DatasetSettingsCtrl as datasetSettingsCtrl',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/settings/settings.template.html',
            });
    }]
    );
