function ContentCtrl($scope, DATA_TYPES, ADVANCED_DATA_TYPES) {
    const contentCtrl = this;
    const { datasetOneCtrl } = $scope;

    contentCtrl.operationToString = operationToString;
    contentCtrl.fields = datasetOneCtrl.getSortedColumns();

    function operationToString(operation) {
        const dataTypes = [...ADVANCED_DATA_TYPES, ...DATA_TYPES];
        const dataType = _.find(dataTypes, ((type) => type.operation === operation));

        return dataType ? dataType.data_type : 'Text';
    }
}

angular.module('arraysApp')
    .controller('ContentCtrl', ContentCtrl);
