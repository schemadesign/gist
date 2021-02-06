function EditBenchmarkController($mdDialog, benchmark) {
    const editBenchmarkController = this;

    editBenchmarkController.benchmark = benchmark ? angular.copy(benchmark) : {};
    editBenchmarkController.title = benchmark ? 'Edit Benchmark' : 'New Benchmark';

    editBenchmarkController.cancel = () => {
        $mdDialog.cancel();
    };

    editBenchmarkController.save = () => {
        $mdDialog.hide(editBenchmarkController.benchmark);
    };
}

angular.module('arraysApp')
    .controller('EditBenchmarkController', EditBenchmarkController);
