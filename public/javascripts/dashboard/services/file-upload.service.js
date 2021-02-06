(function () {
    angular
        .module('arraysApp')
        .service('FileUploadService', FileUploadService);

    FileUploadService.$inject = ['FileUploader', 'AssetService'];

    function FileUploadService(FileUploader, AssetService) {
        const createUploader = () => new FileUploader({
            method: 'PUT',
            disableMultipart: true,
            filters: [{
                name: 'imageFilter',
                fn: (item) => {
                    const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                    return '|jpg|png|jpeg|bmp|gif|svg+xml|pdf|'.indexOf(type) !== -1;
                },
            }],
        });

        const uploadFile = ({ fileItem, _uploader, model, modelId, assetType }) => {
            fileItem.uploadUrls = {};
            fileItem.assetType = this.assetType;
            fileItem.file.name = fileItem.file.name.replace(/\s+/g, '-');

            if (!fileItem.uploadUrls[fileItem.assetType]) {
                AssetService.getPutUrlForAssets(model, modelId, fileItem.file.type, assetType, fileItem.file.name)
                    .then(function (urlInfo) {

                        fileItem.uploadUrls[assetType] = {
                            url: urlInfo.putUrl,
                            publicUrl: urlInfo.publicUrl,
                        };
                        fileItem.url = fileItem.uploadUrls[assetType].url;
                        fileItem.headers['Content-Type'] = fileItem.file.type;
                        fileItem.headers['x-amz-acl'] = 'public-read';

                        _uploader.uploadAll();
                    })
                    .catch(function (err) {
                        _uploader.onGetSignedUrlError(err);
                    });
            }
        };

        const newUploader = function (assetType, formName, model, modelId) {
            const _uploader = createUploader();

            _uploader.onGetSignedUrlError = function (msg) {};

            _uploader.onAfterAddingFile = (fileItem) => {
                uploadFile({ fileItem, _uploader, model, modelId, assetType });
            };

            _uploader.formName = formName;
            _uploader.assetType = assetType;

            return _uploader;
        };

        const newUploaderWithResize = (assetType, formName, model, modelId, newWidth, newHeight) => {
            const _uploader = createUploader();

            _uploader.onGetSignedUrlError = function (msg) {};

            _uploader.onAfterAddingFile = function (fileItem) {
                const reader = new FileReader();
                reader.onload = () => {
                    const tempImg = new Image();
                    tempImg.src = reader.result;
                    tempImg.onload = (e) => {
                        fileItem._file = AssetService.resizeImage(e.path[0], newWidth, newHeight);
                        uploadFile({ fileItem, _uploader, model, modelId, assetType });
                    };
                };

                reader.readAsDataURL(fileItem._file);
            };

            _uploader.formName = formName;
            _uploader.assetType = assetType;

            return _uploader;
        };

        const entryImageUploader = function (assetType, formName, model, modelId, fileName) {
            const _uploader = newUploader(assetType, formName, model, modelId);

            _uploader.onAfterAddingFile = function (fileItem) {
                fileItem.uploadUrls = {};
                fileItem.assetType = assetType;
                fileItem.file.name = fileName;

                AssetService.getPutUrlForAssets(model, modelId, fileItem.file.type, fileItem.assetType, fileItem.file.name)
                    .then(function (urlInfo) {
                        fileItem.uploadUrls[fileItem.assetType] = {
                            url: urlInfo.putUrl,
                            publicUrl: urlInfo.publicUrl,
                        };
                        fileItem.url = fileItem.uploadUrls[fileItem.assetType].url;
                        fileItem.headers['Content-Type'] = fileItem.file.type;
                        fileItem.headers['x-amz-acl'] = 'public-read';

                        _uploader.uploadAll();
                    })
                    .catch(function (err) {
                        _uploader.onGetSignedUrlError(err);
                    });
            };
            return _uploader;
        };

        return {
            newUploader,
            newUploaderWithResize,
            entryImageUploader,
        };
    }
})();
