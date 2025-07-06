setTimeout(() => {
    $("#settings-menu .version").text(`Version ${appearanceSettings.version}`);
}, 10);
setTimeout(() => {
    $('.locdisplayname')
        .text(locationConfig.mainCity.displayname + (locationConfig.mainCity.state != null ? ", " + locationConfig.mainCity.state : (locationConfig.mainCity.stateFull != null ? ", " + locationConfig.mainCity.stateFull : '')));
    shrinkLocDisplayName();
}, 1500)

function startButton() {
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

        $("#styles").empty();
        $("#styles").append(`<link rel="stylesheet" href="wxstarxl43.css">`);
    } else if (asp == 3 / 2) {
        appearanceSettings.aspectRatio = 3 / 2;
        $('.asp.three-two-button').css("background-color", "#323741");
        $('.asp.three-two-button').css("color", "#ff0000");

        $('.asp.four-three-button').css("background-color", "");
        $('.asp.four-three-button').css("color", "");

        $("#styles").empty();
        $("#styles").append(`<link rel="stylesheet" href="wxstarxl32.css">`);
    }
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