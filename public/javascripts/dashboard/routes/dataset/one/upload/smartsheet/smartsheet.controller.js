function datasetConnectSmartsheetCtrl($scope, $timeout, smartsheets) {
    const connectSmartsheetCtrl = this;
    const { datasetUploadCtrl } = $scope;
    const textHeight = 48;

    connectSmartsheetCtrl.sheet = {};
    connectSmartsheetCtrl.smartsheets = smartsheets;
    connectSmartsheetCtrl.selectSheet = selectSheet;
    connectSmartsheetCtrl.activeBox = activeBox;
    connectSmartsheetCtrl.connect = connect;

    $timeout(() => {
        $('.gist-pointer span').shave(textHeight);
    });

    function selectSheet(sheet) {
        connectSmartsheetCtrl.sheet = sheet;
    }

    function activeBox(sheetName) {
        return connectSmartsheetCtrl.sheet.name === sheetName;
    }

    function connect() {
        _.invoke(datasetUploadCtrl, 'onSmartsheetEndpointSet', connectSmartsheetCtrl.sheet);
    }
}

angular
    .module('arraysApp')
    .controller('DatasetConnectSmartsheetCtrl', datasetConnectSmartsheetCtrl);
