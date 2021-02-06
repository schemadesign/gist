function gistViewInputWidthMapping() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/width-mapping/width-mapping.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.setWidth = setWidth;
            $scope.deleteProperty = deleteProperty;
            $scope.excludeUsedColumns = excludeUsedColumns;

            function setWidth() {
                _.set(viewCtrl.data, [$scope.setting.name, $scope.columnField], $scope.columnWidth);

                $scope.columnField = '';
                $scope.columnWidth = '';
            }

            function deleteProperty(key) {
                _.unset(viewCtrl.data[$scope.setting.name], key);
            }

            function excludeUsedColumns(column) {
                return !_.has(viewCtrl.data[$scope.setting.name], column);
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputWidthMapping', gistViewInputWidthMapping);
