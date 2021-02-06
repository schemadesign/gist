function gistViewInputColorpicker() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/colorpicker/colorpicker.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputColorpicker', gistViewInputColorpicker);
