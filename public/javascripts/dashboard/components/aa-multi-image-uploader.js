(function() {
    function ArraysAppMultiImageUploaderCtrl() {
        var ctrl = this;

        ctrl.delete = function(src) {
            ctrl.onDelete(src);
        };

        // Disable sorting if no options given
        ctrl.$onInit = function() {
            ctrl.isSortable = !!ctrl.sortableOptions;
            ctrl.sortableOptions = ctrl.sortableOptions || { disabled: true };
        };
    }

    angular.module('arraysApp')
        .component('aaMultiImageUploader', {
            templateUrl: 'templates/components/aa-multi-image-uploader.html',
            controller: ArraysAppMultiImageUploaderCtrl,
            bindings: {
                buttonLabel: '@',
                // an array of urls
                sources: '=',
                // a FileUploader
                uploader: '=',
                // use '=', on-delete="callback"
                // not '&', on-delete="callback(src)"
                onDelete: '=',
                sortableOptions: '<'
            },
        });
}());
