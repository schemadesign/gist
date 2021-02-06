function gistViewInputAnnotationsOverlayText() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/annotations-overlay-text/annotations-overlay-text.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputAnnotationsOverlayText', gistViewInputAnnotationsOverlayText);
