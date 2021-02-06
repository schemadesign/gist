function DatasetErrorCtrl($scope, $state, $transition$, DatasetService, AuthService, $window) {
    const datasetErrorCtrl = this;
    const { datasetCtrl } = $scope;

    datasetErrorCtrl.errorCode = $transition$.params().type;
    datasetErrorCtrl.errorDatasetId = $transition$.params().id;
    datasetErrorCtrl.errorMessage = $transition$.params().errMsg;
    datasetErrorCtrl.killTask = killTask;
    datasetErrorCtrl.restartImport = restartImport;
    datasetErrorCtrl.backToPreviousStep = backToPreviousStep;
    datasetErrorCtrl.logOut = logOut;

    function killTask() {
        return DatasetService.killJob(datasetErrorCtrl.errorDatasetId)
            .then(({ status, data }) => {
                if (status === 200 && data === 'ok') {
                    $state.go('dashboard.dataset.one.data', { id: datasetErrorCtrl.errorDatasetId });
                } else {
                    datasetCtrl.showGenericErrorToast();
                }
            });
    }

    function restartImport() {
        return DatasetService.startJob(datasetErrorCtrl.errorDatasetId)
            .then(() => {
                $state.go('dashboard.dataset.one.process', { id: datasetErrorCtrl.errorDatasetId });
            })
            .catch(() => {
                datasetCtrl.showSimpleToast('Could not start the import task over again - please contact support for more help.');
            });
    }

    function backToPreviousStep() {
        const params = {};
        if (datasetErrorCtrl.errorDatasetId) {
            params.id = datasetErrorCtrl.errorDatasetId;
        }

        $state.go($transition$.params().returnTo || 'dashboard.dataset.list', params);
    }

    function logOut() {
        AuthService.logout($transition$.params().returnTo);
    }
}

angular.module('arraysApp')
    .controller('DatasetErrorCtrl', DatasetErrorCtrl);
