
// insert your own access token here
var myMapboxAccessToken = 'pk.eyJ1IjoibWVnaGF2aSIsImEiOiJjajBzMWl5ZWcwMmpkMnFucHAzYWprY2FpIn0.-h8DgtFM9Y546l0gX9ol0w';

var pdraw;
var startButton;
var stopButton;
var saveButton;
var loadButton;
var map;
    var dialog, form;
var currFeature ;

 $( function() {
 
      var name = $( "#regionid" ),
      email = $( "#radius" ),
      password = $( "#vertices" ),
      allFields = $( [] ).add( name ).add( email ).add( password ),
      tips = $( ".validateTips" );

     
      function saveCurrPoly() {
          allFields.removeClass("ui-state-error");
          var f = currFeature;
          if (f.properties.polyType != undefined && f.properties.polyType === 'uncalculated') {
              drawCalcPoly(f);

          }
          if (f.properties.polyType != undefined && f.properties.polyType === 'calculated') {
              redrawCalcPoly(f);

          }
          if (f.properties.polyType != undefined && f.properties.polyType === 'normal') {
              updatePolyProps(f);
          }
          dialog.dialog("close");
      }
 
    dialog = $( "#dialog-form" ).dialog({
      autoOpen: false,
      height: 300,
      width: 350,
      modal: true,
      buttons: {
        "Delete": function() {
            removeCurrPoly() ;
            dialog.dialog( "close" );
        },
        "Save": saveCurrPoly,
        Cancel: function() {
          dialog.dialog( "close" );
        }
      },
      close: function() {
        form[ 0 ].reset();
        allFields.removeClass( "ui-state-error" );
      }
    });
 
    form = dialog.find( "form" ).on( "submit", function( event ) {
      event.preventDefault();
      saveCurrPoly();
    });
 
  } );

