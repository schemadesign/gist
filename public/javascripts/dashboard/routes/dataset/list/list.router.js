angular
    .module('arraysApp')
    .config(($stateProvider) => {
        $stateProvider
            .state('dashboard.dataset.list', {
                url: '/list',
                templateUrl: 'javascripts/dashboard/routes/dataset/list/list.template.html',
                controller: 'DatasetListCtrl',
                controllerAs: 'datasetListCtrl',
                resolve: {
                    datasets(DatasetService, AuthService, Permissions) {
                        const user = AuthService.currentUser();
                        const isEditRole = Permissions.isEditRole;
                        const _team = _.isString(user.defaultLoginTeam) ? user.defaultLoginTeam : user.defaultLoginTeam._id;

                        if (isEditRole) {
                            return DatasetService.getDatasetsWithQuery({ _team });

                        }

                        if (user.role === 'editor' || user.role === 'viewer') {
                            return DatasetService.getDatasetsWithQuery({
                                $or: [
                                    { _id: { $in: user._editors.concat(user._viewers) } },
                                ],
                                _team: user.defaultLoginTeam._id,
                            });
                        }

                        return [];
                    },
                },
            });
    });
