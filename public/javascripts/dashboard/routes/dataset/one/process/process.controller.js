function DatasetProcessCtrl($scope, $state, DatasetService) {
    const { datasetCtrl, datasetOneCtrl } = $scope;
    let fetchTimeout;

    this.datasets = [
        datasetOneCtrl.dataset,
        ...datasetOneCtrl.additionalDatasources,
    ];

    this.jobs = [];

    this.showAdvanced = false;
    this.toggleShowAdvanced = () => (this.showAdvanced = !this.showAdvanced);

    this.getDatasetUid = _id => _.get(_.find(this.datasets, { _id }), 'uid', '(unknown dataset)');

    const handleJobsDone = () => {
        Promise.all([
            DatasetService.get(datasetOneCtrl.dataset._id),
            DatasetService.getAdditionalSources(datasetOneCtrl.dataset._id),
        ])
            .then(([dataset, additionalSources]) => {
                datasetOneCtrl.setDataset(dataset);
                datasetOneCtrl.setAdditionalDatasources(additionalSources);

                datasetOneCtrl.redirectToAvailableStep();
            });
    };

    this.getJobs = (datasetIds) => {
        return Promise.all(datasetIds.map(DatasetService.getJob))
            .then((jobs) => {
                const failedJob = jobs.find(job => job && job.state === 'failed');

                if (failedJob) {
                    $state.go('dashboard.dataset.error', {
                        id: failedJob.data.id,
                        type: 'jobFailed',
                        errMsg: failedJob.error,
                    });
                    return;
                }

                this.jobs = jobs.filter(_.negate(_.isNil));

                if (_.isEmpty(this.jobs)) {
                    handleJobsDone();
                } else {
                    // setTimeout is more optimal here
                    // eslint-disable-next-line angular/timeout-service
                    fetchTimeout = setTimeout(() => this.getJobs(this.jobs.map(({ data }) => data.id)), 1000);
                }
            })
            .catch(() => {
                $state.go('dashboard.dataset.error', {
                    type: 'jobFailed',
                    errMsg: 'Job not found',
                });
            });
    };

    this.getJobs(this.datasets.map(({ _id }) => _id));

    this.toggleImageScraping = () =>
        DatasetService
            .update(datasetOneCtrl.dataset._id, {
                skipImageScraping: datasetOneCtrl.dataset.skipImageScraping,
            })
            .then(() => {
                datasetOneCtrl.originalDataset.skipImageScraping = datasetOneCtrl.dataset.skipImageScraping;
            })
            .catch(() => {
                datasetOneCtrl.dataset.skipImageScraping = datasetOneCtrl.originalDataset.skipImageScraping;
                datasetCtrl.showGenericErrorToast();
            });

    this.killJobs = () =>
        Promise.all(this.datasets.map(({ _id }) => DatasetService.killJob(_id)))
            .then(handleJobsDone)
            .catch(() => {
                datasetCtrl.showSimpleToast('Could not cancel current job - please contact support for more help.');
            });

    $scope.$on('$destroy', () => {
        clearTimeout(fetchTimeout);
    });
}

angular
    .module('arraysApp')
    .controller('DatasetProcessCtrl', DatasetProcessCtrl);
