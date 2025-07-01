var locationSettings = {/*This is what you can edit, anything under the lcationSettings object
  you can change it if you want but why would you when there's a settings panel to chenge this stuff.*/
  mainCity: {
    autoFind: true, //set to false if you want to manually set the location
    displayname:"",//set this to whatever you want the main location's name to be
    type:"",//choose the following types from below:
    //geocode -- (coordinates)
    //postalKey -- (zip code)
    //iataCode -- (IATA airport code)
    //icaoCode -- (ICAO airport code)
    //placeid -- (PLace ID)
    //canonicalCityId -- (Canonical City ID)
    //locud -- (Location ID)
    val:"",//the value that goes with the type. Like if you select iataCode, the val would be JFK if you want JFK Airport. 
    //===NOTES===
    //if you use geocode (coordinates), you must use the format "latitude,longitude" for the val
    //if you use postalKey (zipcode), you must put ":US" after the zip code. I may be wrong about this but to be safe put it after the code.
  },
  eightCities: {
    autoFind: true,
    //same guidelines as mainCity location settings as the eight nearby locations.
    cities:[//if you use less than 8 locations, please delete the unused cities objects.
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
      {
        displayname:"",
        type:"",
        val:"",
      },
    ]
  }
}
//dont change this stuff. This gets filled in regardless if you want to manually fill out locations or not.
var locationConfig = {
  mainCity: {
    displayname:"",
    lat:"",
    lon:"",
    state:"",
    stateFull:"",
  },
  eightCities: {
    cities: [],
  }
}
var queryFail = false;
var locationTimezone, localTimezone;
var surrCityList = {}
var queryname = ""
function locationJS() {
function locationGrab() {
  if (locationSettings.mainCity.autoFind == false) {
    $.getJSON("https://api.weather.com/v3/location/point?" + locationSettings.mainCity.type + "=" + locationSettings.mainCity.val + "&language=en-US&format=json&apiKey=" + api_key, function(data) {
      locationConfig.mainCity.displayname = ((locationConfig.mainCity.displayname != "") ? locationConfig.mainCity.displayname : data.location.displayName)
      locationConfig.mainCity.lat = data.location.latitude
      locationConfig.mainCity.lon = data.location.longitude
      locationConfig.mainCity.state = data.location.adminDistrictCode
      locationConfig.mainCity.stateFull = data.location.adminDistrict
      if (locationSettings.eightCities.autoFind == true) {
        autoSurroundingLocs()
      } else {
        manualSurroundingLocs()
      }
      console.log(locationSettings)
      console.log(locationConfig)
    })
  } else {
    if (queryname != "") {
      $.getJSON("https://api.weather.com/v3/location/search?query=" + queryname +"&language=en-US&format=json&apiKey=" + api_key, function(data) {
        queryFail = false;
        // locationConfig.mainCity.displayname = data.location.displayName[0]
        // locationConfig.mainCity.lat = data.location.latitude[0]
        // locationConfig.mainCity.lon = data.location.longitude[0]
        // locationConfig.mainCity.state = data.location.adminDistrictCode[0]
        // locationConfig.mainCity.stateFull = data.location.adminDistrict[0]
        locationTimezone = data.location.ianaTimeZone[0];
        nearestObservationStation(data.location.latitude[0], data.location.longitude[0], function(loc){
          locationConfig.mainCity = loc;
          locationConfig.mainCity.displayname = data.location.displayName[0]
          if (locationSettings.eightCities.autoFind == true) {
            autoSurroundingLocs()
          } else {
            manualSurroundingLocs()
          }
        });
        console.log(locationSettings)
        console.log(locationConfig)
      }).fail(function() {
        queryFail = true;
      })
    } else {
      $.getJSON("http://ip-api.com/json/", function(data) {
        locationConfig.mainCity.displayname = data.city
        locationConfig.mainCity.lat = data.lat
        locationConfig.mainCity.lon = data.lonn
        locationConfig.mainCity.state = data.region
        locationConfig.mainCity.stateFull = data.regionName
        if(locationTimezone == undefined){locationTimezone = data.timezone;}
        localTimezone = data.timezone;
        nearestObservationStation(data.lat, data.lon, function(loc){
          locationConfig.mainCity = loc;
        });
        setTimeout(() =>{
          if (locationSettings.eightCities.autoFind == true) {
            autoSurroundingLocs()
          } else {
            manualSurroundingLocs()
          }
          console.log(locationSettings)
          console.log(locationConfig)
        },250)
      }).fail(function() {
        locationConfig.mainCity.displayname = undefined
        locationConfig.mainCity.lat = undefined
        locationConfig.mainCity.lon = undefined
        locationConfig.mainCity.state = undefined
        locationConfig.mainCity.stateFull = undefined
        if (locationSettings.eightCities.autoFind == true) {
          autoSurroundingLocs()
        } else {
          manualSurroundingLocs()
        }
        // console.log(locationSettings)
        // console.log(locationConfig)
      })
    }
  }
}

/**
 * Returns the nearest observation station (ASOS/AWOS) from a pair of coords.
 * @param {*} lat latitude (Mandatory)
 * @param {*} lon longitude (Mandatory)
 * @param {*} callback returns a function with the location object after completion
 * 
 * Example call: nearestObservationStation(data.lat, data.lon, function(loc){locationConfig.mainCity = loc})
 * 
 * You will have to wait 250ms before doing any location calls involving the coords
 */
function nearestObservationStation(lat,lon,callback){
  $.getJSON('https://api.weather.com/v3/location/near?geocode=' + lat + ',' + lon + '&product=observation&format=json&apiKey=' + api_key, function(data) {
    $.getJSON(`https://api.weather.com/v3/location/point?geocode=${data.location.latitude[0]},${data.location.longitude[0]}&language=en-US&format=json&apiKey=${api_key}`, 
      function(locdata){
        var locObj = {
          displayname: locdata.location.displayName,
          stationname: formatStationName(data.location.stationName[0]),
          lat: locdata.location.latitude,
          lon: locdata.location.longitude,
          state: locdata.location.adminDistrictCode,
          stateFull: locdata.location.adminDistrict
        }
        if(callback){callback(locObj)}
      })
  })
}

function autoSurroundingLocs() {
  locationConfig.eightCities.cities = [];
  $.getJSON('https://api.weather.com/v3/location/near?geocode=' + locationConfig.mainCity.lat + ',' + locationConfig.mainCity.lon + '&product=observation&format=json&apiKey=' + api_key, function(data) {
    surrCityList.lons = data.location.longitude
    surrCityList.lats = data.location.latitude
    surrCityList.amount = data.location.stationName.length
    for (var i = 0; i < surrCityList.amount; i++) {
      indivSurrCity(i, data.location.stationName[i]);
    }
    setTimeout(() => {
      locationConfig.eightCities.citiesAmount = locationConfig.eightCities.cities.length
      if (locationConfig.eightCities.citiesAmount > 8) {
        locationConfig.eightCities.citiesAmount = 8
      }
    }, 1000);
  })
  setTimeout(() =>{
    //sort
    locationConfig.eightCities.cities.sort((a, b) =>{return a.displayname.localeCompare(b.displayname)});
  },1200);
}

function manualSurroundingLocs() {
  for (var i = 0; i < locationSettings.eightCities.cities.length; i++) {
    if (locationSettings.eightCities.cities[i].type != undefined && locationSettings.eightCities.cities[i].type != "") {
      manualIndivCities(i)
    }
  }
  locationConfig.eightCities.citiesAmount =  locationConfig.eightCities.cities.length
  if (locationConfig.eightCities.citiesAmount > 8) {
    locationConfig.eightCities.citiesAmount = 8
  }
}

function manualIndivCities(i) {
  var cityData = {displayname:"",lat:"",lon:"",state:"",stateFull:""}
    $.getJSON("https://api.weather.com/v3/location/point?" + locationSettings.eightCities.cities[i].type + "=" + locationSettings.eightCities.cities[i].val + "&language=en-US&format=json&apiKey=" + api_key, function(data) {
      cityData.displayname = ((locationSettings.eightCities.cities[i].displayname != "") ? locationSettings.eightCities.cities[i].displayname : data.location.displayName)
      cityData.lat = data.location.latitude
      cityData.lon = data.location.longitude
      cityData.state = data.location.adminDistrictCode
      cityData.stateFull = data.location.adminDistrict
    }).fail(function(){
      cityData.displayname = locationSettings.eightCities.cities[i].displayname
    })
    locationConfig.eightCities.cities.push(cityData)
}

function indivSurrCity(i, name) {
  var duploc = false
  var cityData = {displayname:"",stationname:"",lat:"",lon:"",state:"",stateFull:""}
  $.getJSON("https://api.weather.com/v3/location/point?geocode=" + surrCityList.lats[i] + "," + surrCityList.lons[i] + "&language=en-US&format=json&apiKey=" + api_key, function(data) {
    cityData.displayname = data.location.displayName //
    cityData.stationname = formatStationName(name);
    cityData.lat = data.location.latitude
    cityData.lon = data.location.longitude
    cityData.state = data.location.adminDistrictCode
    cityData.stateFull = data.location.adminDistrict
  }).fail(function() {
    cityData.displayname = ""
    cityData.stationname = ""
    cityData.lat = ""
    cityData.lon = ""
    cityData.state = ""
    cityData.stateFull = ""
  })
  setTimeout(() => {
    if (cityData.displayname != locationConfig.mainCity.displayname) {
      locationConfig.eightCities.cities.push(cityData)
    }
    for (var ii = 0; ii < locationConfig.eightCities.cities.length-1; ii++) {
      if (cityData.displayname == locationConfig.eightCities.cities[ii].displayname) {
        locationConfig.eightCities.cities.pop()
        continue
      }
    }
  }, 500);
}
locationGrab()
}
locationJS()
//Probably the only file I didn't create myself. Made by JiJoe/TheGoldDiamond9