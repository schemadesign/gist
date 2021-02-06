function datasetConnectSalesforceCtrl($scope, Salesforce) {
    const { datasetUploadCtrl, datasetCtrl } = $scope;
    const connectSalesforceCtrl = this;

    connectSalesforceCtrl.fields = [];
    connectSalesforceCtrl.tables = [];
    connectSalesforceCtrl.selectedTable = '';
    connectSalesforceCtrl.selectedFields = [];
    connectSalesforceCtrl.selectedField = '';
    connectSalesforceCtrl.fieldSearchText = '';
    connectSalesforceCtrl.tableSearchText = '';
    connectSalesforceCtrl.connect = connect;
    connectSalesforceCtrl.getFields = getFields;
    connectSalesforceCtrl.tableQuerySearch = tableQuerySearch;
    connectSalesforceCtrl.fieldQuerySearch = fieldQuerySearch;

    Salesforce.getTables().$promise.then((data) => {
        connectSalesforceCtrl.tables = data.tables;
    });

    function tableQuerySearch() {
        return connectSalesforceCtrl.tables
            .filter(item => _.includes(item.toLowerCase(), connectSalesforceCtrl.tableSearchText.toLowerCase()));
    }

    function fieldQuerySearch() {
        return connectSalesforceCtrl.fields
            .filter(item => _.includes(item.toLowerCase(), connectSalesforceCtrl.fieldSearchText.toLowerCase()));
    }

    function getFields() {
        connectSalesforceCtrl.selectedFields = [];

        if (connectSalesforceCtrl.selectedTable) {
            Salesforce.getFields({ table: connectSalesforceCtrl.selectedTable }).$promise.then((data) => {
                connectSalesforceCtrl.fields = data.fields;
            });
        }
    }

    function connect() {
        const { selectedFields: fields, selectedTable: table } = connectSalesforceCtrl;

        return Salesforce.validateQuery({ fields, table }).$promise.then(({ totalSize }) => {
            if (!totalSize) {
                datasetCtrl.showSimpleToast('No data found for this section');
                return;
            }

            datasetUploadCtrl.onSalesforceEndpointSet({ fields, table, name: 'salesforce' });
        }).catch(() => {
            datasetCtrl.showSimpleToast();
        });
    }
}

angular
    .module('arraysApp')
    .controller('DatasetConnectSalesforceCtrl', datasetConnectSalesforceCtrl);
