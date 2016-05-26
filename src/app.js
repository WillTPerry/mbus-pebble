/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

function xhrRequest(url, type) {
  var xhr = new XMLHttpRequest();
  xhr.open(type, url, false);
  xhr.send();
  
  return xhr.responseText;
}

var stops = {}, routes = {};

var UI = require('ui');
var Vector2 = require('vector2');

var temp = new UI.Card({
  title: "Getting data..."
});

var main;

function getSortedStops(stops) {
  var keys = []; for(var key in stops) keys.push(key);
  return keys.sort(function(a,b){return stops[a].dist-stops[b].dist;});
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function latlongDist(lat1, lon1, lat2, lon2) {
  var R = 3959; // miles
  var p1 = toRadians(lat1);
  var p2 = toRadians(lat2);
  var dp = toRadians(lat2-lat1);
  var dl = toRadians(lon2-lon1);

  var a = Math.sin(dp/2) * Math.sin(dp/2) +
          Math.cos(p1) * Math.cos(p2) *
          Math.sin(dl/2) * Math.sin(dl/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function getEta(stopID) {
  var responseText = xhrRequest('http://mbus.doublemap.com/map/v2/eta?stop=' + stopID, 'GET');
  var etajson = JSON.parse(responseText);
  var etas = etajson.etas[stopID].etas;
  var etasback = [];
  
  for (var i = 0; i < etas.length; i++) {
    etasback.push({route: etas[i].route, time: etas[i].avg});
  }
  
  return etasback;
}

function locationSuccess(pos) {
  console.log('Getting Bus Data...');
  
  var responseText = xhrRequest('http://mbus.doublemap.com/map/v2/stops', 'GET');
  var stopjson = JSON.parse(responseText);
  console.log(stopjson.length + ' stops found');
  
  responseText = xhrRequest('http://mbus.doublemap.com/map/v2/routes', 'GET');
  var routejson = JSON.parse(responseText);
  console.log(routejson.length + ' routes found');
              
  stops = {};
  routes = {};
  var menuitems = [];
  
  for (var i = 0; i < stopjson.length; i++) {
    var dist = latlongDist(stopjson[i].lat, stopjson[i].lon, pos.coords.latitude, pos.coords.longitude);
    stops[stopjson[i].id] = {name: stopjson[i].name, dist: dist, routes: []};
  }
  
  for ( i = 0; i < routejson.length; i++) {
    routes[routejson[i].id] = {name: routejson[i].name, short: routejson[i].short_name, stops: routejson[i].stops};
    
    for (var j = 0; j < routejson[i].stops.length; j++) {
      stops[routejson[i].stops[j]].routes.push(routejson[i].id);
    }
  }
  
  var sortedStops = getSortedStops(stops);
  var usedStops = [];
  
  for (var stop in sortedStops) {
    if (stops[sortedStops[stop]].routes.length !== 0) {
      usedStops.push(sortedStops[stop]);
      
      var subt = stops[sortedStops[stop]].dist.toFixed(2) + ' mi -';
      for (var r in stops[sortedStops[stop]].routes) {
        subt += ' ' + routes[stops[sortedStops[stop]].routes[r]].short;
      }
      menuitems.push({title: stops[sortedStops[stop]].name, subtitle: subt});
    }
  }
  
  main = new UI.Menu({
    backgroundColor: 'blue',
    textColor: 'yellow',
    highlightBackgroundColor: 'yellow',
    highlightTextColor: 'blue',
    sections: [{
      title: 'Nearby Stops',
      items: menuitems
    }]
  });
  
  main.on('select', function(e) {
    console.log('Selected item #' + e.itemIndex);
    console.log('The item is titled "' + e.item.title + '"');
    console.log('Stop ID is: ' + usedStops[e.itemIndex]);
    
    //Get the eta
    var eta = getEta(usedStops[e.itemIndex]);
    
    var etaString = '';
    
    for (i = 0; i < eta.length; i++) {
      etaString += routes[eta[i].route].short + ': ' + eta[i].time + ' min.\n';
    }
    
    var stopCard = new UI.Card({
      subtitle: stops[usedStops[e.itemIndex]].name,
      body: etaString
    });
    
    stopCard.show();
  });
          
  main.show();
  temp.hide();
            
}

temp.show();
navigator.geolocation.getCurrentPosition(locationSuccess);