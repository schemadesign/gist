function gistViewInputToggle() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/toggle/toggle.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputToggle', gistViewInputToggle);
