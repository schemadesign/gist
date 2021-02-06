function gistViewInputAnnotationsBenchmarks($mdDialog, $document, modalService) {
    return {
        restrict: 'E',
        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/inputs/annotations-benchmarks/annotations-benchmarks.template.html',
        controller($scope) {
            const { viewCtrl } = $scope;

            $scope.editBenchmark = editBenchmark;
            $scope.deleteBenchmark = deleteBenchmark;

            // used for both new and edit
            // benchmark is null for new
            function editBenchmark(benchmark, evt) {
                $mdDialog
                    .show({
                        multiple: true,
                        templateUrl: 'javascripts/dashboard/routes/dataset/one/views/view/edit-benchmark/edit-benchmark.template.html',
                        parent: angular.element($document[0].body),
                        targetEvent: evt,
                        clickOutsideToClose: true,
                        fullscreen: true,
                        locals: {
                            benchmark,
                        },
                        controller: 'EditBenchmarkController',
                        controllerAs: 'editBenchmarkController',
                    })
                    .then((savedBenchmark) => {
                        if (savedBenchmark) {
                            if (benchmark) {
                                // edit
                                benchmark.label = savedBenchmark.label;
                                benchmark.value = savedBenchmark.value;
                            } else {
                                // new
                                viewCtrl.data.annotations.benchmarks.push(savedBenchmark);
                            }
                        }
                    })
                    .catch(_.noop);
            }

            function deleteBenchmark(benchmark) {
                const confirm = modalService.openConfirmModal(
                    'Delete Benchmark',
                    `Are you sure you want to delete the "${benchmark.label}" benchmark?`,
                    'Cancel',
                    'Delete',
                );

                $mdDialog
                    .show(confirm)
                    .then(() => {
                        const index = viewCtrl.data.annotations.benchmarks.indexOf(benchmark);
                        viewCtrl.data.annotations.benchmarks.splice(index, 1);
                    })
                    .catch(_.noop);
            }
        },
    };
}

angular.module('arraysApp')
    .directive('gistViewInputAnnotationsBenchmarks', gistViewInputAnnotationsBenchmarks);
