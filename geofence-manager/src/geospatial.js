var https = require('https');
var mqtt = require('mqtt');
var geo_props, iotcred;

var Geospatial = function () {
    //console.log ("started with conf " + JSON.stringify(conf)) ;
};

function doGeoHttp (httpType, path, params, conf, callback) {

    // Authorization information for all REST calls
    console.log("called do geo " + httpType) ;
    var authbuf = 'Basic ' + new Buffer(conf.userid + ':' + conf.password).toString('base64');

    var jsonObject= null;
    // prepare the header
    var httpheaders = null;
    
    if (params != null) {
        jsonObject = JSON.stringify(params);
        httpheaders = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonObject, 'utf8'),
            'Authorization': authbuf
        };
    }
    else 
        httpheaders = { 'Authorization': authbuf };

    // set the http options
    var options = {
        host: conf.geo_host,
        port: conf.geo_port,
        path: path,
        method: httpType,
        headers: httpheaders
    };
    console.info('Options prepared:');
    console.info(options);

    console.log('Perform the http call');
    var req = https.request(options, function (res) {

        res.on('data', function (d) {
            var dateStr = new Date().toISOString();
            console.log('http result: ' + d);
            console.log('http call completed at: ' + dateStr);
            console.log('statusCode: ', res.statusCode + '\n\n');
            var code = res.statusCode ;
            if (code > 200 && code <= 299)
                code = 200; // one success code is easier
            if (callback)
                callback(code, d) ;
        });

    });

    // write the json data
    if (jsonObject !== null)
        req.write(jsonObject);
    req.end();
    console.log('finished the http call');
    req.on('error', function (e) {
        console.error(e);
    });

}

Geospatial.prototype.start = function (conf, callback) {

    var inputClientId = "a:" + conf.iotcred.org + ":geoInput" + Math.floor(Math.random() * 1000).toString();
    var notifyClientId = "a:" + conf.iotcred.org + ":geoNotify" + Math.floor(Math.random() * 1000);

    // create the JSON object
    var paramsObject = {
        "mqtt_client_id_input": inputClientId,
        "mqtt_client_id_notify": notifyClientId,
        "mqtt_uid": conf.iotcred.apiKey,
        "mqtt_pw": conf.iotcred.apiToken,
        "mqtt_uri": conf.iotcred.mqtt_host + ':' + conf.iotcred.mqtt_u_port,
        "device_id_attr_name": "deviceId",
        "mqtt_input_topics": "iot-2/type/+/id/+/evt/sensorData/fmt/json",
        "mqtt_notify_topic": "iot-2/type/api/id/geospatial/cmd/geoAlert/fmt/json",
        "latitude_attr_name": "lat",
        "longitude_attr_name": "lng"
    };
    doGeoHttp('PUT', conf.geo_props.start_path, paramsObject, conf.geo_props, callback);
}

Geospatial.prototype.stop = function (conf, callback) {
    console.log("stop called");
    doGeoHttp('PUT', conf.geo_props.stop_path, null, conf.geo_props, callback);

}

Geospatial.prototype.status = function (conf, statusCallback) {
    //
    // Begin - GET status
    //
    doGeoHttp('GET', conf.geo_props.status_path, null, conf.geo_props, function(code, d) {
            var features = toFeatures(JSON.parse(d));
            statusCallback(code, features);
 
    });

}

Geospatial.prototype.load = function (conf, data, callback) {

    var regions = data.map(feature => {
        var region = { name: feature.id,
                minimumDwellTime: feature.properties.minimumDwellTime,
                notifyOnExit: feature.properties.notifyOnExit,
                notifyOnEntry: feature.properties.notifyOnEntry,
                timeout: feature.properties.timeout
            } ;
            if (feature.properties.polyType === 'normal') {
                var coords = feature.geometry.coordinates[0].map( coord => {
                    var geoCoord = {} ;
                    geoCoord.longitude = coord[0];
                    geoCoord.latitude = coord[1];
                    return geoCoord ;
                });
                coords.pop() ; // last element is duplicate of first
                region.polygon = coords ;
                region.region_type = 'custom';

            }
            else {
                region.center_longitude = feature.properties.centre[0] ;
                region.center_latitude = feature.properties.centre[1] ;
                region.distance_to_vertices = feature.properties.radius ;
                region.number_of_sides = feature.properties.numberVertices ;
                region.region_type = 'regular';
            }
            return region ;

    });
 
    doGeoHttp('PUT', conf.geo_props.add_region_path, {regions: regions}, conf.geo_props, callback);
}

Geospatial.prototype.clear = function (conf, data, callback) {
    clearRegion(conf, data, callback);
}

function clearRegion(conf, data, callback) {
    //
    // recursive function to remove each region specified by features in the data array
    //
    if (data.length > 0) {
        var feature = data.shift();
        var region = { region_name: feature.id };
        console.log("clear feature: " + JSON.stringify(feature));
        if (feature.properties.polyType === 'normal') {
            region.region_type = 'custom';
        }
        else {
            region.region_type = 'regular';
        }

        doGeoHttp('PUT', conf.geo_props.remove_region_path, region, conf.geo_props, function (code, d) {
            clearRegion(conf, data, callback);

        });

    }
    else {
        console.log('cleared');
        callback();
    }


}
function toFeatures(data) {
    console.log("to features " + data) ;
    features = [];
    if (data.custom_regions) {
        console.log("parsing custom regions");
        data.custom_regions.map(region => {
            var feature = {};
            feature.id = region.id;
            feature.type = 'Feature';
            feature.properties = {
                polyType: 'normal',
                minimumDwellTime: region.minimumDwellTime,
                notifyOnExit: region.notifyOnExit,
                notifyOnEntry: region.notifyOnEntry,
                timeout: region.timeout
            };
            feature.geometry = { type: 'Polygon', coordinates: [] };
            coords = [];
            region.polygon.map(latlon => {
                coords.push([latlon.longitude, latlon.latitude]);
            });
            coords.push(coords[0]);
            feature.geometry.coordinates[0] = coords;
            features.push(feature);

        });

    }
    if (data.regular_regions) {
        data.regular_regions.map(region => {
            var feature = {};
            feature.id = region.id;
            feature.type = 'Feature';
            feature.properties = {
                polyType: 'calculated',
                numberVertices: region.numberOfSides,
                radius: region.distanceToVerticesInMeters,
                minimumDwellTime: region.minimumDwellTime,
                notifyOnExit: region.notifyOnExit,
                notifyOnEntry: region.notifyOnEntry,
                timeout: region.timeout
            };
            feature.geometry = { type: 'Point', coordinates: [ region.centerLong, region.centerLat] };
            features.push(feature);

        });        
    }
    return features;
}
module.exports = Geospatial;