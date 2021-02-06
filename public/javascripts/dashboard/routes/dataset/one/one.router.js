angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one', {
                abstract: true,
                url: '/:id',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/one.template.html',
                controller: 'DatasetOneCtrl',
                controllerAs: 'datasetOneCtrl',
                resolve: {
                    dataset(DatasetService, $transition$) {
                        return DatasetService.get($transition$.params().id);
                    },
                    additionalDatasources(DatasetService, $transition$) {
                        return DatasetService.getAdditionalSources($transition$.params().id);
                    },
                    datasetPermissions(AclService, $transition$) {
                        return AclService.getAllFor('dataset', $transition$.params().id)
                            .then(permissions => AclService.setAllInStorage('datasetPermissions', permissions));
                    },
                },
            });
    });
