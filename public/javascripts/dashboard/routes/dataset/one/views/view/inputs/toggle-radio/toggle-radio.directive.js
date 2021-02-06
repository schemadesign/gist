function gistViewInputToggleRadio() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/toggle-radio/toggle-radio.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputToggleRadio', gistViewInputToggleRadio);
