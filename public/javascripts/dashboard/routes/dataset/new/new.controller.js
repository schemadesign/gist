function DatasetNewCtrl($scope, $state, DatasetService, AclService, AuthService) {
    const datasetNewCtrl = this;

    datasetNewCtrl.canCreateCustomViz = AclService.can('team', 'createCustomViz');
    datasetNewCtrl.canCreateStandardViz = AclService.can('team', 'createStandardViz');
    datasetNewCtrl.catsRule = () => datasetNewCtrl.dataset.title === 'Catlas Drug Delivery';
    datasetNewCtrl.dogsRule = () => datasetNewCtrl.dataset.title === 'Isle of Dogs';
    datasetNewCtrl.submitForm = submitForm;

    datasetNewCtrl.dataset = {
        vizType: datasetNewCtrl.canCreateStandardViz ? 'standardViz' : 'customViz',
    };

    function submitForm(isValid) {
        if (!isValid) {
            return false;
        }

        datasetNewCtrl.submitting = true;
        datasetNewCtrl.dataset.author = $scope.user._id;
        datasetNewCtrl.dataset._team = $scope.team._id;
        datasetNewCtrl.dataset.uid = _.kebabCase(datasetNewCtrl.dataset.title);
        datasetNewCtrl.dataset.updatedBy = $scope.user._id;

        return DatasetService.save(datasetNewCtrl.dataset)
            .then(({ data }) => {
                // set permissions for dataset
                if (data.user) {
                    AuthService.updateUser(data.user);
                }

                AclService.setAllFor('dataset', data.id, datasetNewCtrl.dataset.vizType);
                $state.go('dashboard.dataset.one.upload', { id: data.id });
            })
            .catch(({ status, data }) => {
                // Enable the button only in case of an error. There's a slight delay before a user gets redirected
                // to the upload form.
                datasetNewCtrl.submitting = false;

                if (status === 500) {
                    $state.go('dashboard.dataset.error', {
                        type: 'badFormat',
                        errMsg: data,
                        returnTo: 'dashboard.dataset.list',
                    });
                }
            });
    }
}

angular.module('arraysApp')
    .controller('DatasetNewCtrl', DatasetNewCtrl);
