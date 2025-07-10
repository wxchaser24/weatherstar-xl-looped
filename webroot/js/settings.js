setTimeout(() => {
    $("#settings-menu .version").text(`Version ${appearanceSettings.version}`);
    $("#styles").append(`<link rel="stylesheet" href="wxstarxl32${appearanceSettings.graphicsPackage}.css">`);
    setTimeout(() => {  
        $("#styles").children('link').first().remove();
    }, 10);
}, 10);
setTimeout(() => {
    $('.locdisplayname')
        .text(locationConfig.mainCity.displayname + (locationConfig.mainCity.state != null ? ", " + locationConfig.mainCity.state : (locationConfig.mainCity.stateFull != null ? ", " + locationConfig.mainCity.stateFull : '')));
    shrinkLocDisplayName();
}, 1500)

function startButton() {
    if(locationConfig.mainCity.displayname == undefined){
        $(".locwarning").fadeIn(0);
        $(".locdisplayname").css('color', '#fff');
        setTimeout(() => { $('.locwarning').fadeOut(1000); }, 2500)
        setTimeout(() => { $('.locdisplayname').css('color', ''); }, 3000)
        return;
    }
    if (appearanceSettings.ldlType == '' && slideSettings.flavor == '') {
        appearanceSettings.ldlType = 'both';
        slideSettings.flavor = 'M';
    } else if (appearanceSettings.ldlType == '' && slideSettings.flavor != 'M') {
        appearanceSettings.ldlType = 'observations';
    } else if (slideSettings.flavor == '') {
        slideSettings.flavor = 'M';
    }
    $('#settings-menu').fadeOut(0);
    $('#settings-menu-content').fadeOut(0);
    $('#main').fadeIn(0);
    startProgram();
}

function locSearch() {
    var locQuery = document.getElementById("loclookup").value;
    if (locQuery == "") {
        $(".locwarning").fadeIn(0);
        setTimeout(() => { $('.locwarning').fadeOut(1000); }, 2500)
        return;
    }
    queryname = locQuery;
    console.log(`Searching for ${locQuery}`);
    locationJS();
    setTimeout(() => {
        if (queryFail) {
            $('.locwarning').text("ERROR: Location search failed.");
            $('.locwarning').fadeIn(0);
            setTimeout(() => { $('.locwarning').fadeOut(1000); }, 2500);
            setTimeout(() => { $('.locwarning').text("ERROR: Put in a value."); }, 4000);
            return;
        }
        $('.locdisplayname')
            .text(locationConfig.mainCity.displayname + (locationConfig.mainCity.state != null ? ", " + locationConfig.mainCity.state : (locationConfig.mainCity.stateFull != null ? ", " + locationConfig.mainCity.stateFull : '')));
        shrinkLocDisplayName();
        $('.locsuccess').fadeIn(0);
        setTimeout(() => { $('.locsuccess').fadeOut(1000); }, 2500)
    }, 1500)
}

function shrinkLocDisplayName() {
    $('.locdisplayname').css('font-size', '30px');
    var ii = parseInt($('.locdisplayname').css('font-size'));
    while ($('.locdisplayname').height() > 39) {
        ii--;
        $('.locdisplayname').css('font-size', ii);
    }
}

//enter key will also work
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loclookup")
        .addEventListener('keydown', (event) => {
            if (event.key == "Enter") {
                event.preventDefault();
                locSearch();
                //i wanna make it look like it was pressed
                $('.locsearch').css({
                    'background-color': '#323741',
                    'color': '#fff'
                });
            }
        })
    document.getElementById("loclookup")
        .addEventListener('keyup', (event) => {
            if (event.key == "Enter") {
                $('.locsearch').css({
                    'background-color': '',
                    'color': ''
                });
            }
        })


    document.getElementById("songinput")
        .addEventListener('change', (event) => {
            if (event.target.value == "N") {
                audioSettings.order = [
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
                ]
            } else {
                audioSettings.order = [`Track ${parseInt(event.target.value)}`];
            }
            audioPlayer.buildPlaylist();
            //console.log($('#songinput').val('selectedvalue'));
        })

    document.getElementById("songoffset")
        .addEventListener('change', (event) => {
            audioSettings.offset = event.target.value;
            console.log(event.target.value);
        })

    document.getElementById("songuploadinput")
        .addEventListener('change', (event) => {
            if(event.target.files[0]){
                var file = event.target.files[0];
                audioSettings.order = [file.name];
                var url = URL.createObjectURL(file);
                audioPlayer.playlist = [url];
            } else {
                audioSettings.order = [
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
                ]
                audioPlayer.buildPlaylist();
            }
        })
})

