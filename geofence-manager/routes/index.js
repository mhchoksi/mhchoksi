var express = require('express');
var router = express.Router();
var app = require('../app');
var Geo = require('../src/geospatial');
var RegionStore = require('../src/regionstore');
var geo = new Geo() ;
var regionStore = new RegionStore() ;

/* GET home page. */
router.get('/', function(req, res) {
  res.render('mapview', { title: 'Express' });
});
/* GET home page. */
router.get('/mapview', function(req, res) {
  res.render('mapview', { title: 'Express' });
});


router.post('/api/geosp/start', function(req, res) {
    //console.log("req app locals" + JSON.stringify(req.app.locals));
    geo.start(req.app.locals.conf,function (data) {
        res.json({ result: 'ok', statusStr: 'Geospatial service started'});
    }) ;
 
});

router.post('/api/geosp/stop', function(req, res) {
   
    geo.stop(req.app.locals.conf,function (data) {
        res.json({ result: 'ok', statusStr: 'Geospatial service stopped'});
    }) ;
 
});
var fences = {} ;

router.post('/api/geosp/data/:project', function(req, res) {
    //console.log("save called: " + req.params.project + ":" + JSON.stringify(req.body));
    fences[req.params.project] = req.body.features;
    regionStore.save(req.app.locals.conf, req.params.project, req.body.features, function (code, data) {
        if (code === 200) {
            res.json({ result: 'ok', statusStr: 'project data saved', docs: data});
        }
        else {
            res.status(500).json ({ result: 'error', statusStr: "project data save failed"});
        }
    }) ;
 
});

router.get('/api/geosp/data/:project', function(req, res) {

    regionStore.load(req.app.locals.conf, req.params.project, function (code, data) {
        console.log("returning feature collection") ;
        if (code === 200) {
            res.json({ type:"FeatureCollection", features: data});
        }
        else {
            res.status(500).json ({ result: 'error', statusStr: "project data save failed"});
        }
    }) ;
    console.log("load data called: " + req.params.project);
    
 
});

router.post('/api/geosp/geofences', function (req, res) {
    console.log("set regions called: " + JSON.stringify(req.body));
    geo.status(req.app.locals.conf, function (code, features) {
        console.log('clearing ' + features.length + ' existing fences');
        geo.clear(req.app.locals.conf, features, function () {
            console.log("existing fences cleared: ");
            geo.load(req.app.locals.conf, req.body.features, function (code, data) {
                if (code === 200) {
                    res.json({ result: 'ok', statusStr: 'geofence regions set', docs: data });
                }
                else {
                    res.status(500).json({ result: 'error', statusStr: "set region failed" });
                }
            });

        });

    });

});

router.get('/api/geosp/geofences', function(req, res) {
    geo.status(req.app.locals.conf, function(code, features) {
        console.log("returning features " + JSON.stringify(features));
        if (code === 200) {
            res.json({ type:"FeatureCollection", features: features});
        }
        else {
            res.status(500).json ({ result: 'error', statusStr: "project data save failed"});
        }

    }) ;
    console.log("get fences called: ");
    
 
});

module.exports = router;
