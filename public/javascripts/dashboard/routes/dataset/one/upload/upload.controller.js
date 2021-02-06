function DatasetUploadCtrl($scope, $mdDialog, $state, DatasetService, viewUrlService, Cron, previousDatasets, scheduledJob, FILE_TYPES) {
    const { datasetCtrl, datasetOneCtrl } = $scope;

    this.scheduledJob = scheduledJob;
    this.previousDatasets = previousDatasets.reverse();

    this.hasMainSource = () => {
        const { fileName, connection, apiEndPoint, smartsheet, pipedrive, datadotworld, salesforce } = datasetOneCtrl.dataset;

        return fileName || connection || apiEndPoint || smartsheet || pipedrive || datadotworld || salesforce;
    };

    this.hasAdditionalSource = () => !_.isEmpty(datasetOneCtrl.additionalDatasources);

    this.getDatasets = () => [
        datasetOneCtrl.dataset,
        ...datasetOneCtrl.additionalDatasources,
    ];

    this._isDownloading = {};
    this.isDownloading = (which) => _.get(this, ['_isDownloading', which], false);

    this.download = (which) => {
        this._isDownloading[which] = true;

        return DatasetService
            .download(datasetOneCtrl.dataset._id, which)
            .catch(datasetCtrl.showGenericErrorToast)
            .then(() => (this._isDownloading[which] = false));
    };

    this.isHome = () => $state.is('dashboard.dataset.one.upload');

    $scope.$watch(this.hasMainSource, hasMainSource =>
        datasetOneCtrl.form.$setValidity('_source', !!hasMainSource));

    this.openPrevious = (previousDataset) => {
        viewUrlService.openViewUrl(
            $scope.subdomain,
            Object.assign({ fe_filters: {} }, previousDataset),
            _.get(previousDataset, 'fe_views.default_view', 'gallery'),
        );
    };

    this.revertPrevious = (previousDataset, event) => {
        event.stopPropagation();

        datasetOneCtrl.pending = true;

        return DatasetService
            .revert(previousDataset.id, datasetOneCtrl.dataset._id)
            .then(({ data }) => {
                $state.go('dashboard.dataset.one.process', { id: data._id });
            })
            .catch(() => {
                datasetCtrl.showSimpleToast('Something went wrong when reverting to previous version');
            })
            .then(() => (datasetOneCtrl.pending = false));
    };

    this.reimportAPIDatasource = () => {
        datasetOneCtrl.pending = true;

        return DatasetService
            .save({
                _id: datasetOneCtrl.dataset._id,
                replacement: true,
                dirty: 1,
                tabDestination: 1,
            })
            .then(({ data = {} }) => {
                datasetOneCtrl.setDataset(data.dataset);
                $state.go('dashboard.dataset.one.process');
            })
            .catch(({ data }) => datasetCtrl.showSimpleToast(data.error))
            .then(() => (datasetOneCtrl.pending = false));
    };

    this.onMainFileUploadSuccess = (response) => {
        _.merge(datasetOneCtrl.dataset, response);

        datasetOneCtrl.originalDataset = _.cloneDeep(datasetOneCtrl.dataset);

        $state.go('dashboard.dataset.one.upload', { id: response._id });
    };

    this.onAdditionalFileUploadSuccess = (response) => {
        _.merge(datasetOneCtrl.additionalDatasources, [response]);

        datasetOneCtrl.originalAdditionalDatasources = _.cloneDeep(datasetOneCtrl.additionalDatasources);

        if (response.jobId) {
            $state.go('dashboard.dataset.one.process');
        } else {
            $state.go('dashboard.dataset.one.upload');
        }
    };

    this.onAncillaryFileUploadSuccess = (response) => {
        datasetOneCtrl.dataset.ancillaryFile = response.fileName;
        $state.go('dashboard.dataset.one.upload');
    };

    this.onConnectionSet = (connection, tables) => {
        _.assign(datasetOneCtrl.dataset, { connection, tables });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onAdditionalConnectionSet = (connection, tables) => {
        _.set(datasetOneCtrl.additionalDatasources, [0, 'connection'], connection);
        _.set(datasetOneCtrl.additionalDatasources, [0, 'tables'], tables);

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onApiEndpointSet = (apiEndPoint, JSONPath, format) => {
        _.merge(datasetOneCtrl.dataset, {
            apiEndPoint,
            JSONPath,
            format,
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onSmartsheetEndpointSet = smartsheet => {
        _.merge(datasetOneCtrl.dataset, {
            smartsheet,
            format: 'CSV',
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onPipedriveEndpointSet = pipedrive => {
        _.merge(datasetOneCtrl.dataset, {
            pipedrive,
            format: 'JSON',
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onSalesforceEndpointSet = salesforce => {
        _.merge(datasetOneCtrl.dataset, {
            salesforce,
            format: 'JSON',
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onDatadotworldEndpointSet = datadotworld => {
        _.merge(datasetOneCtrl.dataset, {
            datadotworld,
            format: 'JSON',
            JSONPath: '*',
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.onSocrataEndpointSet = (apiEndPoint, socrata) => {
        _.merge(datasetOneCtrl.dataset, {
            apiEndPoint,
            socrata,
            format: 'CSV',
        });

        datasetOneCtrl.form.$setDirty();
        $state.go('dashboard.dataset.one.upload');
    };

    this.removeDatasource = (event) => {
        const { dataset, originalDataset } = datasetOneCtrl;
        const removeConnection = () => {
            _.unset(dataset, 'connection');
            _.unset(dataset, 'tables');

            _.unset(originalDataset, 'connection');
            _.unset(originalDataset, 'tables');

            datasetOneCtrl.form.$setPristine();
            datasetCtrl.showSimpleToast('Remote datasource connection removed.');
        };
        const removeApiEndPoint = () => {
            _.unset(dataset, 'apiEndPoint');
            dataset.JSONPath = '*';

            _.unset(originalDataset, 'apiEndPoint');
            originalDataset.JSONPath = '*';

            datasetOneCtrl.form.$setPristine();
            datasetCtrl.showSimpleToast('API source removed.');
        };

        if (dataset.connection && !originalDataset.connection) {
            removeConnection();
        } else if (dataset.apiEndPoint && !originalDataset.connection) {
            removeApiEndPoint();
        } else {
            return $mdDialog.show({
                templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/remove-source-dialog.template.html',
                targetEvent: event,
                clickOutsideToClose: true,
                controller: function ($scope, $mdDialog) {
                    $scope.apiEndPoint = dataset.apiEndPoint;
                    $scope.connection = dataset.connection;
                    $scope.hide = () => $mdDialog.hide();
                    $scope.cancel = () => $mdDialog.cancel();
                },
            })
                .then(() => {
                    return DatasetService
                        .deleteSource(dataset._id)
                        .then(() => {
                            if (originalDataset.connection) {
                                removeConnection();
                            } else if (originalDataset.apiEndPoint) {
                                removeApiEndPoint();
                            }
                        })
                        .catch(datasetCtrl.showGenericErrorToast);
                })
                .catch(angular.noop);
        }
    };

    this.openSchedulerModal = (event) => {
        return $mdDialog.show({
            controller: 'SchedulerDialogCtrl',
            templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/scheduler-dialog/scheduler-dialog.template.html',
            clickOutsideToClose: true,
            fullscreen: true,
            targetEvent: event,
            locals: { scheduledJob: this.scheduledJob },
        })
            .then(({ command, action, cronTime }) => {
                if (command === 'time') {
                    if (this.scheduledJob && this.scheduledJob._id) {
                        this.scheduledJob.cronTime = cronTime;
                    } else {
                        this.scheduledJob = new Cron({
                            cronTime,
                            datasetId: datasetOneCtrl.dataset._id,
                        });
                    }

                    return this.scheduledJob.$save()
                        .then(() => datasetCtrl.showSimpleToast('Automated job saved!'))
                        .catch(datasetCtrl.showGenericErrorToast);
                }

                if (command === 'schedule') {
                    return Cron.update({ id: this.scheduledJob._id }, { command: action, cronTime })
                        .$promise
                        .then((job) => {
                            this.scheduledJob = job;
                            datasetCtrl.showSimpleToast(`Automated job ${action}d!`);
                        })
                        .catch(datasetCtrl.showGenericErrorToast);
                }

                if (command === 'remove') {
                    return Cron.remove({ id: this.scheduledJob._id })
                        .$promise
                        .then(() => {
                            this.scheduledJob = null;
                            datasetCtrl.showSimpleToast(`Automated job ${command}d!`);
                        })
                        .catch(datasetCtrl.showGenericErrorToast);
                }
            })
            .catch(angular.noop);
    };

    this.parseFileUrl = (url) => {
        return url.replace(/\/export\?format=(csv|tsv|json)/, '');
    };

    this.getTypeFromFileFormat = () => {
        return _.defaultTo(FILE_TYPES[datasetOneCtrl.dataset.format.toLowerCase()].type, 'spreadsheet');
    };
}

angular.module('arraysApp')
    .controller('DatasetUploadCtrl', DatasetUploadCtrl);
