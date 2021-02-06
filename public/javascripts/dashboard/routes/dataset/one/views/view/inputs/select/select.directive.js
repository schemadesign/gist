function gistViewInputSelect() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/select/select.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.hasDependency = viewCtrl.checkDependency($scope.setting.selectFrom);
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputSelect', gistViewInputSelect);
