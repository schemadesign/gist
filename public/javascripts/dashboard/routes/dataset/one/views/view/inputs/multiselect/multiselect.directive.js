function gistViewInputMultiselect() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/multiselect/multiselect.template.html',
        controller($scope) {
            const { datasetViewsCtrl, viewCtrl } = $scope;

            const dataMatcher = viewCtrl.dataTypeMatch($scope.setting.restrictColumnDataType);
            const dataExcluder = viewCtrl.excludeBy($scope.setting.selectExcludeBy);
            const columns = datasetViewsCtrl.colsAvailable.filter(dataMatcher).filter(dataExcluder);

            $scope.colsAvailableOfType = viewCtrl.appendNumberOfItems($scope.setting.displayAs, columns);
            $scope.checkMultiselectLimit = $scope.setting.limit ? checkMultiselectLimit : _.stubFalse;

            // Check if the current multiselect list is at (or exceeds) the limit of selections
            function checkMultiselectLimit(column) {
                return viewCtrl.data[$scope.setting.name].length >= $scope.setting.limit &&
                    !viewCtrl.data[$scope.setting.name].includes(column);
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputMultiselect', gistViewInputMultiselect);
