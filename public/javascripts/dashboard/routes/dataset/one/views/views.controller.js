function DatasetViewsCtrl($scope, views, $mdDialog, $state, AclService) {
    const { datasetOneCtrl } = $scope;

    this.canEditGeneralSettings = AclService.can(
        'dataset',
        'editGeneralSettings',
    );
    this.views = views;
    this.shouldShowPreviewOverlay = () =>
        $state.is('dashboard.dataset.one.views.view') && !this.previewLoaded;
    this.getThumbnail = ({ thumbnail }) =>
        thumbnail ? `/images/view-thumbnails/${thumbnail}` : '';

    this.setDefaultView = viewName => {
        datasetOneCtrl.dataset.fe_views.default_view = viewName;
        datasetOneCtrl.verifyDatasetValidity();
    };

    this.scaffoldView = (data, { scaffold }, visibility) => {
        _.set(data, 'visible', visibility);
        _.defaults(data, scaffold);
    };

    this.setViewVisibility = (view, visibility) => {
        _.defaults(datasetOneCtrl.dataset.fe_views.views, { [view.name]: {} });
        this.scaffoldView(
            datasetOneCtrl.dataset.fe_views.views[view.name],
            view,
            visibility,
        );
    };

    this.colsAvailable = datasetOneCtrl.getVisibleColumnNames();

    this.colsAll = datasetOneCtrl.getAllColumnNames();

    this.saveData = data => {
        if (!_.isEqual(datasetOneCtrl.dataset, data)) {
            _.assign(datasetOneCtrl.dataset, data);
            datasetOneCtrl.verifyDatasetValidity();
        }
    };

    this.openDetailDialog = event => {
        $mdDialog.show({
            controller: 'ObjectDetailDialogController',
            templateUrl:
                'javascripts/dashboard/routes/dataset/one/views/object-detail-dialog/object-detail-dialog.template.html',
            targetEvent: event,
            clickOutsideToClose: true,
            fullscreen: true,
            locals: {
                colsAvailable: this.colsAvailable,
                dataset: datasetOneCtrl.dataset,
            },
        }).then(this.saveData).catch(angular.noop);
    };

    this.openGeneralSettingsDialog = event => {
        const imageFields = datasetOneCtrl.getSortedColumns().filter(
            ({ operation, sample }) =>
                operation === 'ToString' &&
                _.toString(sample).match(/^https?:\/\//),
        ).map(({ name }) => name);

        $mdDialog.show({
            controller: 'GeneralSettingsDialogCtrl',
            templateUrl:
                'javascripts/dashboard/routes/dataset/one/views/general-settings-dialog/general-settings-dialog.template.html',
            targetEvent: event,
            clickOutsideToClose: true,
            fullscreen: true,
            locals: {
                dataset: datasetOneCtrl.dataset,
                colsAll: this.colsAll,
                imageFields,
                team: $scope.team,
            },
        }).then(this.saveData).catch(angular.noop);
    };
    this.openAPIDialog = event => {
        $mdDialog.show({
            controller: 'ApiDialogController',
            templateUrl:
                'javascripts/dashboard/routes/dataset/one/views/api-dialog/api-dialog.template.html',
            targetEvent: event,
            clickOutsideToClose: true,
            fullscreen: true,
            locals: {
                dataset: datasetOneCtrl.dataset,
            },
        });
    };

    this.openViewEditor = ({ name }) => {
        if (name === 'customView') {
            $mdDialog.show({
                controller: `${$scope.team.subdomain}ViewModalCtrl`,
                templateUrl: `${$scope.team.subdomain}/view-modal.html`,
                locals: { dataset: datasetOneCtrl.dataset },
            }).then(({ fe_views }) => this.saveData({ fe_views }));
        } else {
            name = name === 'timeline' ? 'grouped-gallery' : name;
            $state.go('dashboard.dataset.one.views.view', { name });
        }
    };
}

angular.module('arraysApp').controller('DatasetViewsCtrl', DatasetViewsCtrl);
