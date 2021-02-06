function ObjectDetailDialogController($scope, $mdDialog, colsAvailable, dataset) {
    $scope.colsAvailable = colsAvailable;
    $scope.dataset = dataset;

    let fe_excludeFieldsObjDetail = _.clone(dataset.fe_excludeFieldsObjDetail);

    if (!_.isPlainObject(fe_excludeFieldsObjDetail)) {
        fe_excludeFieldsObjDetail = {};
    }

    $scope.data = { fe_excludeFieldsObjDetail };

    $scope.cancel = () => {
        $mdDialog.cancel();
    };

    $scope.save = () => {
        $mdDialog.hide($scope.data);
    };
}

angular.module('arraysApp')
    .controller('ObjectDetailDialogController', ObjectDetailDialogController);