function setAspectRatio(asp) {
    if (asp == 4 / 3) {
        appearanceSettings.aspectRatio = 4 / 3;
        $('.asp.four-three-button').css("background-color", "#323741");
        $('.asp.four-three-button').css("color", "#ff0000");
        $('.asp.three-two-button').css("background-color", "");
        $('.asp.three-two-button').css("color", "");

        $("#styles").append(`<link rel="stylesheet" href="wxstarxl43${appearanceSettings.graphicsPackage}.css">`);
        setTimeout(() => {  
            $("#styles").children('link').first().remove();
        }, 10);
    } else if (asp == 3 / 2) {
        appearanceSettings.aspectRatio = 3 / 2;
        $('.asp.three-two-button').css("background-color", "#323741");
        $('.asp.three-two-button').css("color", "#ff0000");

        $('.asp.four-three-button').css("background-color", "");
        $('.asp.four-three-button').css("color", "");

        $("#styles").append(`<link rel="stylesheet" href="wxstarxl32${appearanceSettings.graphicsPackage}.css">`);
        setTimeout(() => {  
            $("#styles").children('link').first().remove();
        }, 10);
    }
}

function checkFlavorEnabled(flavor) {
    // All flavors are now enabled in loop mode, but 60-second has LDL restrictions
    setFlavor(flavor);
}

function setFlavor(flavor) {
    switch (flavor) {
        case 'd':
            ldlBothCheck();
            slideSettings.flavor = 'D';
            slideSettings.order = [
                { function: 'currentConditions' },
                { function: "bulletin" },
                { function: 'dayDesc' },
                { function: 'weekAhead' },
                { function: 'dopplerRadar' }
            ]
            $('.flv.onemin-button').css("background-color", "#323741");
            $('.flv.onemin-button').css("color", "#ff0000");
            $('.flv.ninetysec-button').css("background-color", "");
            $('.flv.ninetysec-button').css("color", "");
            $('.flv.twomin-button').css("background-color", "");
            $('.flv.twomin-button').css("color", "");
            
            // Handle LDL restrictions for 60-second in loop mode
            if (loopMode) {
                manageLDLRestrictions();
            }
            break;
        case 'k':
            ldlBothCheck();
            slideSettings.flavor = 'K';
            slideSettings.order = [
                { function: 'currentConditions' },
                { function: 'nearbyCities' },
                { function: "bulletin" },
                { function: 'dopplerRadar' },
                { function: 'dayDesc' },
                { function: 'weekAhead' }
            ]
            $('.flv.onemin-button').css("background-color", "");
            $('.flv.onemin-button').css("color", "");
            $('.flv.ninetysec-button').css("background-color", "#323741");
            $('.flv.ninetysec-button').css("color", "#ff0000");
            $('.flv.twomin-button').css("background-color", "");
            $('.flv.twomin-button').css("color", "");
            
            // Remove LDL restrictions when switching away from 60-second
            if (loopMode) {
                manageLDLRestrictions();
            }
            break;
        case 'm':
            slideSettings.flavor = 'M';
            slideSettings.order = [
                { function: "currentConditions" },
                { function: "nearbyCities" },
                { function: "bulletin" },
                { function: "dopplerRadar" },
                { function: "almanac" },
                { function: "daypartForecast" },
                { function: "dayDesc" },
                { function: "weekAhead" },
            ]
            $('.flv.onemin-button').css("background-color", "");
            $('.flv.onemin-button').css("color", "");
            $('.flv.ninetysec-button').css("background-color", "");
            $('.flv.ninetysec-button').css("color", "");
            $('.flv.twomin-button').css("background-color", "#323741");
            $('.flv.twomin-button').css("color", "#ff0000");
            
            // Remove LDL restrictions when switching away from 60-second
            if (loopMode) {
                manageLDLRestrictions();
            }
            break;
        default:
            console.log("How did you get here bro?");
            break;
    }
}

