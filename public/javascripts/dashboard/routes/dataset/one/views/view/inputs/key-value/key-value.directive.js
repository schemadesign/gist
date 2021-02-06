function gistViewInputKeyValue() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/key-value/key-value.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.addNewKey = addNewKey;
            $scope.checkDuplicateKeyInValues = checkDuplicateKeyInValues;
            $scope.notChosen = notChosen;
            $scope.removeCondition = removeCondition;

            function addNewKey() {
                let newValue = {};

                if ($scope.setting.valueInputType === 'multivalueTextbox') {
                    newValue = { value: [] };
                }

                viewCtrl.data[$scope.setting.name].push(newValue);
            }

            function checkDuplicateKeyInValues(index) {
                return (column) => notChosen(column, index);
            }

            function notChosen(target, targetIndex) {
                return !viewCtrl.data[$scope.setting.name].some(({ key }, index) => (targetIndex !== index && key === target));
            }

            function removeCondition(index) {
                viewCtrl.data[$scope.setting.name].splice(index, 1);
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputKeyValue', gistViewInputKeyValue);
