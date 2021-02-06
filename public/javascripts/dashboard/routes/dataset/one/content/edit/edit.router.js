angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.one.content.edit', {
                url: '/:entryId',
                templateUrl: 'javascripts/dashboard/routes/dataset/one/content/edit/edit.template.html',
                controller: 'ContentEditCtrl',
                controllerAs: 'contentEditCtrl',
                resolve: {
                    entry(Content, $transition$) {
                        return Content
                            .get({
                                datasetId: $transition$.params().id,
                                entryId: $transition$.params().entryId,
                            })
                            .$promise;
                    },
                },
            });
    });
