const { getAllLibraries, srcRename } = require('./app/libs/middleware/views/libraryList');
const webpackConfig = require('./webpack.config');
const libraries = getAllLibraries();

/*global module:false*/
module.exports = function(grunt) {
    const node_env = grunt.option('node_env') || 'production';
    const { FONT_CENTRANO_CDN, FE_UNPROCESSEDCSS } = require('dotenv').config({ path: `./config/env/.env.${node_env}` });
    const packageOptions = grunt.file.readJSON('./package.json');

    // Uncomment to show grunt task times, helpful for refining build speed
    // require('time-grunt')(grunt);

    /**
     * Include js files and focus spec exclusion to speed up build
     */
    function jsGlob(path) {
        const js = path + '*.js';
        const excludeSpec = '!' + path + '*.spec.js';

        return [js, excludeSpec];
    }

    const jsGroups = {
        config: {
            src: 'public/javascripts/build/dashboard-transpiled/config/*.js',
            dest: 'public/javascripts/build/dashboard/config.js',
        },
        app: {
            src: 'public/javascripts/build/dashboard-transpiled/app.js',
            dest: 'public/javascripts/build/dashboard/app.js',
        },
        router: {
            src: 'public/javascripts/build/dashboard-transpiled/router.js',
            dest: 'public/javascripts/build/dashboard/router.js',
        },
        constants: {
            src: 'public/javascripts/build/dashboard-transpiled/constants/*.js',
            dest: 'public/javascripts/build/dashboard/constants.js',
        },
        components: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/components/'),
            dest: 'public/javascripts/build/dashboard/components.js',
        },
        filters: {
            src: 'public/javascripts/build/dashboard-transpiled/filters.js',
            dest: 'public/javascripts/build/dashboard/filters.js',
        },
        directives: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/directives/'),
            dest: 'public/javascripts/build/dashboard/directives.js',
        },
        services: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/services/'),
            dest: 'public/javascripts/build/dashboard/services.js',
        },
        // controllers
        appController: {
            src: 'public/javascripts/build/dashboard-transpiled/controllers/app.js',
            dest: 'public/javascripts/build/dashboard/controllers/app.js',
        },
        account: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/account.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/account/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/account.js',
        },
        routes: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/routes/**/'),
            dest: 'public/javascripts/build/dashboard/routes.js',
        },
        page: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/page.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/page/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/page.js',
        },
        performance: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/controllers/performance/'),
            dest: 'public/javascripts/build/dashboard/controllers/performance.js',
        },
        site: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/site.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/site/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/site.js',
        },
        article: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/article.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/article/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/article.js',
        },
        story: {
            src: jsGlob('public/javascripts/build/dashboard-transpiled/controllers/story/'),
            dest: 'public/javascripts/build/dashboard/controllers/story.js',
        },
        team: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/team.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/team/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/team.js',
        },
        teamSettings: {
            src: 'public/javascripts/build/dashboard-transpiled/controllers/team-settings.js',
            dest: 'public/javascripts/build/dashboard/controllers/team-settings.js',
        },
        user: {
            src: ['public/javascripts/build/dashboard-transpiled/controllers/user.js'].concat(
                jsGlob('public/javascripts/build/dashboard-transpiled/controllers/user/'),
            ),
            dest: 'public/javascripts/build/dashboard/controllers/user.js',
        },
        visualizations: {
            expand: true,
            cwd: 'public/javascripts/build/visualizations-transpiled/',
            src: '**/*.js',
            dest: 'public/javascripts/build/visualizations/',
        },
        coreViews: {
            expand: true,
            cwd: 'public/javascripts/build/core-views-transpiled/',
            src: '**/*.js',
            dest: 'public/javascripts/build/core-views/',
        },
        signup: {
            expand: true,
            cwd: 'public/javascripts/build/signup-transpiled/',
            src: '**/*.js',
            dest: 'public/javascripts/build/signup/',
        },
        main: {
            expand: true,
            cwd: 'public/javascripts/build/main-transpiled/',
            src: '**/*.js',
            dest: 'public/javascripts/build/main/',
        },
    };

    const isExternalPath = dir => dir.to.indexOf('external') >= 0;

    // Project configuration.
    grunt.initConfig({
        babel: {
            dashboard: {
                expand: true,
                cwd: 'public/javascripts/dashboard',
                src: jsGlob('**/'),
                dest: 'public/javascripts/build/dashboard-transpiled/',
            },
            signup: {
                expand: true,
                cwd: 'public/javascripts/signup',
                src: jsGlob('**/'),
                dest: 'public/javascripts/build/signup-transpiled/',
            },
            visualizations: {
                expand: true,
                cwd: 'public/javascripts/visualizations',
                src: jsGlob('**/'),
                dest: 'public/javascripts/build/visualizations-transpiled/',
            },
            coreViews: {
                expand: true,
                cwd: 'public/javascripts/core-views',
                src: jsGlob('**/'),
                dest: 'public/javascripts/build/core-views-transpiled/',
            },
            main: {
                expand: true,
                cwd: 'public/javascripts/',
                src: jsGlob(''),
                dest: 'public/javascripts/build/main-transpiled/',
            },
        },

        clean: {
            all: ['public/javascripts/build', 'public/stylesheets/prebuild', 'public/stylesheets/build'],
            dashboard: ['public/javascripts/build/dashboard/', 'public/javascripts/build/dashboard-transpiled/'],
            signup: ['public/javascripts/build/signup/', 'public/javascripts/build/signup-transpiled/'],
            visualizations: [
                'public/javascripts/build/visualizations/',
                'public/javascripts/build/visualizations-transpiled/',
            ],
            coreViews: ['public/javascripts/build/core-views/', 'public/javascripts/build/core-views-transpiled/'],
            main: ['public/javascripts/build/main/', 'public/javascripts/build/main-transpiled/'],
        },

        watch: {
            options: {
                interval: 3000,
            },
            gruntfile: {
                files: 'Gruntfile.js',
                tasks: ['copy', 'includes', 'postcss', 'nunjucks'],
            },
            css: {
                files: [
                    'public/stylesheets/**/*.css',
                    '!public/stylesheets/base/fontello-embedded.css',
                    '!public/stylesheets/prebuild/**/*',
                    '!public/stylesheets/build/**/*',
                ],
                options: {
                    livereload: true,
                },
                tasks: ['includes', 'postcss'],
            },
            js: {
                files: [
                    'public/javascripts/**/*.js',
                    '!public/javascripts/build/**/*.*',
                    '!public/javascripts/dashboard/**/*.js',
                    '!public/javascripts/signup/**/*.js',
                    '!public/javascripts/visualizations/**/*.js',
                    '!public/javascripts/core-views/**/*.js',
                    '!public/javascripts/*.js',
                    '!**/*.spec.js',
                ],
                options: {
                    livereload: true,
                },
            },
            html_nunjucks: {
                files: ['views/**/*.njk'],
                options: {
                    livereload: true,
                },
            },
            html_ngtemplates: {
                files: ['public/javascripts/**/*.html', 'public/templates/**/*.html'],
                options: {
                    livereload: true,
                },
                tasks: ['ngtemplates'],
            },
            nunjucks: {
                files: ['fe-templates/**/*.njk', 'views/shared/*.njk'],
                tasks: ['nunjucks'],
                options: {
                    livereload: true,
                },
            },
            concat_dashboard: {
                files: ['public/javascripts/dashboard/**/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['clean:dashboard', 'babel:dashboard', 'concat_dashboard'],
            },
            concat_signup: {
                files: ['public/javascripts/signup/**/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['clean:signup', 'babel:signup', 'concat:signup'],
            },
            concat_visualizations: {
                files: ['public/javascripts/visualizations/**/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['clean:visualizations', 'babel:visualizations', 'concat:visualizations'],
            },
            concat_coreViews: {
                files: ['public/javascripts/core-views/**/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['clean:coreViews', 'babel:coreViews', 'concat:coreViews'],
            },
            concat_main: {
                files: ['public/javascripts/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['clean:main', 'babel:main', 'concat:main'],
            },
            webpack_shared: {
                files: ['shared/**/*.js', '!**/*.spec.js'],
                options: {
                    livereload: true,
                },
                tasks: ['webpack:dev'],
            },
        },

        copy: {
            bower_vendors: {
                nonull: true,
                expand: true,
                cwd: 'bower_components',
                src: ['d3/d3.js', 'd3/d3.min.js'],
                dest: 'public/vendors',
            },
            node_vendors: {
                nonull: true,
                expand: true,
                follow: true,
                cwd: 'node_modules',
                src: [
                    '@tweenjs/tween.js/src/Tween.js',
                    '@uirouter/angularjs/release/stateEvents.min.js',
                    '@uirouter/angularjs/release/ui-router-angularjs.min.js',
                    '@uirouter/core/_bundles/ui-router-core.min.js',
                    'angular/angular.min.js',
                    'angular/angular.js',
                    'angular-animate/angular-animate.min.js',
                    'angular-aria/angular-aria.min.js',
                    'angular-cookies/angular-cookies.min.js',
                    'angular-cron-jobs/dist/angular-cron-jobs.min.css',
                    'angular-cron-jobs/dist/angular-cron-jobs.min.js',
                    'angular-file-saver/dist/angular-file-saver.bundle.min.js',
                    'angular-file-upload/dist/angular-file-upload.min.js',
                    'angular-markdown-editor/src/angular-markdown-editor.js',
                    'angular-markdown-editor/styles/angular-markdown-editor.css',
                    'angular-material/angular-material.min.js',
                    'angular-material/angular-material.js',
                    'angular-material/angular-material.min.css',
                    'angular-messages/angular-messages.min.js',
                    'angular-minicolors/angular-minicolors.js',
                    'angular-resource/angular-resource.min.js',
                    'angular-sanitize/angular-sanitize.min.js',
                    'angular-spinner/dist/angular-spinner.min.js',
                    'angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
                    'angular-ui-sortable/dist/sortable.min.js',
                    'babel-polyfill/dist/polyfill.min.js',
                    'bootstrap/dist/js/bootstrap.min.js',
                    'bootstrap-markdown/css/bootstrap-markdown.min.css',
                    'bootstrap-markdown/js/bootstrap-markdown.js',
                    'd3-scale-chromatic/dist/d3-scale-chromatic.min.js',
                    'file-saver/dist/FileSaver.min.js',
                    'fitvids/dist/fitvids.min.js',
                    'font-awesome/css/font-awesome.min.css',
                    'font-awesome/fonts/fontawesome-webfont.*',
                    'jquery/dist/jquery.min.js',
                    'jquery-minicolors/jquery.minicolors.css',
                    'jquery-minicolors/jquery.minicolors.min.js',
                    'jquery-ui-dist/jquery-ui.min.js',
                    'jquery-ui-dist/jquery-ui.min.css',
                    'l20n/dist/web/l20n.min.js',
                    'linkifyjs/dist/linkify.min.js',
                    'linkifyjs/dist/linkify-html.min.js',
                    'linkifyjs/dist/linkify-jquery.min.js',
                    'lodash/lodash.min.js',
                    'moment/min/moment.min.js',
                    'nunjucks/browser/nunjucks-slim.min.js',
                    'noty/lib/noty.css',
                    'noty/lib/themes/bootstrap-v3.css',
                    'noty/lib/noty.min.js',
                    'nouislider/distribute/nouislider.css',
                    'nouislider/distribute/nouislider.min.js',
                    'oclazyload/dist/ocLazyLoad.min.js',
                    'screenfull/dist/screenfull.js',
                    'scrollmagic/scrollmagic/minified/ScrollMagic.min.js',
                    'selection-model/dist/selection-model.min.js',
                    'sharrre/jquery.sharrre.min.js',
                    'textures/dist/textures.js',
                    'three/three.min.js',
                    'topojson/dist/topojson.min.js',
                    'validator/validator.min.js',
                    'qs/dist/qs.js',
                    'd3-hierarchy/dist/d3-hierarchy.js',
                    'shave/dist/jquery.shave.min.js',
                ],
                dest: 'public/vendors',
            },
            d3_v4: {
                expand: true,
                follow: true,
                cwd: 'node_modules/d3/build',
                src: ['d3.min.js'],
                dest: 'public/vendors/d3-v4',
            },
            fontello: {
                src: 'public/fonts/custom-icon-font/css/fontello-embedded.css',
                dest: 'public/stylesheets/base/fontello-embedded.css',
            },
            fontello_font: {
                expand: true,
                cwd: 'public/fonts/custom-icon-font/font/',
                src: '*',
                dest: 'public/fonts/fontello/',
            },
            fontawesome: {
                expand: true,
                cwd: 'node_modules/font-awesome/fonts/',
                src: 'fontawesome-webfont.*',
                dest: 'public/fonts/font-awesome',
            },
            cdnFiles: {
                expand: true,
                cwd: 'public/',
                src: libraries,
                dest: `public/cdn/${packageOptions.version}`,
                rename: (dest, src) => {
                    const path = srcRename(src);

                    return `${dest}/${path}`;
                },
            },
        },
        includes: {
            css: {
                options: {
                    includeRegexp: /\/\*\s*@include\s+['"]?([^'"]+)['"]?\s*\*\/$/,
                },
                files: [
                    {
                        cwd: 'public/stylesheets/',
                        src: ['**/*.css', '!build/**', '!prebuild/**'],
                        dest: 'public/stylesheets/prebuild/',
                    },
                ],
            },
        },
        postcss: {
            options: {
                map: false,
                processors: [
                    require('postcss-import')({}),
                    require('postcss-nested')({}),
                    require('postcss-url')([
                        {
                            filter: '**/fonts/centrano2/**',
                            url: (asset) => {
                                if (!FONT_CENTRANO_CDN || FE_UNPROCESSEDCSS === 'true') {
                                    return asset;
                                }

                                return asset.url.replace('/fonts/centrano2', FONT_CENTRANO_CDN);
                            },
                        },
                        {
                            filter: '**/fonts/fontawesome*',
                            url: (asset, dir) => {
                                const prefix = isExternalPath(dir) ? '..' : '';

                                return asset.url.replace('../fonts/', `${prefix}/fonts/font-awesome/`);
                            },
                        },
                        {
                            filter: '**/fonts/**/*',
                            url: (asset, dir) => (isExternalPath(dir) ? `../${asset.url}` : asset.url),
                        },
                    ]),

                    // Autoprefixer is included in postcss-preset-env
                    require('postcss-preset-env')({
                        // Which CSS features to polyfill from https://cssdb.org/
                        stage: 3,
                        features: {
                            'custom-properties': {
                                // Do keep original var() values after being transformed
                                preserve: true,
                            },
                        },
                    }),

                    require('cssnano')({
                        autoprefixer: false,
                        reduceTransforms: false,
                        discardUnused: false,
                        zindex: false,
                    }),
                ],
            },
            main: {
                src: 'public/stylesheets/prebuild/style.css',
                dest: 'public/stylesheets/build/style.min.css',
            },
            dashboard: {
                src: 'public/stylesheets/prebuild/dashboard.css',
                dest: 'public/stylesheets/build/dashboard.min.css',
            },
            articles: {
                // Process each article theme folder
                expand: true, // Enable dynamic destination files
                cwd: 'public/stylesheets/prebuild/articles/',
                src: ['**/main.css'],
                dest: 'public/stylesheets/build/articles/',
                ext: '.min.css',
            },
            externalViews: {
                expand: true, // Enable dynamic destination files
                cwd: 'public/stylesheets/prebuild/external/',
                src: ['**/*.css'],
                dest: 'public/stylesheets/build/external/',
                ext: '.min.css',
            },
        },

        nunjucks: {
            precompile: {
                baseDir: 'fe-templates/',
                src: ['fe-templates/**/*.njk', 'views/shared/*.njk'],
                dest: 'public/javascripts/build/fe-templates.js',
            },
        },

        uglify: Object.assign(
            {
                options: {
                    mangle: false,
                    compress: false,
                    sourceMap: true,
                },
            },
            jsGroups,
        ),

        concat: Object.assign(
            {
                options: {
                    sourceMap: true,
                },
            },
            jsGroups,
        ),

        ngtemplates: {
            arraysApp: {
                cwd: 'public',
                src: ['javascripts/**/*.html', 'templates/**/*.html'],
                dest: 'public/javascripts/build/templates.js',
            },
        },

        s3: {
            options: {
                accessKeyId: '',
                secretAccessKey: '',
                bucket: '',
                cache: false,
            },
            build: {
                cwd: 'public/cdn',
                src: '**',
            },
        },

        cloudfront: {
            options: {
                accessKeyId: '',
                secretAccessKey: '',
                distributionId: '',
                invalidations: [packageOptions.version + '/**/*'],
            },
            invalidate: {},
        },

        webpack: {
            prod: webpackConfig,
            dev: Object.assign({}, webpackConfig, {
                mode: 'development',
            }),
        },
    });

    /**
     * Uglify builds with unique options
     */
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('concat_dashboard', function() {
        const babelTasks = Object.keys(grunt.config.data.babel);
        const notBabelTask = task => !babelTasks.includes(task);
        const tasks = Object.keys(jsGroups).filter(notBabelTask);
        const addConcat = task => `concat:${task}`;

        grunt.task.run(tasks.map(addConcat));
    });

    grunt.loadNpmTasks('grunt-angular-templates');

    /**
     * Other tasks
     */
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    // grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-includes');
    grunt.loadNpmTasks('@lodder/grunt-postcss');
    grunt.loadNpmTasks('grunt-nunjucks');
    grunt.loadNpmTasks('grunt-webpack');

    // CDN task
    grunt.loadNpmTasks('grunt-aws');

    // Default task.
    grunt.registerTask('default', []);

    grunt.registerTask('dev:prepare', [
        'clean:all',
        'copy',
        'babel',
        'webpack:dev',
        'ngtemplates',
        'concat',
        'includes',
        'postcss',
        'nunjucks',
    ]);

    // App only
    grunt.registerTask('build:core', [
        'clean:all',
        'copy',
        'babel',
        'webpack:prod',
        'ngtemplates',
        'uglify',
        'includes',
        'postcss',
        'nunjucks',
    ]);
    grunt.registerTask('dev:core', ['dev:prepare', 'watch']);

    // App and user folders
    grunt.registerTask('build', ['build:core']);
    grunt.registerTask('dev', ['dev:prepare', 'watch']);
};
