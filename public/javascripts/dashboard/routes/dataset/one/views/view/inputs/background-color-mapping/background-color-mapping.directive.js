function gistViewInputBackgroundColorMapping() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/background-color-mapping/background-color-mapping.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputBackgroundColorMapping', gistViewInputBackgroundColorMapping);
