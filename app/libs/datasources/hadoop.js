var jdbc = require('jdbc');
var jinst = require('jdbc/lib/jinst');
var async = require('async');
var path = require('path');
var driverPath = path.join(__dirname, '/../impala_drivers/');
var winston = require('winston');
var moment = require('moment');
var _ = require('lodash');

if (!jinst.isJvmCreated()) {
    jinst.addOption('-Xrs');
    jinst.setupClasspath([driverPath + 'commons-codec-1.3.jar',
        driverPath + 'commons-codec-1-3.jar',
        driverPath + 'commons-logging-1.1.1.jar',
        driverPath + 'hive_metastore.jar',
        driverPath + 'hive_service.jar',
        driverPath + 'httpclient-4.1.3.jar',
        driverPath + 'httpcore-4.1.3.jar',
        driverPath + 'ImpalaJDBC41.jar',
        driverPath + 'libfb303-0.9.0.jar',
        driverPath + 'libthrift-0.9.0.jar',
        driverPath + 'log4j-1.2.14.jar',
        driverPath + 'ql.jar',
        driverPath + 'slf4j-api-1.5.11.jar',
        driverPath + 'slf4j-log4j12-1.5.11.jar',
        driverPath + 'TCLIServiceClient.jar',
        driverPath + 'zookeeper-3.4.6.jar'
    ]);
}

var db;

function _readColumnsAndSample(url, tableName, fn) {

    // return fn(null,[{name:'colA',sample:'123',sourceType:'database',
    //    sourceName: url}, {name: 'colB',sample:'stringjiwji24',sourceType:'database',sourceName: url}]);

    db.reserve(function(err, connObj) {
        var conn;

        if (connObj) {
            console.log(connObj);
            console.log('Using connection: ' + connObj.uuid);
            try {
                conn = connObj.conn;
            } catch (e) {
                console.log('couldn\'t get connection');
                console.log(e);
            }

            async.waterfall([
                function(callback) {
                    conn.createStatement(function(err, statement) {
                        if (err) {
                            console.log('statement error');
                            console.log(statement);
                            callback(err);
                        } else {
                            callback(null, statement);
                        }
                    });
                },
                function(statement, callback) {
                    // maybe here keep track of lot_name and cache - then compare against it
                    statement.executeQuery('SELECT * FROM ' + tableName + ' LIMIT 1', function(err, results) {
                        if (err) {
                            console.log('execute query err');
                            callback(err);
                        } else {
                            callback(null, results);
                        }
                    });
                },
                function(results, callback) {
                    results.toObjArray(function(err, obj) {
                        if (err) {
                            callback(err);
                        } else {
			                obj = unWrapJavaDecimals(obj);
                            callback(null, obj);
                        }
                    });
                },
                function(array, callback) {
                    var data = [];
                    var firstRecord = array[0];
                    for (var col in firstRecord) {
                        data.push({ sourceName: url, name: col.split('.')[1], sample: firstRecord[col], sourceType: 'database' });
                    }
                    callback(null, data);
                }
            ], function(err, arrayOfCols) {
                var errorFromFuncions = err;
                db.release(connObj, function(err) {
                    if (err || errorFromFuncions) {
                        winston.error('Error reading remote data columns and records: %s', err);
                        return fn(err);
                    } else {
                        winston.info('return data and release connection:', connObj.uuid);
                        return fn(null, arrayOfCols);
                    }
                });
            });
        }
    });
}

module.exports.readColumnsAndSample = function(body, tableName, fn) {

    if (db) {

        _readColumnsAndSample(body.url, tableName, fn);

    } else {

        _initConnection(body.url, function(err) {
            if (err) {
                return fn(err);
            }
            _readColumnsAndSample(body.url, tableName, fn);

        });

    }
};

function _readAllTables(fn) {

    db.reserve(function(err, connObj) {

        if (connObj) {

            console.log('Using connection: ' + connObj.uuid + 'for reading tables in this schema');
            var conn = connObj.conn;

            async.waterfall([
                function(callback) {
                    conn.createStatement(function(err, statement) {
                        if (err) {
                            console.log('statement error');
                            console.log(statement);
                            callback(err);
                        } else {
                            callback(null, statement);
                        }
                    });
                },
                function(statement, callback) {
                    statement.executeQuery('SHOW TABLES', function(err, results) {
                        if (err) {
                            console.log('shwo tables error');
                            callback(err);
                        } else {
                            callback(null, results);
                        }
                    });
                },
                function(results, callback) {
                    results.toObjArray(function(err, obj) {
                        if (err) {
                            callback(err);
                        } else {
			                obj = unWrapJavaDecimals(obj);
                            callback(null, obj);
                        }
                    });
                }
            ], function(err, arrayOfTables) {
                var errorFromFuncions = err;
                db.release(connObj, function(err) {
                    if (err || errorFromFuncions) {
                        winston.error('Error reading tables from connection');
                        console.log(err);
                        console.log(errorFromFuncions);
                        return fn(err);
                    } else {
                        console.log('return data of tables and release connection:', connObj.uuid);
                        return fn(null, arrayOfTables);
                    }
                });
            });
        }
    });

}

