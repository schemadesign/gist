function DatasetConnectDatabaseCtrl ($scope, $state, DatasetService) {
    const { datasetCtrl, datasetOneCtrl, datasetUploadCtrl } = $scope;
    const { successInvokePath } = $state.params;

    this.connection = _.defaults({}, _.clone(datasetOneCtrl.dataset.connection), {
        type: 'hadoop',
        url: '',
        connected: false,
    });

    this.tables = _.get(datasetOneCtrl.dataset, 'tables', []);

    this.handleUrlChange = () => {
        this.tables = undefined;
        this.connection.connected = false;
    };

    this.connect = () => {
        this.pending = true;

        return DatasetService.connectToRemoteDatasource(datasetOneCtrl.dataset._id, this.connection)
            .then(({ data }) => {
                this.connection.connected = true;
                this.tables = data;
                this.connection.tableName = _.get(this.tables, [0, 'name']);
            })
            .catch((response) => {
                datasetCtrl.showSimpleToast(_.get(response, 'data.error', 'Could not connect to remote database'));
            })
            .then(() => (this.pending = false));
    };

    this.save = () => {
        _.invoke(datasetUploadCtrl, successInvokePath, this.connection, this.tables);
    };
}

angular
    .module('arraysApp')
    .controller('DatasetConnectDatabaseCtrl', DatasetConnectDatabaseCtrl);