function ldlBothCheck() {
    if (appearanceSettings.ldlType != 'both') return;
    appearanceSettings.ldlType = 'observations';
    $('.ldlbut.obs-button').css("background-color", "#323741");
    $('.ldlbut.obs-button').css("color", "#ff0000");
    $('.ldlbut.crawl-button').css("background-color", "");
    $('.ldlbut.crawl-button').css("color", "");
    $('.ldlbut.both-button').css("background-color", "");
    $('.ldlbut.both-button').css("color", "");
    $('.ldlwarning').fadeIn(0);
    setTimeout(() => { $('.ldlwarning').fadeOut(1000); }, 2500);
}

function setLDLType(type) {
    switch (type) {
        case 'observations':
            // Check if 60-second flavor + loop mode is active
            if (loopMode && slideSettings.flavor === 'D') {
                // Show warning and don't change the setting
                $('.ldl-warning-60sec').fadeIn(0);
                setTimeout(() => { $('.ldl-warning-60sec').fadeOut(1000); }, 2500);
                return;
            }
            appearanceSettings.ldlType = 'observations';
            $('.ldlbut.obs-button').css("background-color", "#323741");
            $('.ldlbut.obs-button').css("color", "#ff0000");
            $('.ldlbut.crawl-button').css("background-color", "");
            $('.ldlbut.crawl-button').css("color", "");
            $('.ldlbut.both-button').css("background-color", "");
            $('.ldlbut.both-button').css("color", "");
            break;
        case 'crawl':
            appearanceSettings.ldlType = 'crawl';
            $('.ldlbut.obs-button').css("background-color", "");
            $('.ldlbut.obs-button').css("color", "");
            $('.ldlbut.crawl-button').css("background-color", "#323741");
            $('.ldlbut.crawl-button').css("color", "#ff0000");
            $('.ldlbut.both-button').css("background-color", "");
            $('.ldlbut.both-button').css("color", "");
            break;
        case 'both':
            if (slideSettings.flavor != 'M' && slideSettings.flavor != '') {
                $('.ldlwarning').fadeIn(0);
                setTimeout(() => { $('.ldlwarning').fadeOut(1000); }, 2500);
                return;
            }
            appearanceSettings.ldlType = 'both';
            $('.ldlbut.obs-button').css("background-color", "");
            $('.ldlbut.obs-button').css("color", "");
            $('.ldlbut.crawl-button').css("background-color", "");
            $('.ldlbut.crawl-button').css("color", "");
            $('.ldlbut.both-button').css("background-color", "#323741");
            $('.ldlbut.both-button').css("color", "#ff0000");
            break;

        default:
            console.log("How did you get here bro?");
            break;
    }
}

function songSettings(fade) {
    if (fade == "in") {
        $("#settings-menu-content").fadeOut(500);
        setTimeout(() => {
            $("#song-settings").fadeIn(500);
        }, 500);
    }
    if (fade == "out") {
        $("#song-settings").fadeOut(500);
        setTimeout(() => {
            $("#settings-menu-content").fadeIn(500);
        }, 500);
    }
}

