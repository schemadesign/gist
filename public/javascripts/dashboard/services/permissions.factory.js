function Permissions(AuthService, EDIT_ROLES, ADMIN_ROLES, $state) {
    const {
        _siteViewers,
        _siteEditors,
        _articleViewers,
        _articleEditors,
        _viewers,
        _editors,
        canCreateNewArticle,
        canCreateNewSite,
        canCreateNewViz,
        role,
    } = AuthService.currentUser();
    const { _id: teamId, pages: teamPages, sites: teamSites, datasourceDescriptions: teamViz } = AuthService.currentTeam();

    const isEditRole = EDIT_ROLES.includes(role);
    const isAdminRole = ADMIN_ROLES.includes(role);

    const canShow = (name, include) => {
        const equals = a => b => _.isEqual(a, b);
        const includes = a => b => _.includes(b, a);
        const compareFn = include ? includes : equals;
        const checkFn = (viewer, editor, creator, team) =>
            !_.isEmpty(_.intersection([...viewer, ...editor], team)) || creator.includes(teamId) || isEditRole;
        const checkPermission = _.cond([
            [compareFn('articles'), () => checkFn(_articleViewers, _articleEditors, canCreateNewArticle, teamPages)],
            [compareFn('sites'), () => checkFn(_siteViewers, _siteEditors, canCreateNewSite, teamSites)],
            [compareFn('dataset'), () => checkFn(_viewers, _editors, canCreateNewViz, teamViz)],
            [_.stubTrue, _.constant(true)],
        ]);

        return checkPermission(name);
    };

    const canEnter = (name) => {
        if (canShow(name, true)) {
            return;
        }

        $state.go('dashboard.restricted');
    };

    return {
        isEditRole,
        isAdminRole,
        canShow,
        canEnter,
    };
}

angular.module('arraysApp')
    .factory('Permissions', Permissions);
