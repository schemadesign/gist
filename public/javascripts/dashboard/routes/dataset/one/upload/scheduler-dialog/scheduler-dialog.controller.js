angular.module('arraysApp')
    .controller('SchedulerDialogCtrl', function ($scope, $mdDialog, scheduledJob) {
        if (scheduledJob && scheduledJob.time) {
            $scope.cronTime = scheduledJob.time;
            $scope.scheduledJob = scheduledJob;
        }

        $scope.config = {
            options: {
                allowMinute: false,
                allowYear: false,
            },
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.save = function (action) {
            if (action === 'time') {
                return $mdDialog.hide({ command: action, cronTime: $scope.cronTime });
            }

            if (action === 'remove') {
                return $mdDialog.hide({ command: action });
            }

            if (action === 'schedule') {
                if ($scope.scheduledJob.status === 'running') {
                    return $mdDialog.hide({ command: action, action: 'pause', cronTime: $scope.cronTime });
                }

                return $mdDialog.hide({ command: action, action: 'resume', cronTime: $scope.cronTime });
            }
        };
    });
