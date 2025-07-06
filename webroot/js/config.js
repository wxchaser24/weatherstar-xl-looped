var api_key = 'e1f10a1e78da46f5b10a1e78da96f525';
var map_key = 'YOUR-API-KEY';

var appearanceSettings = {
    marqueeAd: [
        "If you are interested in TWC, EAS, or anything weather/tech related, visit mistwx.com/discord right now!",
        "Also check out other sims on weatherstar.dev, your place for Local on the 8s simulations!"
    ],
    aspectRatio: 3/2, //May be functional in a future update. Default is 4/3, but for a more realistic experience use 3/2 as an aspect ratio.
    iconSet: "2005", //I highly recommend you do not change this value unless you are more experienced. If you do, the sim will look for a file called icons(value)sprite.png.
    ldlType: '', //what you want to see on ldl. 'observations' = only observations / 'crawl' = only local ad sales / 'both' = both but only will fit during the two minute flavor
    startupTime: 4000, //How long you want to wait for it to start up.
    graphicsPackage: ["v2","v3"][Math.round(Math.random())],
    version: "1.21"
}

var slideSettings = {
    slideDelay: 10000, //Set however long you want the slide to be on the screen for. Default is 10000.
    flavor: '',
    order: [
        {function:"currentConditions"},
        {function:"nearbyCities"},
        {function:"bulletin"},
        {function:"dopplerRadar"},
        {function:"almanac"},
        {function:"daypartForecast"},
        {function:"dayDesc"},
        {function:"weekAhead"},
    ]
}

var audioSettings = {
    enableMusic: true, //I understand if you want to play music from a different tab, but that's the only reason it should be false
    shuffle: true, //Self-explanatory. Default is true.
    randomStart: true, //Also should be self-explanatory. Default is true.
    narrations: true, //Also should be self-explanatory. Default is true.
    order: [
        "Track 1",
        "Track 2",
        "Track 3",
        "Track 4",
        "Track 5",
        "Track 6",
        "Track 7",
        "Track 8",
        "Track 9",
        "Track 10",
        "Track 11",
        "Track 12",
        "Track 13",
        "Track 14",
        "Track 15"
    ],
    offset: 0
    //The order of what songs you want. This feature is probably more 
    //old since the thing does not loop, and it will only choose one song. 
    //If you want your own specific song to play, add the file name to the array, 
    //and change the order to ["(file name)"] instead of adding it on.
}
  
