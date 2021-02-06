function gistViewInputSelectSecondaryColumn() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/select-secondary-column/select-secondary-column.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.hasDependency = viewCtrl.checkDependency($scope.setting.selectFrom);
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputSelectSecondaryColumn', gistViewInputSelectSecondaryColumn);
