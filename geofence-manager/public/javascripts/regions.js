
var Regions = (function() {
    var my = { 
        circleToPolygon: circleToPolygon,
        circleToPolyFeature: circleToPolyFeature,
	    polyToCentre: polyToCentre,
	    getRegions: getRegions,
	    setRegions: setRegions
    } ;

function circleToPolygon(centre, metreRadius, numPoints) {
    var degreesBetweenPoints = 8;
    if (numPoints != undefined && numPoints != 0) {
        degreesBetweenPoints = Math.floor(360 / numPoints);
        console.log("degrees %d numpoints %d", degreesBetweenPoints, numPoints);
    }
    var numberOfPoints = Math.floor(360 / degreesBetweenPoints);
    console.log("degrees %d numpoints %d", degreesBetweenPoints, numberOfPoints);
    var distRadians = metreRadius / 6371000.0; // earth radius in meters
    var centerLatRadians = centre[1] * Math.PI / 180;
    var centerLonRadians = centre[0] * Math.PI / 180;
    var coords = [] ;
    for (var index = 0; index < numberOfPoints; index++) {
        var degrees = index * degreesBetweenPoints;
        var degreeRadians = degrees * Math.PI / 180;
        var pointLatRadians = Math.asin( Math.sin(centerLatRadians) * Math.cos(distRadians)
             + Math.cos(centerLatRadians) * Math.sin(distRadians) * Math.cos(degreeRadians));
        var pointLonRadians = centerLonRadians 
            + Math.atan2( Math.sin(degreeRadians) * Math.sin(distRadians) * Math.cos(centerLatRadians),
                                              Math.cos(distRadians) - Math.sin(centerLatRadians) * Math.sin(pointLatRadians) );
        var pointLat = pointLatRadians * 180.0 / Math.PI;
        var pointLon = pointLonRadians * 180.0 / Math.PI;
        coords.push([pointLon, pointLat]);

    }
    coords.push(coords[0]) ; // finish with last point
    var circlePoly = { type: "Polygon", coordinates: [ coords ] } ;
    console.log(JSON.stringify(circlePoly));
    return circlePoly;
}
function circleToPolyFeature(centre, radius, numPoints) {
    if (numPoints === undefined || numPoints === 0) {
        numPoints = Math.floor(360 / 8);
    }
    var feature = {} ;
    feature.properties = {radius : radius, centre: centre, numberVertices: numPoints, polyType: 'calculated'} ;
    feature.type = 'Feature' ;
    feature.geometry = circleToPolygon(centre, radius, numPoints);
    return feature ;

}
function polyToCentre(coords, metreRadius) {
    var distRadians = metreRadius / 6371000.0; // earth radius in meters
    var firstLat = coords[0][1];
    console.log ('flat: ' + firstLat);
    var firstLatRadians = firstLat * Math.PI / 180.0 ;
    
    var centreLatRadians = Math.asin( Math.sin(firstLatRadians) * Math.cos(distRadians)
             - Math.cos(firstLatRadians) * Math.sin(distRadians) );
    var centreLat = centreLatRadians * 180.0 / Math.PI;
    var centreLong = coords[0][0];
    console.log("centre lat " + coords[0][1] + " to " + centreLat) ;
    return [centreLong, centreLat] ;
    
}

function getRegions (pdraw) {
    var allObjs = pdraw.getAll();
    var centreArr = [] ;
    var newFeatures = allObjs.features.map(feature => {
        if (feature.geometry.type == 'Polygon') {
            if (feature.properties === undefined || feature.properties.polyType == undefined) {
                feature.properties = { polyType: 'normal'} ;
            }
            console.log("normalised " + JSON.stringify(feature));
            return feature;

        }
    });
    allObjs.features = newFeatures;
    return allObjs;

}

function setRegions (pdraw, regionCollection) {
    var bounds = new mapboxgl.LngLatBounds();
    pdraw.deleteAll();
    var newFeatures = regionCollection.features.map(feature => {
        if (feature.geometry.type == 'Point') {
            if (feature.properties !== undefined && feature.properties.polyType === 'calculated') {
                var coords = [ parseFloat(feature.geometry.coordinates[0]), parseFloat(feature.geometry.coordinates[1])];
                var radiusStr = feature.properties.radius;
                var numVertices = feature.properties.numberVertices ;
                var circObj = Regions.circleToPolygon(coords, 
                            parseInt(radiusStr), parseInt(numVertices));
                feature.geometry.type = 'Polygon';
                feature.properties.centre = feature.geometry.coordinates;
                feature.geometry = circObj;
            }
        }
        if (feature.geometry.type == 'Polygon') {
            if (feature.properties === undefined || feature.properties.polyType == undefined) {
                feature.properties = { polyType: 'normal'} ;
            }
            var coords = feature.geometry.coordinates[0].map( coord => {
                return [ parseFloat(coord[0]), parseFloat(coord[1])] ;
            }) ;
            var b1 = coords.reduce(function (b, coord) {
                return b.extend(coord);
            }, new mapboxgl.LngLatBounds(coords[0], coords[0]));
            console.log('new bounds ' + JSON.stringify(b1));
            bounds.extend(b1);

            feature.geometry.coordinates[0] = coords;
            console.log("normalised " + JSON.stringify(feature));
            if (feature.properties.polyType == 'calculated') {
                if ($.type(feature.properties.centre[0]) === "string")
                    feature.properties.centre = [ parseFloat(feature.properties.centre[0]),
                                            parseFloat(feature.properties.centre[1])];
                
                 feature.properties.cid = pdraw.add({ type: 'Point', coordinates: feature.properties.centre });
           }
           return feature;

        }
    });
    regionCollection.features = newFeatures;
    pdraw.add(regionCollection);
    console.log('bounds ' + JSON.stringify(bounds));
    return bounds ;
}

return my ;
}()) ;
