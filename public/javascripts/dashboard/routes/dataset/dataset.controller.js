function DatasetCtrl($scope) {
    const datasetCtrl = this;
    const { dashboardCtrl } = $scope;

    datasetCtrl.showSimpleToast = dashboardCtrl.showSimpleToast;
    datasetCtrl.showGenericErrorToast = dashboardCtrl.showGenericErrorToast;
}

angular.module('arraysApp')
    .controller('DatasetCtrl', DatasetCtrl);
