const winston = require('winston');
const dotenv = require('dotenv');
const cluster = require('cluster');
const path = require('path');
const fs = require('fs');
const async = require('async');
const http = require('http');
const https = require('https');

const { configureWinston, expressLogger } = require('./app/utils/winston');

dotenv.config({
    path: `${__dirname}/config/env/.env.${process.env.NODE_ENV || 'development'}`,
    silent: true,
});

const isDev = process.env.NODE_ENV === 'development';

var app;

var userFolderPath = __dirname + '/user';
global.rootPath = __dirname;

configureWinston();

function module_exists(name) {
    try {
        return require.resolve(name);
    } catch (e) {
        winston.debug(`module_exists error: ${e.message}`);
        return false;
    }
}

const clusterWorkerSize = parseInt(process.env.WEB_CONCURRENCY || require('os').cpus().length, 10);

winston.info('Cluster worker size: ' + clusterWorkerSize);

var mongoose_client = require('./app/models/mongoose_client');

if (cluster.isMaster && !['testing', 'test'].includes(process.env.NODE_ENV) && clusterWorkerSize > 1) {

    var cron = require('./app/boot/cron-init.js');

    var worker;
    winston.debug('env %s, master pid %s, total Workers: %s ', process.env.NODE_ENV, process.pid, clusterWorkerSize);

    for (var i = 0; i < clusterWorkerSize; i++) {
        worker = cluster.fork();

        worker.on('message', function (msg) {

            cron.execute(msg.command, msg.id, function (err) {

                if (err) {
                    winston.error('err in delegating work to master node : ' + err);
                } else {
                    winston.debug('delegate schedule work to master node **** command: ' + msg.command + ', cronJobId: ' + msg.id);
                }

            });
        });
    }

    cluster.on('exit', function (worker_process) {
        worker = cluster.fork();
        winston.debug('Worker %d died pid %d', worker_process.id, process.pid);

    });

    /**
     * Run custom boot scripts, if present
     */
    fs.readdir(userFolderPath, function (err, files) {
        async.each(files, function (file, eachCb) {
            var full_path = path.join(userFolderPath, file);

            fs.stat(full_path, function (err, stat) {
                if (err) {
                    eachCb(err);
                } else {
                    if (stat.isDirectory()) {
                        var customBoot = path.join(full_path, '/app/boot.js');

                        if (module_exists(customBoot)) {
                            try {
                                require(customBoot);
                                winston.info('Loaded custom boot file for: %s', file);
                            } catch (e) {
                                winston.error('Error loading custom boot file for: %s\n%s', file, e);
                            }
                        }
                    }
                    eachCb();
                }
            });
        });
    });

} else {

    var express = require('express');

    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var expressValidator = require('express-validator');
    var session = require('express-session');
    var MongoSessionStore = require('connect-mongo')(session);
    var flash = require('connect-flash');
    var passport = require('passport');
    var cors = require('cors');
    var subdomain = require('express-subdomain');
    var composableMiddleware = require('composable-middleware');
    const serveFavicon = require('serve-favicon');
    const helmet = require('helmet');

    const authRoute = require('./app/routes/auth');
    const accountRoute = require('./app/routes/account');

    app = express();
    app.enable('trust proxy');

    require('./config/setup-passport');

    var customRoutes = __dirname + '/app/routes/custom';

    var viewsToSet = [];
    var userNunjucksPath = [];

    viewsToSet.push(__dirname + '/views');

    const expressNunjucks = require('express-nunjucks');
    const { FileSystemLoader } = require('nunjucks');
    app.set('view engine', 'njk');

    const loadNunjucks = () => {
        const njk = expressNunjucks(app, {
            watch: isDev,
            noCache: isDev,
            loader: FileSystemLoader,
        });
        require('./nunjucks/filters')(njk.env, process.env);
        return njk;
    };

    if (process.env.NODE_ENV !== 'enterprise') {
        app.set('subdomain offset', process.env.HOST.split('.').length);
    }

    app.use(helmet({
        frameguard: false,
    }));

    fs.readdir(userFolderPath, function (err, files) {

        if (!files) {
            app.set('views', viewsToSet);
            return loadNunjucks();
        }

        files = files.filter(function (item) {
            return !(/(^|\/)\.[^/.]/g).test(item);
        });

        async.each(files, function (file, eachCb) {
            var full_path = path.join(userFolderPath, file);
            var team_name = file;
            fs.stat(full_path, function (err, stat) {
                if (err) {
                    eachCb(err);
                } else {
                    if (stat.isDirectory() && files) {
                        var nunjucksFilePath = path.join(userFolderPath, file, 'nunjucks/filters.js');
                        try {
                            fs.statSync(nunjucksFilePath);
                            userNunjucksPath.push(nunjucksFilePath);
                        } catch (e) {
                            // winston.error('no filters path for ' + userFolderPath);
                        }
                        //serving the views
                        var view_path = path.join(userFolderPath, file, '/views');
                        var static_path = path.join(userFolderPath, file, '/static');
                        app.use('/' + team_name, express.static(static_path));
                        viewsToSet.push(view_path);

                        var customApi = path.join(userFolderPath, file, '/src/customApi.js');

                        // Only throw errors for customApi modules that exist
                        if (module_exists(customApi)) {
                            try {
                                var middleware = composableMiddleware().use(require(customApi)).use(require(customRoutes));
                                app.use('/api', require('./app/routes/api'));
                                app.use('/auth', helmet.frameguard(), authRoute);
                                app.use('/account', helmet.frameguard(), accountRoute);
                                app.use(subdomain(team_name, middleware));
                            } catch (e) {
                                winston.debug(`app.use error: ${e.message}`);
                                app.use(subdomain(team_name, require(customRoutes)));
                            }
                        } else {
                            app.use(subdomain(team_name, require(customRoutes)));
                        }
                    }
                    eachCb();
                }
            });

            // Set environment variables for custom teams that were loaded
            process.env[team_name.toUpperCase()] = true;
        }, function (err) {
            if (err) {
                return winston.error('cannot sync the user folder files :', err);
            }

            app.set('views', viewsToSet);

            const njk = loadNunjucks();
            userNunjucksPath.forEach(path => require(path)(njk.env, process.env));
        });
    });

    app.use('/**/fonts/*', cors());
    app.use('/**/map-pin.png', cors());

    const favicon = process.env.INSIGHT ? path.join(__dirname, '/public/images/insight-favicon.png') :
        path.join(__dirname, '/public/images/favicon.ico');

    app.use(serveFavicon(favicon));
    app.use(express.static(path.join(__dirname, '/public')));

    var routes = require('./app/routes');

    app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' })); // application/x-www-form-urlencoded
    app.use(bodyParser.json({ limit: '50mb' })); // application/JSON
    app.use(expressValidator()); // this line must be immediately after any of the bodyParser middlewares!
    app.use(require('compression')());
    app.set('trust proxy', true);
    app.use(cookieParser());

    var domain = 'localhost';

    if (process.env.HOST) {
        var urlParts = process.env.HOST.split('.');
        urlParts.splice(0, urlParts.length - 2);
        // Remove port
        urlParts[urlParts.length - 1] = urlParts[urlParts.length - 1].split(':')[0];
        domain = '.' + urlParts.join('.');
    }

    const cookiesPolicy = process.env.USE_SSL === 'true' ? {
        secure: true,
        httpOnly: true,
    } : {};

    // Mongo Store to prevent a warning.
    app.use(session({
        secret: process.env.SESSION_SECRET,
        rolling: true,
        resave: false,
        saveUninitialized: false,
        name: 'gist-session-nam3',
        cookie: {
            domain: domain,
            // 60 minutes unless otherwise specified
            maxAge: +process.env.SESSION_TIMEOUT || (1000 * 60 * 60),
            ...cookiesPolicy,
        },
        store: new MongoSessionStore({
            url: mongoose_client.dbURI,
            // url: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/arraysdb',
            // touchAfter: 240 * 3600 // time period in seconds
        }),
    }));

    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    // Logger only to use for development
    expressLogger(app);

    var raw_source_documents = require('./app/models/raw_source_documents');

    process.on('unhandledRejection', ({ message }) => {
        winston.error(`Node detected an unhandled rejection! err: ${message}`);
    });

    var modelNames = [raw_source_documents.ModelName];
    mongoose_client.FromApp_Init_IndexesMustBeBuiltForSchemaWithModelsNamed(modelNames);

    mongoose_client.WhenMongoDBConnected(function () {
        mongoose_client.WhenIndexesHaveBeenBuilt(function () {

            // winston.info(" Proceeding to boot app. ");
            //
            routes.MountRoutes(app);

            //
            // Run actual server
            if (module === require.main) {
                let server;

                var privateKeyPath = 'config/ssl/letsencrypt/privkey.pem';
                var certificatePath = 'config/ssl/letsencrypt/fullchain.pem';

                // Create a HTTPS server if the credentials exist
                if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath) && process.env.USE_SSL === 'true') {
                    const sslOptions = {
                        key: fs.readFileSync(privateKeyPath, 'utf8'),
                        cert: fs.readFileSync(certificatePath, 'utf8'),
                    };
                    server = https.createServer(sslOptions, app);

                    // Create lightweight server for redirecting http requests to https
                    http.createServer(function (req, res) {
                        res.writeHead(301, { Location: 'https://' + req.headers['host'] + req.url });
                        res.end();
                    }).listen(80);

                    process.env.USE_SSL = 'true';
                } else {
                    server = http.createServer(app);
                }

                server.listen(process.env.PORT || 9080, function () {
                    const host = isDev ? 'localhost' : server.address().address;
                    const port = server.address().port;
                    if (process.env.NODE_ENV === 'testing' || clusterWorkerSize === 1) {
                        winston.debug('listing at %s:%s', host, port);
                    } else {
                        winston.debug('Worker %d running pid %d listing at %s:%s', cluster.worker.id, process.pid, host, port);
                    }
                });
                server.timeout = 30000;
            }
        });
    });
}
module.exports = app;
