function DatasetListCtrl($scope, $mdDialog, $state, DatasetService, datasets, viewUrlService, AclService, $document,
                         $window, Permissions, AuthService) {
    const datasetListCtrl = this;
    const { datasetCtrl } = $scope;
    const isEditRole = Permissions.isEditRole;
    const user = AuthService.currentUser();

    datasetListCtrl.canAddNewViz = _.includes(user.canCreateNewViz, $scope.team._id) || isEditRole;
    datasetListCtrl.sortOptions = { createdAt: 'Sort By Date', title: 'Sort Alphabetically' };
    datasetListCtrl.filterOptions = { all: 'Show All Visualizations', self: 'Show My Visualizations' };
    datasetListCtrl.sortBy = 'createdAt';
    datasetListCtrl.filterBy = 'all';
    datasetListCtrl.datasets = datasets;
    datasetListCtrl.updateSortBy = updateSortBy;
    datasetListCtrl.updateFilterBy = updateFilterBy;
    datasetListCtrl.filterDataset = filterDataset;
    datasetListCtrl.getListHint = getListHint;
    datasetListCtrl.view = view;
    datasetListCtrl.open = open;
    datasetListCtrl.remove = remove;
    datasetListCtrl.canEdit = canEdit;

    function canEdit(datasetId) {
        return user._editors.includes(datasetId) || isEditRole;
    }

    function updateSortBy(value) {
        datasetListCtrl.sortBy = value;
    }

    function updateFilterBy(value) {
        datasetListCtrl.filterBy = value;
    }

    function filterDataset({ author }) {
        return datasetListCtrl.filterBy === 'all' || author._id === user._id;
    }

    function getListHint({ sample, replacement, firstImport }) {
        let hint = '';

        if (sample) {
            hint = 'sample';
        } else if (replacement || firstImport) {
            hint = 'draft';
        }

        return hint;
    }

    function view(dataset) {
        return AclService.getAllFor('dataset', dataset._id)
            .then((permissions) => {
                AclService.setAllInStorage('datasetPermissions', permissions);

                const view = AclService.can('dataset', 'seeStandardViews') ? dataset.fe_views.default_view : null;

                viewUrlService.openViewUrl($scope.subdomain, dataset, view);
            });
    }

    function open(id) {
        $state.go('dashboard.dataset.one.upload', { id });
    }

    function remove({ _id: id, title }, event) {
        return $mdDialog.show({
            templateUrl: 'javascripts/dashboard/routes/dataset/list/delete-dialog.template.html',
            parent: angular.element($document[0].body),
            targetEvent: event,
            clickOutsideToClose: true,
            controller($scope, $mdDialog) {
                $scope.title = title;
                $scope.hide = () => $mdDialog.hide();
                $scope.cancel = () => $mdDialog.cancel();
            },
        }).then(() => {
            DatasetService
                .remove(id)
                .then(() => {
                    datasetListCtrl.datasets = datasetListCtrl.datasets.filter(dataset => dataset._id !== id);

                    datasetCtrl.showSimpleToast('Visualization deleted.');
                })
                .catch(datasetCtrl.showGenericErrorToast);
        });
    }
}

angular.module('arraysApp')
    .controller('DatasetListCtrl', DatasetListCtrl);
