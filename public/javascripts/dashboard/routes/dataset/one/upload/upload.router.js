angular
    .module('arraysApp')
    .config(['$stateProvider',
        function ($stateProvider) {
            $stateProvider
                .state('dashboard.dataset.one.upload', {
                    url: '/upload',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/upload.template.html',
                    controller: 'DatasetUploadCtrl as datasetUploadCtrl',
                    resolve: {
                        scheduledJob: function ($transition$, Cron) {
                            return Cron.get({ datasetId: $transition$.params().id });
                        },
                        previousDatasets: function (DatasetService, $transition$) {
                            return DatasetService
                                .getPreviousDatasets($transition$.params().id)
                                .then(({ data }) => data);
                        },
                    },
                })
                .state('dashboard.dataset.one.upload.main', {
                    abstract: true,
                    controller: function ($state, $scope) {
                        const { datasetUploadCtrl } = $scope;

                        /**
                         * Prevent opening main upload view if dataset has its main source
                         */
                        if (datasetUploadCtrl.hasMainSource()) {
                            $state.go('dashboard.dataset.one.upload', null, { location: 'replace' });
                        }
                    },
                })
                .state('dashboard.dataset.one.upload.main.file', {
                    url: '/file',
                    controller: 'DatasetUploadFileCtrl as uploadFileCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/file/file.template.html',
                    params: {
                        title: 'Upload Data Source',
                        successInvokePath: 'onMainFileUploadSuccess',
                    },
                })
                .state('dashboard.dataset.one.upload.main.database', {
                    url: '/database',
                    controller: 'DatasetConnectDatabaseCtrl as connectDatabaseCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/database/database.template.html',
                    params: {
                        successInvokePath: 'onConnectionSet',
                    },
                })
                .state('dashboard.dataset.one.upload.main.api', {
                    url: '/api',
                    controller: 'DatasetConnectApiCtrl as connectApiCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/api/api.template.html',
                })
                .state('dashboard.dataset.one.upload.main.googlesheet', {
                    url: '/api',
                    controller: 'DatasetConnectGoogleSheetCtrl as connectGoogleSheetCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/google-sheet/google-sheet.template.html',
                })
                .state('dashboard.dataset.one.upload.main.smartsheet', {
                    url: '/smartsheet',
                    controller: 'DatasetConnectSmartsheetCtrl as connectSmartsheetCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/smartsheet/smartsheet.template.html',
                    resolve: {
                        smartsheets: (Smartsheet) => {
                            return Smartsheet.get().$promise.then(({ data }) => data);
                        },
                    },
                })
                .state('dashboard.dataset.one.upload.main.pipedrive', {
                    url: '/pipedrive',
                    controller: 'DatasetConnectPipedriveCtrl as connectPipedriveCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/pipedrive/pipedrive.template.html',
                })
                .state('dashboard.dataset.one.upload.main.datadotworld', {
                    url: '/datadotworld',
                    controller: 'DatasetConnectDatadotworldCtrl as connectDatadotworldCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/datadotworld/datadotworld.template.html',
                    resolve: {
                        datasets: (Datadotworld) => {
                            return Datadotworld.get().$promise.then(({ records }) => records);
                        },
                    },
                })
                .state('dashboard.dataset.one.upload.main.salesforce', {
                    url: '/salesforce',
                    controller: 'DatasetConnectSalesforceCtrl as connectSalesforceCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/salesforce/salesforce.template.html',
                })
                .state('dashboard.dataset.one.upload.main.socrata', {
                    url: '/socrata',
                    controller: 'DatasetConnectSocrataCtrl as connectSocrataCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/socrata/socrata.template.html',
                })
                .state('dashboard.dataset.one.upload.main.tokenCheck', {
                    url: '/token/:type',
                    controller: 'DatasetTokenCheckCtrl as tokenCheckCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/token-check/token-check.template.html',
                })
                .state('dashboard.dataset.one.upload.replace', {
                    url: '/replace/:type',
                    controller: 'DatasetUploadFileCtrl as uploadFileCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/file/file.template.html',
                    params: {
                        title: 'Replace Data Source',
                        uploadParams: { replacement: true },
                        successInvokePath: 'onMainFileUploadSuccess',
                    },
                })
                .state('dashboard.dataset.one.upload.additional', {
                    abstract: true,
                    params: {
                        uploadParams: { child: true },
                    },
                })
                .state('dashboard.dataset.one.upload.additional.file', {
                    url: '/additional/file',
                    controller: 'DatasetUploadFileCtrl as uploadFileCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/file/file.template.html',
                    params: {
                        title: 'Upload Additional Data Source',
                        type: 'spreadsheet',
                        successInvokePath: 'onAdditionalFileUploadSuccess',
                    },
                })
                .state('dashboard.dataset.one.upload.additional.database', {
                    url: '/additional/database',
                    controller: 'DatasetConnectDatabaseCtrl as connectDatabaseCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/database/database.template.html',
                    params: {
                        successInvokePath: 'onAdditionalConnectionSet',
                    },
                })
                .state('dashboard.dataset.one.upload.ancillary', {
                    url: '/ancillary/file',
                    controller: 'DatasetUploadFileCtrl as uploadFileCtrl',
                    templateUrl: 'javascripts/dashboard/routes/dataset/one/upload/file/file.template.html',
                    params: {
                        title: 'Upload Ancillary File',
                        uploadEndpoint: '/api/dataset/uploadAncillaryFile',
                        successInvokePath: 'onAncillaryFileUploadSuccess',
                    },
                });
        }],
    );