function openFeatureDialog(d, f) {
    $("#regionid").val(f.id);
    if (f.properties !== undefined && f.properties.radius !== undefined) {
        $('#radiusForm').show();
        $("#radius").val(f.properties.radius);
        $("#vertices").val(f.properties.numberVertices);
    }
    else {
        $('#radiusForm').hide();
    }
    $("#notifyOnEntry").val(f.properties.notifyOnEntry);
    $("#notifyOnExit").val(f.properties.notifyOnExit);
    $("#minimumDwellTime").val(f.properties.minimumDwellTime);
    $("#timeout").val(f.properties.timeout);
    console.log($("#name").text());
    currFeature = f ;
    d.dialog( "open" );
}
if ("geolocation" in navigator) {
  /* geolocation is available */
  navigator.geolocation.getCurrentPosition(function(position) {
      console.log(position.coords.latitude, position.coords.longitude);
    drawMap(position.coords.latitude, position.coords.longitude);
    });
} else {
  /* geolocation IS NOT available */
  drawMap(40, -74.50)
}
function defaultRegionProperties() {
    var props = {
        notifyOnEntry: true, 
        notifyOnExit: false,
        minimumDwellTime: 0,
        timeout: 0
    } ;
    return props;
}
function drawCalcPoly(f) {
    var radiusStr = $("#radius").val();
    var numVertices = $("#vertices").val();
    var circFeature = Regions.circleToPolyFeature(f.geometry.coordinates,
        parseInt(radiusStr), parseInt(numVertices));
    circFeature.properties.cid = f.id;
    //console.log("new calc feature" + JSON.stringify(circFeature.geometry));
    var objId = pdraw.add(circFeature.geometry);
    var allObjs = pdraw.getAll();
    var newFeatures = allObjs.features.map(feature => {
        if (feature.id == objId) {
            if (feature.properties !== undefined && feature.properties.rev !== undefined)
                circFeature.properties.rev = feature.properties.rev;
            feature.properties = circFeature.properties;
            feature.properties.notifyOnEntry = $("#notifyOnEntry").val();
            feature.properties.notifyOnExit = $("#notifyOnExit").val();
            feature.properties.minimumDwellTime = $("#minimumDwellTime").val();
            feature.properties.timeout = $("#timeout").val();
            if (f.id != $("#regionid").val()) {
                feature.id = $("#regionid").val();
            }
            console.log("got: " + JSON.stringify(feature));

        }
        if (feature.id == f.id) {
            feature.properties.polyType = 'calculated';
        }
        return feature;
    });
    allObjs.features = newFeatures;
    pdraw.set(allObjs);

}
function redrawCalcPoly(f) {
    var radiusStr = $("#radius").val();
    var numVertices = $("#vertices").val();
 
    var objId = f.id ;
    var allObjs = pdraw.getAll();
    var newFeatures = allObjs.features.map(feature => {
        if (feature.id == objId) {
            if (f.properties.radius != parseInt(radiusStr)
            || f.properties.numVertices != parseInt(numVertices)) {

                feature = Regions.circleToPolyFeature(f.properties.centre,
                    parseInt(radiusStr), parseInt(numVertices));
                feature.properties.cid = f.properties.cid;
                if (f.properties.rev !== undefined)
                    feature.properties.rev = f.properties.rev;
                feature.id = f.id;
                console.log("rad ver change: " + JSON.stringify(feature));
            }
            feature.properties.notifyOnEntry = $("#notifyOnEntry").val();
            feature.properties.notifyOnExit = $("#notifyOnExit").val();
            feature.properties.minimumDwellTime = $("#minimumDwellTime").val();
            feature.properties.timeout = $("#timeout").val();
            if (feature.id != $("#regionid").val()) {
                feature.id = $("#regionid").val();
            }

        }
        return feature;
    });
    allObjs.features = newFeatures;
    pdraw.set(allObjs);

}
function removeCurrPoly() {
 
    //console.log("new calc feature" + JSON.stringify(circFeature.geometry));
    var f = currFeature;
    console.log("removing poly: " + f.id);
    var objId = f.id ;
    var allObjs = pdraw.getAll();
    var modFeatures = allObjs.features.reduce(function(features, feature) {
        if (feature.id !== objId)
            features.push(feature);
        return features;
    }, []);
    allObjs.features = modFeatures;
    pdraw.set(allObjs);

}
function updatePolyProps(f) {
    var allObjs = pdraw.getAll();
    var newFeatures = allObjs.features.map(feature => {
        if (feature.id == f.id) {
            feature.properties.notifyOnEntry = $("#notifyOnEntry").val();
            feature.properties.notifyOnExit = $("#notifyOnExit").val();
            feature.properties.minimumDwellTime = $("#minimumDwellTime").val();
            feature.properties.timeout = $("#timeout").val();
            if (feature.id != $("#regionid").val()) {
                feature.id = $("#regionid").val();
                delete feature.properties.rev; // namechange is new object
            }

        }
        return feature;
    });
    allObjs.features = newFeatures;
    pdraw.set(allObjs);

}
function drawMap(lat, long) {
    mapboxgl.accessToken = myMapboxAccessToken;
    map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v9', //stylesheet location
        center: [long, lat], // starting position
        zoom: 9 // starting zoom
    });
    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl());
    //add draw controls to map
    pdraw = mapboxgl.Draw({
        drawing: true,
        displayControlsDefault: false,
        controls: {
            polygon: true,
            point: true,
            trash: true
        }
    });
    var selCount = 0 ;
    map.addControl(pdraw);
    map.on('draw.selectionchange', function(e) {
        if (e.features.length > 0) {
            openFeatureDialog(dialog, e.features[0]) ;
        }

    }) ;
    map.on('draw.update', function(e) {
         var geoObj = e.features[0].geometry ;
            var moveFeature = e.features[0] ;
         
         if (moveFeature.properties.polyType !== undefined && moveFeature.properties.polyType == 'calculated') {
              var centreArr = Regions.polyToCentre(geoObj.coordinates[0],parseInt(moveFeature.properties.radius) ) ;
              var allObjs = pdraw.getAll();
              var newFeatures = allObjs.features.map(feature => {
              if (feature.id == moveFeature.id) {
                    feature.properties.centre = centreArr;                    
              }
              if (feature.id == moveFeature.properties.cid) {
                    feature.geometry.coordinates = centreArr;                    
              }
              return feature;
            });
            allObjs.features = newFeatures;
            pdraw.set(allObjs);           

         }

    }) ;
    map.on('draw.create', function(e) {
       if (e.features.length != 1)
            return ;
        var geoObj = e.features[0].geometry ;
        var dobj = pdraw.get(geoObj.id) ;
        var geoId = e.features[0].id;
        
        console.log("id = " + geoId);
        var allObjs = pdraw.getAll();
        var newFeatures = allObjs.features.map(feature => {
            if (feature.id == geoId) {
                feature.properties = defaultRegionProperties();
                if (geoObj.type == 'Point') {
                    feature.properties.polyType = "uncalculated";
                    feature.properties.radius = 5000;
                    feature.properties.numberVertices = 0;
                    console.log("got centre: " + JSON.stringify(feature));
                }
                else
                    feature.properties.polyType = "normal";

            }
            return feature;
        });
        allObjs.features = newFeatures;
        pdraw.set(allObjs);
        
    }) ;


    startButton = document.getElementById('start-service');
    startButton.onclick = function () {
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'starting geospatial service' + '</strong></p>';
        $.post('/api/geosp/start', function( data ) {
            var answer = document.getElementById('results-area');
            answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
        }).fail(function () {
            alert("error starting geospatial service - check server logs for details");
        });

    };
    stopButton = document.getElementById('stop-service');
    stopButton.onclick = function () {
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'stopping geospatial service' + '</strong></p>';
        $.post('/api/geosp/stop', function( data ) {
            var answer = document.getElementById('results-area');
            
            answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
        }).fail(function () {
            alert("error stopping geospatial service - check server logs for details");
        });

    };
    saveButton = document.getElementById('save-data');
    saveButton.onclick = function () {
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'saving project data' + '</strong></p>';
        var regions = Regions.getRegions(pdraw);
        var myUrl = '/api/geosp/data/' + $('#project').val();
        $.post(myUrl, regions, function( data ) {
            var answer = document.getElementById('results-area');
            answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
        }).fail(function () {
            alert("error saving project data - check server logs for details");
        });

    };
    loadButton = document.getElementById('load-data');
    loadButton.onclick = function () {
        console.log("project: " + $('#project').val()) ;
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'getting project data' + '</strong></p>';
        var myUrl = '/api/geosp/data/' + $('#project').val();
        $.get(myUrl, function( data ) {
            console.log("reloaded saved data" + JSON.stringify(data));
            var bounds = Regions.setRegions(pdraw, data);
            map.fitBounds(bounds, {
                padding: 150
            });
            if (data.statusStr) 
                answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
            else
                answer.innerHTML = '<p><strong>' + 'got project data' + '</strong></p>';

        }).fail(function () {
            alert("error getting project data - check server logs for details");
        });

    };
    getButton = document.getElementById('get-regions');
    getButton.onclick = function () {
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'getting regions' + '</strong></p>';
        var regions = Regions.getRegions(pdraw);
        $.get('/api/geosp/geofences', function( data ) {
            console.log("reloaded saved data" + JSON.stringify(data));
            var bounds = Regions.setRegions(pdraw, data);
            map.fitBounds(bounds, {
                padding: 150
            });
            if (data.statusStr) 
                answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
            else
                answer.innerHTML = '<p><strong>' + 'got regions' + '</strong></p>';
        }).fail(function () {
            alert("error getting regions from geospatial service - check server logs for details");
        });

    };
    setButton = document.getElementById('set-regions');
    setButton.onclick = function () {
        var regions = Regions.getRegions(pdraw);
        var answer = document.getElementById('results-area');
        answer.innerHTML = '<p><strong>' + 'setting region' + '</strong></p>';
        $.post('/api/geosp/geofences', regions, function( data ) {
            
            console.log("set regions" + JSON.stringify(data));
            answer.innerHTML = '<p><strong>' + data.statusStr + '</strong></p>';
        }).fail(function () {
            alert("error setting regions in geospatial service - check server logs for details");
        });

    };
}

