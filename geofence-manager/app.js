require('assert-dotenv')();

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var Cloudant = require('cloudant');
var routes = require('./routes/index');

var app = express()
var fs = require('fs');
 

var conf = {
    logDbName: process.env.LOGVIEW_DBNAME ? process.env.LOGVIEW_DBNAME :'dbinfolog',
    logTitle: process.env.LOGVIEW_TITLE ? process.env.LOGVIEW_TITLE : "Log Viewer",
    logDescription: process.env.LOGVIEW_SUBTITLE ? process.env.LOGVIEW_SUBTITLE : ""
  } ;

app.set('port', process.env.PORT || 3000);


if (process.env.VCAP_SERVICES === undefined && process.env.VCAP_FILE !== undefined) {
    console.log("vcap file:" + process.env.VCAP_FILE);
    process.env.VCAP_SERVICES = fs.readFileSync(process.env.VCAP_FILE, 'utf8');
}


if (process.env.VCAP_SERVICES !== undefined){
    //get the service JSON object
//    console.log("found vcap services %s", process.env.VCAP_SERVICES);
    env = JSON.parse(process.env.VCAP_SERVICES);
   // Find the Geospatial Analytics service
    if (env['Geospatial Analytics']) {
        conf.geo_props = env['Geospatial Analytics'][0]['credentials'];
//        console.log('Geospatial Analytics credentials: ');
//        console.log(conf.geo_props);
        conf.geo_service_name = env['Geospatial Analytics'][0]['name'];
        
    }
    if (env['iotf-service']) {
        conf.iotcred = env['iotf-service'][0]['credentials'];
//        console.log('IOT credentials: ');
//        console.log(conf.iotcred);       
    }
    if (env['cloudantNoSQLDB']) {
        conf.dbcred = env['cloudantNoSQLDB'][0]['credentials'];
        console.log('DB credentials: ');
        console.log(conf.dbcred);       
    }
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));

var extract = require('extract-zip');
var fs = require ('fs');

var jsDirPath = path.join(__dirname, 'public/javascripts/lib');
var zipSrcPath = path.join(__dirname, 'resources');
var jqName = 'jquery-ui-1.12.1';
fs.mkdir(jsDirPath, function(err) {
    extractZipDir('jquery-ui-1.12.1', zipSrcPath, jsDirPath);
    extractZipDir('jtable.2.4.0', zipSrcPath, jsDirPath);
});
function extractZipDir( zipName, zipPath, targetPath) {
    if (targetPath == undefined)
        targetPath = zipPath;
    var zipFileName = path.join(zipPath, zipName + '.zip')

    fs.readdir(path.join(targetPath, zipName), function(err, files) {
        if (err) {
            console.log ("extracting " + zipName + " to: " + targetPath);
            extract(zipFileName, {dir: targetPath}, function (err) {
            // extraction is complete. make sure to handle the err 
                if (err) {
                    throw (err);
                }
            });
        }
        else {
            console.log("directory " + zipName + " exists: in " + targetPath);
        }
    });
}

app.locals.conf = conf;
console.log("conf is: " + JSON.stringify(app.locals.conf)) ;


app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var runport=3000;
runport=app.get('port');
http.createServer(app).listen(runport, function(){
console.log('Express server listening on port ' + runport);
});

module.exports = app;

