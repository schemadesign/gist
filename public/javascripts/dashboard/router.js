'use strict';

angular.module('arraysApp')
    .run(($rootScope, $state, $mdToast) => {
        $rootScope.$state = $state;

        /**
         * @deprecated State Change Events were deprecated in UI-Router 1.0 but are supported via polyfill
         * See https://ui-router.github.io/guide/ng1/migrate-to-1_0#state-change-events
         */
        $rootScope.$on('$stateChangeError', (event, toState, toParams, fromState, fromParams, error) => {
            event.preventDefault();
            console.log('state change error', error);

            if (error.importing === true) {
                $state.go('dashboard.dataset.one.process', { id: error.datasetId });
            } else if (error.upload === true) {
                if (fromState.name !== 'dashboard.dataset.error') {
                    $state.go('dashboard.dataset.error', {
                        id: error.datasetId,
                        type: 'badFormat',
                        returnTo: 'dashboard.dataset.one.upload',
                        errMsg: error.message,
                    });
                }
            } else if (_.get(error, 'detail.data.error') === 'session expired') {
                $state.go('dashboard.dataset.error', {
                    id: error.datasetId,
                    type: 'loggedOut',
                    returnTo: toState.name,
                });
            } else {
                // Gets the error message.
                // TODO: unify the format of the messages between backend and front-end
                let message;
                if (error.detail) {
                    if (error.detail.message) {
                        message = error.detail.message;
                    } else if (error.detail.data && error.detail.data.error && error.detail.data.error.message) {
                        message = error.detail.data.error.message;
                    } else if (error.detail.data && error.detail.data.error) {
                        message = error.detail.data.error;
                    } else if (error.detail.statusText) {
                        message = error.detail.statusText;
                    }
                }
                if (!message) {
                    message = `General error: ${error.message} type: ${error.type}`;
                }
                $mdToast.show(
                    $mdToast.simple()
                        .textContent(message)
                        .position('top right')
                        .hideDelay(5000),
                );

                // In case when user entered incorrect dataset id
                if (!$state.current.name) {
                    $state.go('dashboard.dataset.error', { type: 'notFound' });
                }
            }
        });

        // Auto-scroll to top of page if navigating to a different section of the dashboard
        $rootScope.$on('$stateChangeSuccess', (e, toState, toParams, fromState) => {
            if (toState.name !== fromState.name) {
                $('#page').scrollTop(0);
            }
        });

        /**
         * This is a naive example of how to silence the default error handler.
         * https://ui-router.github.io/guide/ng1/migrate-to-1_0#default-error-handler
         * TODO: log in development but not in production
         */
        $state.defaultErrorHandler((error) => {
            // console.error(error); // uncomment for debugging state transitions
        });
    })
    .config(($stateProvider, $urlServiceProvider, $locationProvider, $httpProvider, $mdThemingProvider) => {
        $mdThemingProvider.theme('error-toast');

        $urlServiceProvider.rules
            .otherwise('/dashboard/dataset/list');

        $stateProvider
            .state('dashboard', {
                abstract: true,
                url: '/dashboard',
                templateUrl: 'templates/dashboard.html',
                controller: 'DashboardCtrl',
                controllerAs: 'dashboardCtrl',
                resolve: {
                    auth(AuthService) {
                        return AuthService.ensureLogIn();
                    },
                    env(AuthService) {
                        return AuthService.getEnv();
                    },
                },
                resolvePolicy: {
                    auth: { when: 'EAGER' },
                    env: { when: 'EAGER' },
                },
                lazyLoad($transition$) {
                    const injector = $transition$.injector();
                    const AuthService = injector.get('AuthService');
                    const extensionService = injector.get('extensionService');

                    return AuthService
                        .ensureLogIn()
                        .then(() => extensionService.get('build/dashboard.bundle.js'))
                        .catch(angular.noop);
                },
            })
            .state('dashboard.account', {
                abstract: true,
                url: '/account',
                controller: 'AccountCtrl',
                templateUrl: 'templates/account.html',
            })
            .state('dashboard.account.profile', {
                url: '/profile',
                controller: 'AccountCtrl',
                templateUrl: 'templates/account/profile.html',
            })
            .state('dashboard.account.password', {
                url: '/password',
                controller: 'AccountCtrl',
                templateUrl: 'templates/account/password.html',
            })
            .state('dashboard.stories', {
                abstract: true,
                url: '/story',
                templateUrl: 'templates/story.html',
                controller: 'StoryCtrl',
            })
            .state('dashboard.restricted', {
                url: '/restricted',
                templateUrl: 'templates/restricted.html',
            })
            .state('dashboard.stories.list', {
                url: '/list',
                templateUrl: 'templates/story/list.html',
                controller: 'StoryListCtrl',
                resolve: {
                    stories(Story) {
                        return Story.getAll().$promise;
                    },
                },
                resolvePolicy: {
                    stories: { when: 'EAGER' },
                },
            })
            .state('dashboard.stories.edit', {
                url: '/edit/:id',
                controller: 'StoryEditCtrl',
                templateUrl: 'templates/story/edit.html',
                resolve: {
                    story(Story, $transition$) {
                        return Story.get({ id: $transition$.params().id }).$promise;
                    },
                },
                resolvePolicy: {
                    story: { when: 'EAGER' },
                },
            })
            .state('dashboard.site', {
                abstract: true,
                url: '/sites',
                controller: 'SiteCtrl as vm',
                templateUrl: 'templates/site.html',
            })
            .state('dashboard.site.list', {
                url: '/list',
                templateUrl: 'templates/site/list.html',
                controller: 'SiteListCtrl',
                resolve: {
                    websites(Website, AuthService) {
                        const user = AuthService.currentUser();

                        if (user.role === 'superAdmin' || user.role === 'admin') {
                            return Website.getTeamSites({ allSites: true });
                        }

                        return Website.getTeamSites({ allSites: false });
                    },
                },
                resolvePolicy: {
                    websites: { when: 'EAGER' },
                },
            })
            // create the site in this parent state
            .state('dashboard.article', {
                abstract: true,
                url: '/articles',
                controller: 'ArticleCtrl as vm',
                templateUrl: 'templates/article.html',
                resolve: {
                    website(Website, AuthService) {
                        const team = AuthService.currentTeam();

                        return Website.getBySubdomain({
                            team_id: team._id,
                            subdomain: team.subdomain,
                        });
                    },
                },
                resolvePolicy: {
                    website: { when: 'LAZY' },
                },
            })
            .state('dashboard.article.list', {
                url: '/list/:site_id',
                templateUrl: 'templates/article/list.html',
                controller: 'ArticleListCtrl',
                params: {
                    site_id: null,
                },
                resolve: {
                    pages($transition$, Page, AclService) {
                        if (AclService.can('user', 'manageAllArticles')) {
                            return Page.getSitePages($transition$.params().site_id, true);
                        }

                        return Page.getSitePages($transition$.params().site_id, false);
                    },
                },
                resolvePolicy: {
                    pages: { when: 'LAZY' },
                },
            })
            // copied from state dashboard.page.markdown.content
            // copied so that the current state name is articles
            // highlights articles side bar tab (vs sites)
            .state('dashboard.article.markdown', {
                abstract: true,
                url: '/markdown',
                templateUrl: 'templates/page/markdown.html',
                controller: 'PageMarkdownCtrl',
            })
            .state('dashboard.article.markdown.content', {
                url: '/content/:id',
                templateUrl: 'templates/page/markdown.content.html',
                controller: 'PageMarkdownContentCtrl',
                resolve: {
                    page(Page, $transition$) {
                        return Page.get($transition$.params().id)
                            .then(({ data }) => data);
                    },
                    datasets(DatasetService, AuthService) {
                        const user = AuthService.currentUser();

                        const teamId = _.isString(user.defaultLoginTeam) ? user.defaultLoginTeam : user.defaultLoginTeam._id;
                        const query = { _team: teamId };

                        if (user.role === 'editor') {
                            query.$or = [
                                { _id: { $in: user._editors } },
                                { author: user._id },
                                {
                                    $and: [
                                        { firstImport: 0 },
                                        { isPublic: true },
                                    ],
                                },
                            ];
                        } else if (user.role === 'viewer') {
                            query.$and = [
                                { firstImport: 0 },
                                { isPublic: true },
                            ];
                        }

                        return DatasetService.getDatasetsWithQuery(query);
                    },
                },
                resolvePolicy: {
                    page: { when: 'EAGER' },
                    datasets: { when: 'EAGER' },
                },
            })
            .state('dashboard.article.markdown.display', {
                url: '/display/:id',
                templateUrl: 'templates/page/markdown.display.html',
                controller: 'PageMarkdownDisplayCtrl',
                resolve: {
                    page(Page, $transition$) {
                        return Page.get($transition$.params().id)
                            .then(({ data }) => data);
                    },
                    user(AuthService) {
                        return AuthService.currentUser();
                    },
                },
                resolvePolicy: {
                    page: { when: 'EAGER' },
                },
            })
            .state('dashboard.page', {
                abstract: true,
                url: '/pages',
                controller: 'PageCtrl as vm',
                templateUrl: 'templates/page.html',
            })
            .state('dashboard.page.list', {
                url: '/list/:site_id',
                templateUrl: 'templates/page/list.html',
                controller: 'PageListCtrl',
                resolve: {
                    pages($transition$, Page) {
                        return Page.getSitePages($transition$.params().site_id, true);
                    },
                    website($transition$, Website) {
                        return Website.get({ site_id: $transition$.params().site_id });
                    },
                },
                resolvePolicy: {
                    pages: { when: 'EAGER' },
                    website: { when: 'EAGER' },
                },
            })
            .state('dashboard.page.markdown', {
                abstract: true,
                url: '/markdown',
                templateUrl: 'templates/page/markdown.html',
                controller: 'PageMarkdownCtrl',
            })
            .state('dashboard.page.markdown.content', {
                url: '/content/:id',
                templateUrl: 'templates/page/markdown.content.html',
                controller: 'PageMarkdownContentCtrl',
                resolve: {
                    page(Page, $transition$) {
                        return Page.get($transition$.params().id)
                            .then(({ data }) => data);
                    },
                    datasets(DatasetService, AuthService) {
                        const user = AuthService.currentUser();

                        const teamId = _.isString(user.defaultLoginTeam) ? user.defaultLoginTeam : user.defaultLoginTeam._id;
                        const query = { _team: teamId };

                        if (user.role === 'editor') {
                            query.$or = [
                                { _id: { $in: user._editors } },
                                { author: user._id },
                                {
                                    $and: [
                                        { firstImport: 0 },
                                        { isPublic: true },
                                    ],
                                },
                            ];
                        } else if (user.role === 'viewer') {
                            query.$and = [
                                { firstImport: 0 },
                                { isPublic: true },
                            ];
                        }

                        return DatasetService.getDatasetsWithQuery(query);
                    },
                },
                resolvePolicy: {
                    page: { when: 'EAGER' },
                    datasets: { when: 'EAGER' },
                },
            })
            .state('dashboard.page.markdown.display', {
                url: '/display/:id',
                templateUrl: 'templates/page/markdown.display.html',
                controller: 'PageMarkdownDisplayCtrl',
                resolve: {
                    page(Page, $transition$) {
                        return Page.get($transition$.params().id)
                            .then(({ data }) => data);
                    },
                    user(AuthService) {
                        return AuthService.currentUser();
                    },
                },
                resolvePolicy: {
                    page: { when: 'EAGER' },
                },
            })
            .state('dashboard.page.markdown.settings', {
                url: '/settings/:id',
                templateUrl: 'templates/page/markdown.settings.html',
                controller: 'PageMarkdownSettingsCtrl',
                resolve: {
                    page(Page, $transition$) {
                        return Page.get($transition$.params().id)
                            .then(({ data }) => data);
                    },
                },
                resolvePolicy: {
                    page: { when: 'EAGER' },
                },
            })
            /**
             * Performance
             */
            .state('dashboard.performance', {
                abstract: true,
                url: '/performance',
                controller: 'PerformanceCtrl as vm',
                templateUrl: 'templates/performance/',
                resolve: {
                    datasets(DatasetService, AuthService, AclService) {
                        const user = AuthService.currentUser();

                        // Check if the use has access and the team has any visualizations
                        if (AclService.can('user', 'seePerformance')) {
                            return DatasetService.getDatasetsWithQuery({
                                _team: user.defaultLoginTeam._id,
                                $or: [
                                    { replaced: false },
                                    { replaced: { $exists: false } },
                                ],
                            });
                        }

                        return [];
                    },
                },
                resolvePolicy: {
                    datasets: { when: 'EAGER' },
                },
            })
            .state('dashboard.performance.team', {
                url: '/team',
                templateUrl: 'templates/performance/team.html',
                controller: 'PerformanceTeamCtrl as vm',
            })
            .state('dashboard.performance.pages', {
                url: '/pages',
                templateUrl: 'templates/performance/pages.html',
                controller: 'PerformancePagesCtrl',
            })
            /**
             * Team
             */
            .state('dashboard.team', {
                url: '/team',
                controller: 'TeamSettingsCtrl as vm',
                templateUrl: 'templates/team.html',
            })
            .state('dashboard.team.settings', {
                url: '/settings',
                controller($scope) {
                    $scope.$parent.currentNavItem = 'settings';
                },
                templateUrl: 'templates/team/settings.html',
            })
            .state('dashboard.team.icons', {
                url: '/icons',
                controller($scope) {
                    $scope.$parent.currentNavItem = 'icons';
                },
                templateUrl: 'templates/team/icons.html',
            })
            .state('dashboard.user', {
                url: '/user',
                controller: 'UserCtrl as vm',
                templateUrl: 'templates/user.html',
            })
            .state('dashboard.user.list', {
                url: '/list',
                controller: 'UserListCtrl as vm',
                templateUrl: 'templates/user/list.html',
                resolve: {
                    users(User, AuthService) { //all users in this team, except myself
                        const currentTeam = AuthService.currentTeam();

                        return User.getAll({ teamId: currentTeam._id });
                    },
                    datasets(DatasetService, AuthService) {
                        const user = AuthService.currentUser();

                        if (user.role === 'superAdmin' || user.role === 'admin') {
                            return DatasetService.getDatasetsWithQuery({ _team: user.defaultLoginTeam._id });
                        }

                        return [];
                    },
                    articles(Page) {
                        return Page.getSitePages(null, true);
                    },
                    sites(Website, AuthService) {
                        AuthService.currentUser();

                        return Website.getTeamSites({ allSites: true });
                    },
                },
                resolvePolicy: {
                    users: { when: 'EAGER' },
                    datasets: { when: 'EAGER' },
                    articles: { when: 'EAGER' },
                    sites: { when: 'EAGER' },
                },
            })
            .state('dashboard.teams', {
                url: '/teams',
                controller: 'TeamCtrl as vm',
                templateUrl: 'templates/teams.html',
            });

        // use the HTML5 History API
        $locationProvider.html5Mode(true);
        $httpProvider.interceptors.push('TokenInterceptor');

    })
    /**
     * Lazy load resources from user folder
     * Intended to load custom webpack bundle to extend the dashboard, can also be used for individual routes
     */
    .factory('extensionService', (AuthService, $ocLazyLoad) => {
        return {
            get(path) {
                const currentTeam = AuthService.currentTeam();
                const subdomain = currentTeam.subdomain;

                // TODO Not a long-term solution but one that will supress errors for all other teams
                const whitelist = [
                    'atlas-drugdelivery',
                    'cmrtoolkit',
                    'aspi',
                    'rhodiumcredit', 'rhodiumgroup', 'rhodiumcgi',
                    'eastwestcenter',
                ].join('|');

                if (subdomain.match(whitelist)) {
                    return $ocLazyLoad.load(`${subdomain}/${path}`);
                }

                return true;
            },
        };
    });
