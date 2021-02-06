function datasetConnectDatadotworldCtrl($scope, datasets, Datadotworld, $timeout) {
    const connectDatadotworldCtrl = this;
    const { datasetUploadCtrl } = $scope;
    const textHeight = 48;

    connectDatadotworldCtrl.queries = [];
    connectDatadotworldCtrl.tables = [];
    connectDatadotworldCtrl.datadotworld = {};
    connectDatadotworldCtrl.datasets = datasets;
    connectDatadotworldCtrl.activeBox = key => _.includes(connectDatadotworldCtrl.datadotworld, key);
    connectDatadotworldCtrl.loadDatasetInfo = loadDatasetInfo;
    connectDatadotworldCtrl.selectQuery = selectQuery;
    connectDatadotworldCtrl.selectTable = selectTable;
    connectDatadotworldCtrl.connect = connect;

    shaveCopy();

    function shaveCopy() {
        $timeout(() => {
            $('.gist-pointer span').shave(textHeight);
            $('.upload-options-wrapper span').shave(textHeight);
        });
    }

    function loadDatasetInfo(dataset) {
        connectDatadotworldCtrl.datadotworld = {
            owner: dataset.owner,
            id: dataset.id,
            name: dataset.title,
        };
        connectDatadotworldCtrl.queries = Datadotworld.getQueries({ id: dataset.id, owner: dataset.owner });
        connectDatadotworldCtrl.tables = Datadotworld.getTables({ id: dataset.id, owner: dataset.owner });

        shaveCopy();
    }

    function selectQuery(query) {
        _.assign(connectDatadotworldCtrl.datadotworld, {
            query: query.body,
            queryName: query.name,
            language: query.language,
        });
        _.unset(connectDatadotworldCtrl.datadotworld, 'table');
    }

    function selectTable(tableName) {
        _.assign(connectDatadotworldCtrl.datadotworld, {
            table: tableName,
            language: 'sql',
        });
        _.unset(connectDatadotworldCtrl.datadotworld, 'query');
        _.unset(connectDatadotworldCtrl.datadotworld, 'queryName');
    }

    function connect() {
        _.invoke(datasetUploadCtrl, 'onDatadotworldEndpointSet', connectDatadotworldCtrl.datadotworld);
    }
}

angular
    .module('arraysApp')
    .controller('DatasetConnectDatadotworldCtrl', datasetConnectDatadotworldCtrl);
