function DatasetConnectGoogleSheetCtrl($scope) {
    const { datasetUploadCtrl } = $scope;

    this.endpoint = '';

    this.connect = () => {
        const [, url, sheetId] = this.endpoint.match(/^(.*)\/d\/([^/]*)\/?/) || [];

        if (!url || !sheetId) {
            this.form.endpoint.$setValidity('url', false);
            return;
        }

        const preparedUrl = `${url}/d/${sheetId}/export?format=csv`;

        _.invoke(datasetUploadCtrl, 'onApiEndpointSet', preparedUrl, undefined, 'CSV');
    };
}

angular
    .module('arraysApp')
    .controller('DatasetConnectGoogleSheetCtrl', DatasetConnectGoogleSheetCtrl);
