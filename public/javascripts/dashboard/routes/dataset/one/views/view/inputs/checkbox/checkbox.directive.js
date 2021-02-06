function gistViewInputCheckbox() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/checkbox/checkbox.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputCheckbox', gistViewInputCheckbox);

