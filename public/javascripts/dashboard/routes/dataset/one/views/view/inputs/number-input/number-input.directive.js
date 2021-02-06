function gistViewInputNumberInput() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/number-input/number-input.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputNumberInput', gistViewInputNumberInput);
