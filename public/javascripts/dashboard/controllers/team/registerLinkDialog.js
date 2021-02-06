angular.module('arraysApp').controller('RegisterLinkDialogController', [
    '$scope',
    '$mdDialog',
    'RegisterLink',
    '$document',
    '$mdToast',
    async ($scope, $mdDialog, RegisterLink, $document, $mdToast) => {
        $scope.link = '';
        $scope.error = '';

        $scope.hide = () => {
            $mdDialog.hide();
        };
        $scope.cancel = () => {
            $mdDialog.cancel();
        };

        try {
            const { link } = await RegisterLink.get().$promise;
            $scope.$apply(() => {
                $scope.link = link;
                $scope.error = '';
            });
        } catch ({ data }) {
            $scope.$apply(() => {
                $scope.error = data.error;
                $scope.link = '';
            });
        }

        $scope.copyToClipboard = (tag) => {
            const tempInput = $document[0].createElement('input');

            tempInput.setAttribute('value', tag);
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
    },
]);
