angular.module('arraysApp')
    .controller('TeamSettingsCtrl', ['$scope', 'AuthService', 'AssetService', 'Team', '$mdToast', '$window', 'FileUploadService',
        function ($scope, AuthService, AssetService, Team, $mdToast, $window, FileUploadService) {

            $scope.fontOptions = [
                { name: 'centrano2', displayName: 'CentraNo2 (default)' },
                { name: 'helvetica', displayName: 'Helvetica' },
                { name: 'georgia', displayName: 'Georgia' },
                { name: 'arial', displayName: 'Arial' },
            ];

            $scope.grayPalette = ['#2A2A2A', '#595959', '#777777'];

            $scope.progressMode = 'determinate';

            $scope.icons = window.arrays.constants.ICONS;

            const { ICONS } = window.arrays.constants;
            const order = ICONS.ORDER.filter(iconOrder => iconOrder !== ICONS.GROUPS.CUSTOMS);

            $scope.iconsSets = order.map((name) => ({
                name,
                prefix: ICONS.PREFIX[name],
                icons: ICONS.SETS[name],
            }));

            // todo: refactor the team module in order to get rid of watchers below
            $scope.$watchCollection('team', function (newValue, oldValue) {
                if (!_.isEqual(newValue, oldValue)) {
                    $scope.vm.websiteForm.$setDirty();
                }
            });

            $scope.$watchCollection('team.brandColor', function (newValue, oldValue) {
                if (!_.isEqual(newValue, oldValue)) {
                    $scope.vm.websiteForm.$setDirty();
                }
            });

            $scope.$watchCollection('team.colorPalette', function (newValue, oldValue) {
                if (!_.isEqual(newValue, oldValue)) {
                    $scope.vm.websiteForm.$setDirty();
                }
            });

            $scope.deleteFile = function (url, folder) {
                var fileName = url.split('logo/')[1].split('?')[0];
                AssetService.deleteImage($scope.team._id, folder, fileName)
                    .then((data) => {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent('Image deleted.')
                                .position('top right')
                                .hideDelay(3000),
                        );
                        $scope.team = data['doc'];
                        // team data is saved in session storage, so it needs to be updated
                        $window.sessionStorage.setItem('team', JSON.stringify($scope.team));
                    })
                    .catch(reason => {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(reason)
                                .position('top right')
                                .hideDelay(3000),
                        );
                    });
            };

            $scope.deleteIcon = function (url) {
                var fileName = url.split('/').pop();
                AssetService.deleteImage($scope.team._id, 'icon', fileName).then(function (data) {
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Icon deleted.')
                            .position('top right')
                            .hideDelay(3000),
                    );
                    AssetService.loadIcons()
                        .then(function (data) {
                            $scope.iconsUrl = data;
                        });
                });
            };

            $scope.iconsUploader = FileUploadService.newUploader('icon', null, 'team', $scope.team._id);
            $scope.iconsUploader.onCompleteItem = function (fileItem, response, status, header) {
                uploadComplete(fileItem, response, status, header);
            };
            $scope.iconsUploader.onGetSignedUrlError = function (message) {
                $mdToast.show($mdToast.simple()
                    .textContent(message)
                    .position('top right')
                    .hideDelay(3000),
                );
            };

            $scope.logoUploader = FileUploadService.newUploader('logo', 'websiteForm', 'team', $scope.team._id);
            $scope.logoUploader.onCompleteItem = function (fileItem, response, status, header) {
                uploadComplete(fileItem, response, status, header);
            };
            $scope.logoUploader.onGetSignedUrlError = function (message) {
                $mdToast.show($mdToast.simple()
                    .textContent(message)
                    .position('top right')
                    .hideDelay(3000),
                );
            };

            $scope.logo_headerUploader = FileUploadService.newUploader('logo_header', 'websiteForm', 'team', $scope.team._id);
            $scope.logo_headerUploader.onCompleteItem = function (fileItem, response, status, header) {
                uploadComplete(fileItem, response, status, header);
            };
            $scope.logo_headerUploader.onGetSignedUrlError = function (message) {
                $mdToast.show($mdToast.simple()
                    .textContent(message)
                    .position('top right')
                    .hideDelay(3000),
                );
            };

            var uploadComplete = function (fileItem, response, status, header) {
                if (status === 200) {
                    var asset = fileItem.uploader.assetType;

                    $scope.team[asset] = fileItem.uploadUrls[asset].publicUrl + '?' + new Date().getTime();

                    if (asset === 'icon') {
                        var iconUrl = fileItem.uploadUrls.icon.publicUrl;
                        $scope.iconsUrl.push(iconUrl);
                    }

                    if (fileItem.uploader.formName) {
                        var formName = fileItem.uploader.formName;

                        if ($scope.vm[formName].$pristine) {
                            $scope.vm[formName].$setDirty();
                        }

                        $scope.submitForm();
                    }

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Image uploaded!')
                            .position('top right')
                            .hideDelay(3000),
                    );
                }
            };

            $scope.submitForm = function () {
                if ($scope.vm.websiteForm.$valid && $scope.vm.websiteForm.$dirty) {
                    AuthService.updateTeam($scope.team)
                        .then(function (teams) {
                            $scope.$parent.teams = AuthService.allTeams();
                            $scope.$parent.team = AuthService.currentTeam();
                            $scope.vm.websiteForm.$setPristine();

                            $mdToast.show(
                                $mdToast.simple()
                                    .textContent('Team updated!')
                                    .position('top right')
                                    .hideDelay(3000),
                            );
                        });
                }
            };

            $scope.init = function () {
                AssetService.loadIcons()
                    .then(function (data) {
                        $scope.iconsUrl = data;
                    });
            };
        },
    ]);
