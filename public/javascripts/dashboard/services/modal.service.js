function modalService($mdDialog) {
    const openFieldDialog = function ({ fieldName, firstRecord, dataset, custom, customFieldIndex, filterOnly, user }) {
        const fieldTemplate = filterOnly ? 'templates/blocks/data.field.filter.html' : 'templates/blocks/data.field.general.html';
        return $mdDialog.show({
            controller: 'FieldDialogCtrl',
            controllerAs: 'dialog',
            templateUrl: fieldTemplate,
            clickOutsideToClose: true,
            fullscreen: true,
            locals: {
                fieldName,
                firstRecord,
                dataset,
                custom,
                customFieldIndex,
                filterOnly,
                user,
            },
        });
    };

    const openNestedDialog = function ({ dataset, additionalDatasources }) {
        return $mdDialog.show({
            controller: 'NestedDialogCtrl',
            controllerAs: 'dialog',
            templateUrl: 'templates/blocks/data.nested.html',
            clickOutsideToClose: true,
            fullscreen: true, // Only for -xs, -sm breakpoints.
            locals: {
                dataset,
                additionalDatasources,
            },
        });
    };

    const openJoinDialog = function ({ dataset }) {
        return $mdDialog.show({
            controller: 'JoinDialogCtrl',
            controllerAs: 'dialog',
            templateUrl: 'templates/blocks/data.join.html',
            clickOutsideToClose: true,
            fullscreen: true, // Only for -xs, -sm breakpoints.
            locals: {
                dataset,
            },
        });
    };

    const openNewFieldDialog = function ({ dataType, name, dataTypes }) {
        return $mdDialog.show({
            templateUrl: 'templates/blocks/data.newField.html',
            clickOutsideToClose: true,
            fullscreen: true,
            controller($scope, $mdDialog) {
                $scope.dataTypes = dataTypes.map(({ data_type }) => data_type);
                $scope.field = {
                    name,
                    dataType,
                };
                $scope.hide = () => $mdDialog.hide($scope.field);
                $scope.cancel = () => $mdDialog.cancel();
            },
        });
    };

    const openDrupalTagsDialog = function ({ drupalTags, copyToClipboard }) {
        return $mdDialog.show({
            templateUrl: 'templates/blocks/drupalTags.html',
            clickOutsideToClose: true,
            fullscreen: true,
            controller($scope) {
                $scope.drupalTags = drupalTags;
                $scope.copyToClipboard = copyToClipboard;
                $scope.cancel = () => $mdDialog.cancel();
            },
        });
    };

    const equals = a => b => _.isEqual(a, b);

    const openDialog = (type, data) => _.cond([
        [equals('field'), () => openFieldDialog(data)],
        [equals('nested'), () => openNestedDialog(data)],
        [equals('join'), () => openJoinDialog(data)],
        [equals('newField'), () => openNewFieldDialog(data)],
        [equals('drupalTags'), () => openDrupalTagsDialog(data)],
    ])(type);

    const openConfirmModal = function (title, message, cancelText, confirmText) {
        return $mdDialog.confirm({
            controller: function ($scope, $mdDialog) {
                $scope.title = title;
                $scope.message = message;
                $scope.cancelText = cancelText;
                $scope.confirmText = confirmText;

                $scope.hide = () => $mdDialog.hide();
                $scope.cancel = () => $mdDialog.cancel();
            },
            templateUrl: 'templates/general-templates/confirm-template.html',
            parent: angular.element(document.body),
            fullscreen: true,
            multiple: true,
            clickOutsideToClose: true,
        });
    };

    return {
        openDialog,
        openConfirmModal,
    };
}

angular
    .module('arraysApp')
    .factory('modalService', modalService);
