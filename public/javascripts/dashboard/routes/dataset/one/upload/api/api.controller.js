function DatasetConnectApiCtrl($scope, DatasetService) {
    const { datasetCtrl, datasetOneCtrl, datasetUploadCtrl } = $scope;

    this.fileType = 'csv';
    this.connected = false;
    this.endpoint = '';
    this.customPath = '';

    this.handleEndpointChange = () => {
        this.possiblePaths = undefined;
        this.path = undefined;
        this.connected = false;
    };

    this.hasPossiblePaths = () => !_.isEmpty(this.possiblePaths);

    this.connect = () => {
        if (this.fileType === 'json' && !this.path) {
            this.pending = true;

            return DatasetService.readJSON(datasetOneCtrl.dataset._id, {
                url: this.endpoint,
            }).then(({ data }) => {
                this.connected = true;
                this.possiblePaths = data;
                this.path = _.first(this.possiblePaths);
            }).catch(() => {
                datasetCtrl.showSimpleToast(
                    'Problem with connecting to the endpoint',
                );
            }).then(() => (this.pending = false));
        }

        const path = this.customPath.length ? this.customPath : this.path;

        _.invoke(
            datasetUploadCtrl,
            'onApiEndpointSet',
            this.endpoint,
            path,
            this.fileType.toUpperCase(),
        );
    };
}

angular.module('arraysApp').controller('DatasetConnectApiCtrl', DatasetConnectApiCtrl);
