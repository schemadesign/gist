function gistViewInputSlider() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/slider/slider.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputSlider', gistViewInputSlider);
