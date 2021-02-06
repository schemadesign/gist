angular.module('arraysApp').config(($stateProvider) => {
    $stateProvider.state('dashboard.dataset.one.views', {
        url: '/views',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/views.template.html',
        controller: 'DatasetViewsCtrl',
        controllerAs: 'datasetViewsCtrl',
        resolve: {
            views(View, AclService) {
                if (AclService.can('dataset', 'seeStandardViews')) {
                    return View.query().$promise;
                }

                return [{ name: 'customView', displayAs: 'Custom' }];
            },
        },
    }).state('dashboard.dataset.one.views.view', {
        url: '/:name',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/view.template.html',
        controller: 'ViewCtrl',
        controllerAs: 'viewCtrl',
        resolve: {
            view(views, View, $transition$) {
                const viewName = $transition$.params().name;
                const name = viewName === 'grouped-gallery' ? 'timeline' : viewName;
                const viewId = _.get(_.find(views, { name }), '_id');
                const datasetId = $transition$.params().id;

                return View.getDetailed({ id: viewId, datasetId }).$promise;
            },
            user(AuthService) {
                return AuthService.currentUser();
            },
        },
    });
});
