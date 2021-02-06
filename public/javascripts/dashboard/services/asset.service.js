(function () {
    angular
        .module('arraysApp')
        .service('AssetService', AssetService);

    AssetService.$inject = ['$http', '$q'];

    function AssetService($http, $q) {

        const deleteImage = function (id, folder, fileName) {
            const deferred = $q.defer();
            $http.get('api/team/deleteImage/' + id + '/' + folder + '/' + fileName)
                .then(function (response) {
                    return deferred.resolve(response.data);
                }, function (response) {
                    return deferred.reject(response.data.error);
                });
            return deferred.promise;
        };

        const loadIcons = function () {
            return $http.get('/api/team/loadIcons')
                .then(function (response) {
                    return response.data.iconsUrl;
                })
                .catch(function (response) {
                    return response.data.error;
                });
        };

        const getPutUrlForAssets = function (model, id, fileType, assetType, fileName) {

            const deferred = $q.defer();
            $http.get('api/' + model + '/getAssetUploadSignedUrl/' + id + '?fileType=' + fileType + '&assetType=' + assetType + '&fileName=' + fileName)
                .then(function (response) {
                    if (response.data.putUrl && response.data.publicUrl) {
                        return deferred.resolve(response.data);
                    } else {
                        return deferred.reject();
                    }
                }, function (response) {
                    return deferred.reject(response.data.error);
                });
            return deferred.promise;
        };

        const deleteBanner = function (id, key) {
            const deferred = $q.defer();
            $http.get('api/dataset/deleteBanner/' + id)
                .then(function (response) {
                    return deferred.resolve(response.data);
                }, function (response) {
                    return deferred.reject(response.data.error);
                });
            return deferred.promise;
        };

        const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
            const byteCharacters = atob(b64Data);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
                const byteNumbers = new Array(slice.length);

                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);

                byteArrays.push(byteArray);
            }

            return new Blob(byteArrays, { type: contentType });
        };

        const cropImage = ({ width, height, newWidth, newHeight, context, imgObj }) => {
            const moveX = width < newWidth ? 0 : (width - newWidth) / 2;
            const moveY = height < newHeight ? 0 : (height - newHeight) / 2;

            context.drawImage(imgObj, moveX, moveY, newWidth, newHeight, 0, 0, newWidth, newHeight);
        };

        const resizeAndCropImage = ({ width, height, newWidth, newHeight, context, imgObj }) => {
            const ratio = (newWidth / width * height) > newHeight ? newWidth / width : newHeight / height;
            const resizedWidth = width * ratio;
            const resizedHeight = height * ratio;
            const moveX = resizedWidth < newWidth ? 0 : (resizedWidth - newWidth) / 2;
            const moveY = resizedHeight < newHeight ? 0 : (resizedHeight - newHeight) / 2;

            context.drawImage(imgObj, moveX, moveY, width, height, 0, 0, resizedWidth, resizedHeight);
        };


        const resizeImage = (imgObj, newWidth, newHeight) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const { width, height } = imgObj;

            canvas.width = newWidth;
            canvas.height = newHeight;

            if (width < newWidth || height < newHeight) {
                cropImage({ width, height, newWidth, newHeight, context, imgObj });
            } else {
                resizeAndCropImage({ width, height, newWidth, newHeight, context, imgObj });
            }

            const dataURL = canvas.toDataURL('image/png', 1);
            const n = dataURL.indexOf(',');
            const data = dataURL.toString().substring(n + 1);

            return b64toBlob(data, 'image/png');
        };

        return {
            loadIcons,
            getPutUrlForAssets,
            deleteImage,
            deleteBanner,
            resizeImage,
        };
    }
})();
