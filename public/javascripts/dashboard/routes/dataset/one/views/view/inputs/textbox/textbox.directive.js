function gistViewInputTextbox() {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/textbox/textbox.template.html',
    };
}

angular.module('arraysApp')
    .directive('gistViewInputTextbox', gistViewInputTextbox);
