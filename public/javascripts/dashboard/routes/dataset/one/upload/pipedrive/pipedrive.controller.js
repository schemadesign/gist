function datasetConnectPipedriveCtrl ($scope) {
    const { datasetUploadCtrl } = $scope;

    this.connect = selection => {
        _.invoke(datasetUploadCtrl, 'onPipedriveEndpointSet', selection);
    };
}

angular
    .module('arraysApp')
    .controller('DatasetConnectPipedriveCtrl', datasetConnectPipedriveCtrl);