function _initConnection(url, callback) {
    // return callback(null);
    winston.info('ready to init a new connection.');
    var config = {
        url: url,
        minpoolsize: 5,
        maxpoolsize: 10,
        maxidle: 1800000
    };
    var JDBC = new jdbc(config);

    JDBC.initialize(function(err) {
        if (err) {
            console.log('Error from initializing connection :: ');
            console.log(err);
            callback(err);
        } else {
            console.log('successfully initialized connection');
            db = JDBC;
            callback(null);
        }
    });
}

module.exports.initConnection = function(body, callback) {

    // return callback(null,[{tab_name:'a'},{tab_name:'b'}]);
    if (db) {
        console.log('init connection: connection already made.');

        _readAllTables(function(err, data) {
            if (err) {
                callback(err);
            } else {
                // console.log("successfully read tables, data %s", JSON.stringify(data));
                console.log('successfully read tables');
                callback(null, data);
            }
        });

    } else {

        _initConnection(body.url, function(err) {
            if (err) {
                console.log('no db exists - there was an error when initializing connection');
                callback(err);
            } else {
                console.log('attempting to read tables');
                _readAllTables(function(err, data) {
                    if (err) {
                        console.log('couldn\'t read tables');
                        return callback(err);
                    } else {
                        // console.log("successfully read tables, data %s", JSON.stringify(data));
                        console.log('successfully read tables');
                        callback(null, data);
                    }
                });
            }
        });
    }
};

function _runQuery(query, fn) {
    console.log('in _runQuery - about to reserve connection');
    db.reserve(function(err, connObj) {
        if (connObj) {
            console.log('Using connection: ' + connObj.uuid + ' to run query');
            var conn = connObj.conn;

            async.waterfall([
                function(callback) {
                    console.log('creating statement');
                    conn.createStatement(function(err, statement) {
                        if (err) {
                            console.log('there was an error when creating statement');
                            callback(err);
                        } else {
                            console.log('created statement');
                            callback(null, statement);
                        }
                    });
                },
                function(statement, callback) {
                    winston.info('Executing query: %s', query);
                    statement.executeQuery(query, function(err, results) {
                        if (err) {
                            console.log('something went wrong when executing query');
                            callback(err);
                        } else {
                            console.log('executed query');
                            callback(null, results);
                        }
                    });
                },
                function(results, callback) {
                    console.log('making results into array');
                    results.toObjArray(function(err, obj) {
                        if (err) {
                            console.log(`something went wrong when making results into array: ${err}`);
                            callback(err);
                        } else {
                            console.log('made array');
			                obj = unWrapJavaDecimals(obj);
                            callback(null, obj);
                        }
                    });
                }
            ], function(err, arrayOfData) {
                console.log('releasing connection');
                db.release(connObj, function(error) {
                    if (err || error) {
                        winston.error('Error running query');
                        console.log('err in releasing db : %s', error);
                        console.log('err from function executing query : %s', err);
                        return fn(err || error);
                    } else {
                        console.log('released connection');
                        return fn(null, arrayOfData);
                    }
                });
            });
        }
    });
}

module.exports.readData = function(url, query, fn) {
    if (!db) {
        _initConnection(url, function(err) {
            if (err) {
                fn(err);
            } else {
                _runQuery(query, (err, arrayOfData) => {
                    if (err) {
                        console.log('error when running query', err);
                        return fn(err);
                    } else {
                        console.log('successfully ran query');
                        fn(null, arrayOfData);
                    }
                });
            }
        });
    } else {
        _runQuery(query, function(err, arrayOfData) {
            if (err) {
                console.log('error when running query', err);
                return fn(err);
            } else {
                console.log('successfully ran query');
                fn(null, arrayOfData);
            }
        });
    }
};

module.exports.getListOfIds = function(url, table, lastRetrieved, callback) {
    if (!db) {
        console.log('in get list of ids - initializing connection');
        _initConnection(url, function (err) {
            if (err) {
                callback(err);
            } else {
                // return callback(null, [{'rowParams': {'Pokemon No_': 151}}, {'rowParams': {'Pokemon No_': 152}}, {'rowParams': {'Pokemon No_': 153}}, {'rowParams': {'Pokemon No_': 154}}])
                // specific to amgen atlas
                let query = 'SELECT lot_name AS bioreg_id FROM ' + table;
                if (lastRetrieved) {
                    const lastRetrievedString = moment(lastRetrieved).format('YYYY-MM-DD');
                    query += ' WHERE creation_date >= "' + lastRetrievedString + '00:00:00"';
                }
                _runQuery(query, function (err, data) {
                    if (err) {
                        console.log('there was an error when running query');
                        console.log(err);
                        return callback(err);
                    } else {
                        console.log('retrieved list of ids');
                        return callback(err, data);
                    }
                });
            }
        });
    } else {
        console.log('found db');
        var query = 'SELECT lot_name AS bioreg_id FROM ' + table;
        _runQuery(query, function (err, data) {
            if (err) {
                console.log('there was an error when running query');
                console.log(err);
                return callback(err);
            }
            callback(null, data);
        });
    }
};

function unWrapJavaDecimals(input) {
    if (input && _.isArray(input)) {
        return input.map(function(obj) {
            try {
                for (var field in obj) {
                    if (typeof obj[field] === 'object' && obj[field] !== null) {
                        obj[field] = obj[field].intValueSync();
                    }
                }
                return obj;
            } catch (e) {
                console.log(e);
            }
        });
    } else {
	    return input;
    }
}