function versionSettings(fade, version){
    if(fade == "in"){
        $("#settings-menu-content").fadeOut(500);
        setTimeout(() => {
            $("#version-settings").fadeIn(500);
        }, 500);
    }
    if (fade == "out") {
        $("#version-settings").fadeOut(500);
        setTimeout(() => {
            $("#settings-menu-content").fadeIn(500);
        }, 500);
    }
    if(version == "vv"){return;}

    if(version == "v1"){
        $(".versionwarning").fadeIn(0);
        setTimeout(() => {
            $(".versionwarning").fadeOut(500);
        }, 4000);
        return;
    }
    if(appearanceSettings.aspectRatio == 3/2){
        $("#styles").append(`<link rel="stylesheet" href="wxstarxl32${version}.css">`);
        setTimeout(() => {  
            $("#styles").children('link').first().remove();
        }, 10);
    } else if(appearanceSettings.aspectRatio == 4/3){
        $("#styles").append(`<link rel="stylesheet" href="wxstarxl43${version}.css">`);
        setTimeout(() => {  
            $("#styles").children('link').first().remove();
        }, 10);
    }
    appearanceSettings.graphicsPackage = version;
}

// Global variable to track loop mode
var loopMode = false;

function manageLDLRestrictions() {
    if (loopMode && slideSettings.flavor === 'D') {
        // 60-second flavor in loop mode: force crawl mode if observations is currently selected
        if (appearanceSettings.ldlType === 'observations') {
            setLDLType('crawl');
        }
        
        // Show warning message with popup animation (same as other warnings)
        $('.ldl-warning-60sec').fadeIn(0);
        setTimeout(() => { $('.ldl-warning-60sec').fadeOut(1000); }, 2500);
    }
    // Note: We don't disable the button anymore - it will be handled in setLDLType
}

function toggleLoop() {
    loopMode = !loopMode;
    
    if (loopMode) {
        // Switch to looped versions
        $('.loop-button').css("background-color", "#323741");
        $('.loop-button').css("color", "#ff0000");
        $('.loop-button').text("Disable Loop");
        
        // All flavors are now enabled in loop mode
        // Check if 60-second flavor is active and manage LDL restrictions
        manageLDLRestrictions();
        
        // Remove current scripts
        $('script[src="js/slides.js"]').remove();
        $('script[src="js/ldl.js"]').remove();
        
        // Load looped versions
        $('<script>').attr('src', 'js/slides_looped.js').appendTo('head');
        $('<script>').attr('src', 'js/ldl_looped.js').appendTo('head');
        
        console.log("Switched to looped mode");
    } else {
        // Switch to original versions
        $('.loop-button').css("background-color", "");
        $('.loop-button').css("color", "");
        $('.loop-button').text("Enable Loop");
        
        // No need to remove restrictions since button was never disabled
        
        // Reset styling based on current flavor
        updateFlavorButtonStyling();
        
        // Remove looped scripts
        $('script[src="js/slides_looped.js"]').remove();
        $('script[src="js/ldl_looped.js"]').remove();
        
        // Load original versions
        $('<script>').attr('src', 'js/slides.js').appendTo('head');
        $('<script>').attr('src', 'js/ldl.js').appendTo('head');
        
        console.log("Switched to original mode");
    }
}

function updateFlavorButtonStyling() {
    // Reset all flavor buttons to default styling
    $('.flv.onemin-button').css("background-color", "");
    $('.flv.onemin-button').css("color", "");
    $('.flv.ninetysec-button').css("background-color", "");
    $('.flv.ninetysec-button').css("color", "");
    $('.flv.twomin-button').css("background-color", "");
    $('.flv.twomin-button').css("color", "");
    
    // Apply active styling based on current flavor
    switch (slideSettings.flavor) {
        case 'D':
            $('.flv.onemin-button').css("background-color", "#323741");
            $('.flv.onemin-button').css("color", "#ff0000");
            break;
        case 'K':
            $('.flv.ninetysec-button').css("background-color", "#323741");
            $('.flv.ninetysec-button').css("color", "#ff0000");
            break;
        case 'M':
            $('.flv.twomin-button').css("background-color", "#323741");
            $('.flv.twomin-button').css("color", "#ff0000");
            break;
    }
}