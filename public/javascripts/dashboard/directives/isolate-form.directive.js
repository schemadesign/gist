function gistIsolateForm() {
    return {
        restrict: 'A',
        require: '?form',
        link(scope, element, attrs, ctrl) {
            if (!ctrl) {
                return;
            }

            const ctrlCopy = {};
            _.assignIn(ctrlCopy, ctrl);

            const parent = element.parent().controller('form');

            parent.$removeControl(ctrl);

            const isolatedFormCtrl = {
                $setValidity(validationToken, isValid, control) {
                    ctrlCopy.$setValidity(validationToken, isValid, control);
                    parent.$setValidity(validationToken, true, ctrl);
                },
                $setDirty() {
                    element.removeClass('ng-pristine').addClass('ng-dirty');
                    ctrl.$dirty = true;
                    ctrl.$pristine = false;
                },
            };
            _.assign(ctrl, isolatedFormCtrl);
        },
    };
}

angular.module('arraysApp')
    .directive('gistIsolateForm', gistIsolateForm);
