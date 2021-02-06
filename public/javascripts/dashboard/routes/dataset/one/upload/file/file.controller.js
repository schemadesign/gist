function DatasetUploadFileCtrl($scope, $state, $mdDialog, AuthService, FileUploader) {
    const { datasetCtrl, datasetOneCtrl, datasetUploadCtrl } = $scope;
    const { title, uploadEndpoint = '/api/dataset/upload', uploadParams = {}, successInvokePath } = $state.params;

    this.helpMessage = `
        Prepare your spreadsheet for upload by exporting it as a CSV (comma-separated) or TSV (tab-separated) file.
        Click below to select your CSV or TSV file.`;

    this.progressMode = 'determinate';
    this.JSONPath = '*';
    this.inputAccept = '.csv, .tsv, text/csv, text/csv-schema, text/tsv';

    this.getTitle = () => title;
    this.hasFile = () => !_.isEmpty(this.uploader.queue);
    this.getUploadItem = () => _.first(this.uploader.queue);
    this.getFileType = () => _.get(this.getUploadItem(), 'file.type', '*');
    this.getFileName = () => _.get(this.getUploadItem(), 'file.name', 'No file selected');

    if ($scope.user.role === 'superAdmin' || $scope.team.isEnterprise) {
        this.inputAccept += ', .json, application/json';
        this.helpMessage += '\nJSON files may also be uploaded here.';
    }

    this.uploader = new FileUploader({
        url: uploadEndpoint,
        // TODO Probably should add replaced_id in case of replacing additionalDatasource.
        //  Leaving it for now because there's no way to do it from UI.
        formData: [{ id: datasetOneCtrl.dataset._id, ..._.pick(uploadParams, ['replacement', 'child']) }],
        queueLimit: 1,
        headers: {
            Authorization: `Bearer ${AuthService.getToken()}`,
        },
    });

    this.uploader.onCompleteItem = ({ file }, response, status) => {
        this.progressMode = 'determinate';

        if (response.user) {
            AuthService.updateUser(response.user);
        }

        // In case when user cancelled the upload.
        if (!status) {
            return;
        }

        if (status !== 200) {
            $state.go('dashboard.dataset.error', {
                id: datasetOneCtrl.dataset._id,
                type: 'badFormat',
                errMsg: _.get(response, 'error', 'An error occurred'),
                returnTo: 'dashboard.dataset.one.upload',
            });
            return;
        }

        _.invoke(datasetUploadCtrl, successInvokePath, _.omit(response, ['missingSamples']));

        if (_.isEmpty(response.missingSamples) && _.isEmpty(response.overrideColumns)) {
            datasetCtrl.showSimpleToast(`${file.name} uploaded!`);
            return;
        }

        $mdDialog.show({
            templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/warning-dialog.template.html',
            clickOutsideToClose: true,
            controller($scope) {
                $scope.missingSamples = response.missingSamples;
                $scope.overrideColumns = response.overrideColumns;
                $scope.fileName = file.name;
                $scope.hide = () => $mdDialog.hide();
                $scope.cancel = () => $mdDialog.cancel();
            },
        });
    };

    this.uploader.onErrorItem = (item, { message }) => {
        datasetCtrl.showSimpleToast(message);
    };

    this.uploader.onWhenAddingFileFailed = (item, filter) => {
        if (filter.name === 'queueLimit') {
            this.uploader.clearQueue();
            this.uploader.addToQueue(item);
        } else {
            datasetCtrl.showGenericErrorToast();
        }
    };

    this.uploader.onBeforeUploadItem = item => {
        Object.assign(item.formData[0], { JSONPath: this.JSONPath });
    };

    this.uploader.onProgressAll = progress => {
        if (progress === 100) {
            this.progressMode = 'indeterminate';
        }
    };

    $scope.$on('$destroy', () => {
        this.uploader.cancelAll();
        this.uploader.destroy();
    });
}

angular.module('arraysApp').controller('DatasetUploadFileCtrl', DatasetUploadFileCtrl);
