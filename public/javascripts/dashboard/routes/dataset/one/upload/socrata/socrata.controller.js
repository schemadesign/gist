function datasetConnectSocrataCtrl($scope, $timeout, Socrata) {
    const connectSocrataCtrl = this;
    const { datasetUploadCtrl, datasetCtrl, datasetOneCtrl } = $scope;
    const textHeight = 125;

    connectSocrataCtrl.socrata = null;
    connectSocrataCtrl.apiEndPoint = '';
    connectSocrataCtrl.loading = false;
    connectSocrataCtrl.resultSetSize = null;
    connectSocrataCtrl.paginationLimit = 21;
    connectSocrataCtrl.searchTerm = '';
    connectSocrataCtrl.searchOffset = 0;
    connectSocrataCtrl.searchResults = [];
    connectSocrataCtrl.currentPage = 1;
    connectSocrataCtrl.activeBox = key => _.get(connectSocrataCtrl, 'socrata.id', '') === key.id;
    connectSocrataCtrl.selectDataset = selectDataset;
    connectSocrataCtrl.search = search;
    connectSocrataCtrl.connect = connect;

    function selectDataset(dataset) {
        connectSocrataCtrl.socrata = dataset.resource;
        connectSocrataCtrl.apiEndPoint = `https://${dataset.metadata.domain}/resource/${dataset.resource.id}.csv`;
    }

    async function search() {
        try {
            connectSocrataCtrl.socrata = null;
            connectSocrataCtrl.resultSetSize = null;
            connectSocrataCtrl.searchResults = [];
            datasetOneCtrl.form.$setPristine();

            if (!connectSocrataCtrl.searchTerm.length) {
                return;
            }

            connectSocrataCtrl.loading = true;

            const response = await Socrata.get({
                q: connectSocrataCtrl.searchTerm,
                offset: connectSocrataCtrl.paginationLimit * (connectSocrataCtrl.currentPage - 1),
            }).$promise;

            connectSocrataCtrl.searchResults = response.results;
            connectSocrataCtrl.resultSetSize = response.resultSetSize;
            connectSocrataCtrl.loading = false;

            $timeout(() => {
                $('.upload-options-wrapper span').shave(textHeight);
            });

            $scope.$digest();
        } catch (e) {
            datasetCtrl.showSimpleToast('Could\'t get datasets from Socrata');
        }
    }

    function connect() {
        _.invoke(datasetUploadCtrl, 'onSocrataEndpointSet', connectSocrataCtrl.apiEndPoint, connectSocrataCtrl.socrata);
    }
}

angular
    .module('arraysApp')
    .controller('DatasetConnectSocrataCtrl', datasetConnectSocrataCtrl);
