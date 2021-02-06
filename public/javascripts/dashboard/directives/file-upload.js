angular.module('arraysApp')
    .directive('fileUpload', ['FileUploadService', 'Page', '$mdToast', function(FileUploadService, Page, $mdToast) {
        return {
            scope: {
                imageType: '@',
                existingImage: '=',
                page: '=',
                uploadText: '@',
                form: '='
            },
            compile: function() {
                return {
                    pre: function(scope) {
                        scope.imageUploader = FileUploadService.newUploader(scope.imageType, 'markdownForm', 'page', scope.page._id);

                        scope.imageUploader.onCompleteItem = function(fileItem, response, status) {
                            if (status == 200) {
                                const asset = fileItem.assetType || scope.imageType || 'image';

                                scope.existingImage = fileItem.uploadUrls[asset].publicUrl;
                                scope.form.$setDirty();

                                $mdToast.show(
                                    $mdToast.simple()
                                        .textContent('Image uploaded!')
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                            }
                        };
                    },
                    post: function(scope) {
                        scope.deleteFile = function() {
                            const fileName = scope.existingImage.split(`${scope.imageType}/`)[1];
                            Page.deleteImage({ id: scope.page._id, folder: scope.imageType, fileName: fileName })
                                .then(function() {
                                    $mdToast.show(
                                        $mdToast.simple()
                                            .textContent('Image deleted.')
                                            .position('top right')
                                            .hideDelay(3000)
                                    );

                                    scope.form.$setDirty();
                                    scope.existingImage = null;
                                });
                        };
                    }
                };
            },
            templateUrl: 'templates/blocks/file-upload.html'
        };
    }]);
