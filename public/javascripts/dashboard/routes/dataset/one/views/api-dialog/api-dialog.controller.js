function ApiDialogController($scope, $mdDialog, $document, $mdToast, dataset) {
    $scope.link = `${location.origin}/api/download/${dataset._team._id}/${dataset.uid}`;

    $scope.cancel = () => {
        $mdDialog.hide();
    };

    $scope.copyToClipboard = (link) => {
        const tempInput = $document[0].createElement('input');

        tempInput.setAttribute('value', link);
        $document[0].body.appendChild(tempInput);
        tempInput.select();
        $document[0].execCommand('copy');
        $mdToast.show(
            $mdToast.simple()
                .textContent('Copied')
                .position('top right')
                .hideDelay(3000),
        );
        $document[0].body.removeChild(tempInput);
    };
}

angular.module('arraysApp')
    .controller('ApiDialogController', ApiDialogController);
