//wanted to make my own slides class but I think Joe's syntax for slides were better
var slideDivs = {
    "currentConditions": ".current-conditions",
    "nearbyCities": ".eight-cities",
    "dayDesc": ".local-forecast",
    "weekAhead": ".week-ahead",
    "dopplerRadar": ".radar",
    "daypartForecast": ".daypart-forecast",
    "almanac": ".almanac",
    "bulletin": ".bulletin"
}

//to be used later
var slideHeaders = {
    "currentConditions": "*city*",
    "nearbyCities": "",
    "dayDesc": "*city* *ending*",
    "weekAhead": "*city* *ending*"
}

var currentProgram;
var currentDiv;
var animationDelay = appearanceSettings.graphicsPackage == "v3" ? 900 : 1000;

// Global variables to track time changes for forecast updates
var lastUpdateTime = null;
var lastUpdateHour = null;

// Function to monitor alert status and manage bulletin crawl
function monitorAlertStatus() {
    setInterval(() => {
        // Check real-time alert data from API
        $.getJSON(`https://api.weather.com/v3/alerts/headlines?geocode=${locationConfig.mainCity.lat},${locationConfig.mainCity.lon}&format=json&language=en-US&apiKey=${api_key}`, function(data){
            var alertActive = false;
            var activeAlert = null;
            var currentAlertKey = weatherInfo.bulletin.crawlAlert.alert ? weatherInfo.bulletin.crawlAlert.alert.detailKey : null;
            
            if(data && data.alerts) {
                // First check if current alert is still active
                var currentAlertStillActive = false;
                if(currentAlertKey) {
                for(var i = 0; i < data.alerts.length; i++){
                        if(data.alerts[i].detailKey === currentAlertKey) {
                            // Verify alert hasn't expired
                            var expirationTime = new Date(data.alerts[i].expireTimeLocal);
                            if(expirationTime > new Date()) {
                                currentAlertStillActive = true;
                        break;
                            }
                        }
                    }
                }
                
                // If we have alerts, find the highest priority unexpired one
                if(data.alerts.length > 0) {
                    var highestPriorityAlert = null;
                    var highestPriority = -1;
                    
                    for(var i = 0; i < data.alerts.length; i++){
                        var expirationTime = new Date(data.alerts[i].expireTimeLocal);
                        if(expirationTime > new Date()) {
                            // Determine priority (W=4, S=3, Y=2, A=1)
                            var priority;
                            if (data.alerts[i].significance === "W") {
                                priority = 4;
                            } else if (data.alerts[i].significance === "S") {
                                priority = 3; // Special Weather Statement gets higher priority than Y
                            } else if (data.alerts[i].significance === "Y") {
                                priority = 2;
                            } else if (data.alerts[i].significance === "A") {
                                priority = 1;
                            } else {
                                priority = 0;
                            }
                            
                            // Update highest priority alert if this one is higher
                            if(priority > highestPriority) {
                                highestPriority = priority;
                                highestPriorityAlert = data.alerts[i];
                            }
                        }
                    }
                    
                    // If we found a valid alert
                    if(highestPriorityAlert) {
                        alertActive = true;
                        // Only switch to new alert if it's higher priority or current alert is no longer active
                        if(!currentAlertStillActive || 
                           (currentAlertKey !== highestPriorityAlert.detailKey && 
                            highestPriority > (weatherInfo.bulletin.crawlAlert.alert.significance === "W" ? 4 : 
                                             weatherInfo.bulletin.crawlAlert.alert.significance === "S" ? 3 :
                                             weatherInfo.bulletin.crawlAlert.alert.significance === "Y" ? 2 : 
                                             weatherInfo.bulletin.crawlAlert.alert.significance === "A" ? 1 : 0))) {
                            activeAlert = highestPriorityAlert;
                        }
                    }
                }
            }
            
            function restoreLDL() {
                // Common function to restore LDL state consistently
                weatherInfo.bulletin.crawlAlert.enabled = false;
                warningCrawlEnabled = false;
                
                // First clean up warning crawl
                $('.ldl .warning-crawl').fadeOut(0);
                $('.ldl .warning-crawl .marquee').marquee('destroy');
                
                // Reset all LDL elements to initial state
                $('.ldl .upper-text').fadeOut(0);
                $('.ldl .lower-text').fadeOut(0);
                $('.ldl .lower-text.left .label').fadeOut(0);
                $('.ldl .lower-text.left .cond').fadeOut(0);
                $('.ldl .lower-text.left .cc').fadeOut(0);
                $('.ldl .lower-text.right').fadeOut(0);
                $('.ldl .lower-text.right .label').fadeOut(0);
                $('.ldl .lower-text.right .cond').fadeOut(0);
                $('.ldl .crawl').marquee('destroy');
                $('.ldl .crawl').text("");
                $('.ldl .lower-text.left .cond').css('padding-left', '');
                
                // Show LDL container and start new cycle
                $('.ldl').fadeIn(0);
                
                // Clear any existing intervals
                if (warningCrawlCheckInterval) {
                    clearInterval(warningCrawlCheckInterval);
                    warningCrawlCheckInterval = null;
                }
                clearInterval(ldlInterval);
                
                // Start fresh LDL cycle
                ldlIdx = 0;
                displayLDL(0);
            }
            
            if (!alertActive && warningCrawlEnabled) {
                // Alerts have expired - restore LDL
                restoreLDL();
            } else if (alertActive && activeAlert && (!warningCrawlEnabled || currentAlertKey !== activeAlert.detailKey)) {
                // New alert has become active or higher priority alert available - fetch details and show warning crawl
                weatherInfo.bulletin.crawlAlert.enabled = true;
                
                // Fetch detailed alert information
                $.getJSON('https://api.weather.com/v3/alerts/detail?alertId=' + activeAlert.detailKey + '&format=json&language=en-US&apiKey=' + api_key, function(alertData) {
                    var alert = {
                        name: alertData.alertDetail.eventDescription,
                        code: alertData.alertDetail.productIdentifier,
                        type: alertData.alertDetail.messageType,
                        significance: alertData.alertDetail.significance,
                        description: alertData.alertDetail.texts[0].description,
                        severe: getCrawlSeverity(alertData.alertDetail.productIdentifier),
                        detailKey: activeAlert.detailKey,
                        expireTimeLocal: activeAlert.expireTimeLocal
                    }
                    weatherInfo.bulletin.crawlAlert.alert = alert;
                    
                    clearInterval(ldlInterval);
                    $('.ldl .upper-text').fadeOut(0);
                    $('.ldl .lower-text').fadeOut(0);
                    $('.ldl .crawl').marquee('destroy');
                    displayLDL(0); // This will activate the warning crawl
                });
            }
        }).fail(function(){
            // If API call fails and we have a warning crawl active, assume it has expired
            if (warningCrawlEnabled) {
                restoreLDL();
            }
        });
    }, 1000); // Check every second for more responsive expiration
}

// Function to monitor time changes and update forecast data when needed
function monitorTimeChanges() {
    setInterval(() => {
        updateForecastDataIfNeeded();
    }, 60000); // Check every minute for time changes
}

// Function to monitor and maintain audio player health
function monitorAudioHealth() {
    setInterval(() => {
        checkAndRecoverAudio();
    }, 60000); // Check every minute
}

// Function to recreate audio system while preserving music state
function recreateAudioSystem(force = false) {
    try {
        // Store current music state
        var musicWasPlaying = false;
        var musicVolume = 0.8;
        var currentTrack = null;
        
        if (window.audioPlayer && window.audioPlayer.$players) {
            const musicPlayers = window.audioPlayer.$players.find('.music');
            if (musicPlayers.length > 0) {
                musicPlayers.each(function() {
                    var playerData = $(this).data('jPlayer');
                    if (playerData && !playerData.status.paused) {
                        musicWasPlaying = true;
                        musicVolume = playerData.options.volume;
                        currentTrack = playerData.status.src;
                    }
                });
            }
        }

        // Clean up existing audio system
        if (window.audioPlayer) {
            window.audioPlayer.$players.find('.jplayer').each(function() {
                try {
                    $(this).jPlayer('destroy');
                } catch (e) {
                    console.warn("Error destroying player:", e);
                }
            });
            window.audioPlayer.$players.remove();
        }

        // Create new audio system
        window.audioPlayer = new AudioManager();
        
        // Restore music if it was playing
        if (musicWasPlaying && audioSettings.enableMusic) {
            setTimeout(() => {
                if (window.audioPlayer.playlist && window.audioPlayer.playlist.length > 0) {
                    window.audioPlayer.startPlaying(window.audioPlayer.playlist, true);
                    // Restore volume after a short delay
                    setTimeout(() => {
                        window.audioPlayer.$players.find('.music').jPlayer('volume', musicVolume);
                    }, 500);
                }
            }, 1000);
        }
        
        console.log("Audio system recreated successfully");
        return true;
    } catch (error) {
        console.error("Failed to recreate audio system:", error);
        return false;
    }
}

// Check audio player health and recover if needed
function checkAndRecoverAudio() {
    try {
        // Check if audioPlayer exists and has required methods
        if (!audioPlayer || typeof audioPlayer.playCC !== 'function') {
            console.log("Audio player missing or corrupted, recreating...");
            window.audioPlayer = new AudioManager();
            return;
        }
        
        // Check if jPlayer elements exist and are functional
        const musicPlayers = $('#players .music');
        const voicePlayers = $('#players .voice');
        
        // Clean up any orphaned or stuck players
        if (musicPlayers.length > 2) {
            console.log("Cleaning up excess music players...");
            musicPlayers.slice(2).each(function() {
                $(this).jPlayer('destroy').remove();
            });
        }
        
        if (voicePlayers.length > 2) {
            console.log("Cleaning up excess voice players...");
            voicePlayers.slice(2).each(function() {
                $(this).jPlayer('destroy').remove();
            });
        }
        
        // Test audio context and try to recover if suspended
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new audioCtx();
            if (ctx.state === 'suspended') {
                console.log("Audio context suspended, attempting to resume...");
                ctx.resume().then(() => {
                    console.log("Audio context resumed successfully");
                }).catch((err) => {
                    console.log("Failed to resume audio context:", err);
                });
            }
        }
        
        // Ensure audio settings are still intact
        if (!audioSettings || !audioSettings.narrations) {
            console.log("Audio settings corrupted, reinitializing...");
            // Restore default audio settings if they get corrupted
            window.audioSettings = {
                enableMusic: true,
                shuffle: true,
                randomStart: true,
                narrations: true,
                order: ["Track 1", "Track 2", "Track 3", "Track 4", "Track 5", "Track 6", "Track 7", "Track 8", "Track 9", "Track 10", "Track 11", "Track 12", "Track 13", "Track 14", "Track 15"],
                offset: 0
            };
        }
        
        // Test if audio elements are still responsive
        try {
            const testPlayer = $('#players .voice').first();
            if (testPlayer.length > 0) {
                // Check if jPlayer is still bound and functional
                const data = testPlayer.data('jPlayer');
                if (!data || typeof testPlayer.jPlayer !== 'function') {
                    console.log("jPlayer elements corrupted, recreating audio player...");
                    window.audioPlayer = new AudioManager();
                }
            }
        } catch (testError) {
            console.log("Audio element test failed, recreating player:", testError);
            window.audioPlayer = new AudioManager();
        }
        
    } catch (error) {
        console.error("Error in audio health check:", error);
        // Force recreation of audio player on critical errors
        try {
            window.audioPlayer = new AudioManager();
        } catch (recreateError) {
            console.error("Failed to recreate audio player:", recreateError);
        }
    }
}

// Enhanced audio playback with verification
function playAudioSafely(type, vocalLocal = false) {
    const maxRetries = 3;
    let retryCount = 0;
    
    function attemptPlay() {
        try {
            if (!audioPlayer) {
                throw new Error("Audio player not available");
            }
            
            // Set up verification timeout
            const verificationTimeout = setTimeout(() => {
                console.log("Audio playback verification failed");
                if (retryCount < maxRetries) {
                    console.log(`Retrying audio playback...`);
                    retryCount++;
                    attemptPlay();
                } else {
                    console.error(`Audio playback failed after ${maxRetries} attempts for: ${type}`);
                    recreateAudioSystem(true);
                }
            }, 2000);
            
            // Attempt playback
            switch(type) {
                case 'cc':
                    audioPlayer.playCC(vocalLocal);
                    break;
                case 'lf':
                    audioPlayer.playLF();
                    break;
                case 'ef':
                    audioPlayer.playEF();
                    break;
                default:
                    console.warn("Unknown audio type:", type);
                    clearTimeout(verificationTimeout);
                    return;
            }
            
            // Monitor for actual playback
            const checkPlayback = setInterval(() => {
                const activePlayers = audioPlayer.$players.find('.voice');
                let isPlaying = false;
                
                activePlayers.each(function() {
                    const playerData = $(this).data('jPlayer');
                    if (playerData && !playerData.status.paused && playerData.status.currentTime > 0) {
                        isPlaying = true;
                        clearTimeout(verificationTimeout);
                        clearInterval(checkPlayback);
                    }
                });
            }, 100);
            
            // Clear check after 3 seconds
            setTimeout(() => {
                clearInterval(checkPlayback);
            }, 3000);
            
        } catch (error) {
            console.error(`Audio playback failed (attempt ${retryCount + 1}):`, error);
            retryCount++;
            
            if (retryCount < maxRetries) {
                console.log(`Retrying audio playback in 1 second...`);
                setTimeout(attemptPlay, 1000);
            } else {
                console.error(`Audio playback failed after ${maxRetries} attempts for: ${type}`);
                recreateAudioSystem(true);
            }
        }
    }
    
    attemptPlay();
}

// Check if forecast data needs updating due to time change
function updateForecastDataIfNeeded() {
    const currentHour = new Date().getHours();
    const currentTime = Date.now();
    
    // Initialize on first run
    if (!lastUpdateTime) {
        lastUpdateTime = currentTime;
        lastUpdateHour = currentHour;
        return;
    }
    
    // Check if we've crossed 3 AM or 3 PM boundary
    if ((lastUpdateHour < 3 && currentHour >= 3) || 
        (lastUpdateHour < 15 && currentHour >= 15) || 
        (lastUpdateHour >= 15 && currentHour < 15 && currentTime - lastUpdateTime > 8 * 60 * 60 * 1000)) {
        
        console.log("Time boundary crossed at", new Date().toLocaleTimeString());
        
        lastUpdateTime = currentTime;
        lastUpdateHour = currentHour;
    }
}

function slideKickOff() {
    idx = 0;
    nidx = 1;
    // Preload first two slides on startup
    preloadNextSlide(slideSettings.order[idx].function);
    preloadNextSlide(slideSettings.order[nidx].function);
    showSlides();
    displayLDL(0);
    monitorAlertStatus(); // Start monitoring alert status changes
    monitorTimeChanges(); // Start monitoring time changes for forecast updates
    monitorAudioHealth(); // Start monitoring audio player health
}//end of slideKickOff() function

// Function to get background URL for a slide type
function getSlideBackground(slideType, dayName = null) {
    const backgrounds = {
        currentConditions: `images/${appearanceSettings.graphicsPackage}/xlcc.png`,
        nearbyCities: `images/${appearanceSettings.graphicsPackage}/xlcclo.png`,
        dayDesc: `images/${appearanceSettings.graphicsPackage}/xl36h.png`,
        weekAhead: `images/${appearanceSettings.graphicsPackage}/xlext7.png`,
        dopplerRadar: `images/${appearanceSettings.graphicsPackage}/us_radar_top.png`,
        bulletin: `images/${appearanceSettings.graphicsPackage}/xlalert.png`,
        almanac: `images/${appearanceSettings.graphicsPackage}/xlalm.png`,
        daypartForecast: `images/${appearanceSettings.graphicsPackage}/dpf_${dayName?.toLowerCase() || 'today'}.png`
    };
    return backgrounds[slideType];
}

// Keep track of preloaded images
window.preloadedImages = {};

// Function to get the next slide type based on current slide and flavor
function getNextSlideType(currentSlideType) {
    // Get the current slide index
    const currentIndex = slideSettings.order.findIndex(slide => slide.function === currentSlideType);
    if (currentIndex === -1) return null;
    
    // Get the next slide index, wrapping around to 0 if at the end
    const nextIndex = (currentIndex + 1) >= slideSettings.order.length ? 0 : (currentIndex + 1);
    
    return slideSettings.order[nextIndex].function;
}

// Function to preload the next slide's background
function preloadNextSlide(slideType) {
    // Get the background URL for this slide type
    let bgUrl = getSlideBackground(slideType);
    if (!bgUrl) return;

    // Add cache buster
    bgUrl = bgUrl + '?' + Date.now();

    // Create new image object
    const img = new Image();
    img.onload = () => {
        // Store the loaded image with timestamp
        window.preloadedImages[slideType] = {
            image: img,
            timestamp: Date.now()
        };
    };
    img.onerror = (error) => {
        console.error(`Failed to preload image for ${slideType}:`, error);
    };
    img.src = bgUrl;

    // If it's daypart forecast, preload all variants
    if (slideType === 'daypartForecast') {
        ['today', 'tonight', 'tomorrow'].forEach(variant => {
            const variantBg = getSlideBackground(slideType, variant) + '?' + Date.now();
            const variantImg = new Image();
            variantImg.onload = () => {
                window.preloadedImages[`${slideType}_${variant}`] = {
                    image: variantImg,
                    timestamp: Date.now()
                };
            };
            variantImg.src = variantBg;
        });
    }
    
    // Also preload the next slide's background based on the current flavor
    const nextSlideType = getNextSlideType(slideType);
    if (nextSlideType && nextSlideType !== slideType) {
        let nextBgUrl = getSlideBackground(nextSlideType);
        if (nextBgUrl) {
            nextBgUrl = nextBgUrl + '?' + Date.now();
            const nextImg = new Image();
            nextImg.onload = () => {
                window.preloadedImages[nextSlideType] = {
                    image: nextImg,
                    timestamp: Date.now()
                };
            };
            nextImg.src = nextBgUrl;
            
            // If next slide is daypart forecast, preload its variants too
            if (nextSlideType === 'daypartForecast') {
                ['today', 'tonight', 'tomorrow'].forEach(variant => {
                    const variantBg = getSlideBackground(nextSlideType, variant) + '?' + Date.now();
                    const variantImg = new Image();
                    variantImg.onload = () => {
                        window.preloadedImages[`${nextSlideType}_${variant}`] = {
                            image: variantImg,
                            timestamp: Date.now()
                        };
                    };
                    variantImg.src = variantBg;
                });
            }
        }
    }
}

// Function to get preloaded image URL or fallback to direct URL
function getPreloadedBackground(slideType, dayName = null) {
    // Use the actual dayName for background image lookup
    const key = dayName ? `${slideType}_${dayName}` : slideType;
    const preloaded = window.preloadedImages[key];
    
    if (preloaded && preloaded.image && (Date.now() - preloaded.timestamp < 300000)) { // 5 minute cache
        return preloaded.image.src;
    }
    
    // If not preloaded or expired, return direct URL with cache buster
    return getSlideBackground(slideType, dayName) + '?' + Date.now();
}

function showSlides() {
    var slidePrograms = {
        currentConditions() {
            // Use preloaded image if available
            $(".current-conditions").css({
                "background-image": `url(${getPreloadedBackground('currentConditions')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            try {
                if (weatherInfo.currentConditions.noReport == true) {
                    throw new Error("Current conditions displays no report available");
                }
                audioPlayer.vocallocal = vocallocal(weatherInfo.currentConditions.temp, weatherInfo.currentConditions.icon)
                $('.current-conditions').fadeIn(0);
                // Hide elements for animation
                $('.current-conditions .city-name').fadeOut(0);
                $('.current-conditions .labels').fadeOut(0);
                $('.current-conditions .information').fadeOut(0);
                // Restore original labels HTML to prevent accumulation
                $('.current-conditions .labels').html(`
                    <span class="humidityy">Humidity</span><br>
                    <span class="pressuree">Pressure</span><br>
                    <span class="windd">Wind</span><br>
                    <span class="gustss">Gusts</span><br>
                    <span class="dewpointt">Dew Point</span><br>
                    <span class="ceilingg">Ceiling</span><br>
                    <span class="visibilityy">Visibility</span>
                `);
                if (weatherInfo.currentConditions.feelslike.type != null) {
                    $('.current-conditions .labels').append(`<br><span class="feelslikee">${weatherInfo.currentConditions.feelslike.type}</span>`);
                    $('.left-pane .feelslike').text(weatherInfo.currentConditions.feelslike.val + "°");
                } else {
                    // Clear feels like temperature when heat index/wind chill is not available
                    $('.left-pane .feelslike').text("");
                }
                $('.current-conditions .city-name').text(weatherInfo.currentConditions.cityname);
                $('.left-pane .humidity').text(weatherInfo.currentConditions.humidity);
                $('.left-pane .pressure').text(weatherInfo.currentConditions.pressure + " in");
                $('.left-pane .wind').text(weatherInfo.currentConditions.wind);
                $('.left-pane .gusts').text(weatherInfo.currentConditions.gusts);
                $('.left-pane .dewpoint').text(weatherInfo.currentConditions.dewpoint + "°")
                $('.left-pane .ceiling').text(weatherInfo.currentConditions.ceiling === "Unlimited" ? "Unlimited" : (weatherInfo.currentConditions.ceiling + " ft"));
                $('.left-pane .visibility').text(weatherInfo.currentConditions.visibility + " mi");
                $('.current-conditions .temp').text(weatherInfo.currentConditions.temp + "°");
                $('.current-conditions .cond').text(weatherInfo.currentConditions.cond.replace("/Wind", ", Windy"));
                getIcon($('.current-conditions .icon'), weatherInfo.currentConditions.icon, "current");
                setTimeout(() => { if (audioSettings.narrations) { playAudioSafely('cc', true) } }, 250)
                setTimeout(() => {
                    $('.current-conditions .city-name').fadeIn(0);
                    $('.current-conditions .labels').fadeIn(0);
                    $('.current-conditions .information').fadeIn(0);
                }, animationDelay);
                        setTimeout(() => {
                        $('.current-conditions').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay)
            } catch (error) {
                console.error(error);
                $('.current-conditions').fadeIn(0);
                $('.current-conditions .city-name').text(weatherInfo.currentConditions.cityname);
                setTimeout(() => { if (audioSettings.narrations) { playAudioSafely('cc', false) } }, 250)
                setTimeout(() => {
                    $('.current-conditions .city-name').fadeIn(0);
                    $('.current-conditions .labels').fadeIn(0);
                    $('.current-conditions .noreport').fadeIn(0);
                }, 900);
                        setTimeout(() => {
                        $('.current-conditions').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay)
            }
        },
        nearbyCities() {
            $(".eight-cities").css({
                "background-image": `url(${getPreloadedBackground('nearbyCities')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            try {
                if (weatherInfo.eightCities.noReport == true) {
                    throw new Error("Local observations do not have data");
                }
                if (weatherInfo.eightCities.cities.length == 0) {
                    slideCallBack();
                    return;
                }
                $('.eight-cities').fadeIn(0);
                // Hide elements for animation
                $('.eight-cities .information').fadeOut(0);
                $('.eight-cities .top').fadeOut(0);
                var eightSlideCount = 0;
                function eightCities() {
                    var eightSlideArray = ['i', 'ii', 'iii', 'iv'];
                    for (var i = 0; i < 4; i++) {
                        $(`.eight-cities .extra-loc.${eightSlideArray[i]} .city-name`).text("");
                        $(`.eight-cities .extra-loc.${eightSlideArray[i]} .temp`).text("");
                        $(`.eight-cities .extra-loc.${eightSlideArray[i]} .wind`).text("");
                        // Make sure icon is visible first
                        $(`.eight-cities .extra-loc.${eightSlideArray[i]} .icon`).fadeIn(0);
                        if (weatherInfo.eightCities.cities[i + eightSlideCount]) {
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .city-name`).text(weatherInfo.eightCities.cities[i + eightSlideCount].name.replaceAll("Township", "Twnshp"));
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .temp`).text(weatherInfo.eightCities.cities[i + eightSlideCount].temp + "°");
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .wind`).text(weatherInfo.eightCities.cities[i + eightSlideCount].wind);
                            getIcon($(`.eight-cities .extra-loc.${eightSlideArray[i]} .icon`), weatherInfo.eightCities.cities[i + eightSlideCount].icon, "current");
                        } else {
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .icon`).fadeOut(0);
                        }
                    }
                }
                eightCities();
                setTimeout(() => {
                    $('.eight-cities .information').fadeIn(0);
                    $('.eight-cities .top').fadeIn(0);
                }, animationDelay);
                if (weatherInfo.eightCities.cities.length > 4) {
                    setTimeout(() => {
                        eightSlideCount = 4;
                        eightCities();
                        setTimeout(() => {
                            // Start next slide early to prevent black flash between 8 Cities and Bulletin
                            if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'bulletin') {
                                slideCallBack();
                                    $('.eight-cities').fadeOut(0);
                            } else {
                                $('.eight-cities').fadeOut(0);
                                slideCallBack();
                            }
                        }, slideSettings.slideDelay);
                    }, slideSettings.slideDelay)
                } else {
                    setTimeout(() => {
                        // Start next slide early to prevent black flash between 8 Cities and Bulletin
                        if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'bulletin') {
                            slideCallBack();
                                $('.eight-cities').fadeOut(0);
                        } else {
                            $('.eight-cities').fadeOut(0);
                            slideCallBack();
                        }
                    }, slideSettings.slideDelay);
                }
            } catch (error) {
                console.error(error);
                if (weatherInfo.eightCities.cities.length == 0) {
                    slideCallBack();
                } else {
                    $('.eight-cities').fadeIn(0);
                    var eightSlideArray = ['i', 'ii', 'iii', 'iv'];
                    for (var i = 0; i < 4; i++) {
                        $(`.eight-cities .extra-loc.${eightSlideArray[i]} .city-name`).text("");
                        if (weatherInfo.eightCities.cities[i]) {
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .city-name`).text(weatherInfo.eightCities.cities[i].name);
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .noreport`).fadeIn(0);
                        } else {
                            $(`.eight-cities .extra-loc.${eightSlideArray[i]} .noreport`).fadeOut(0);
                        }
                    }
                    setTimeout(() => {
                        $('.eight-cities .information').fadeIn(0);
                        $('.eight-cities .top').fadeIn(0);
                    }, 900);
                    if (weatherInfo.eightCities.cities.length > 4) {
                        setTimeout(() => {
                            eightSlideCount = 4;
                            for (var i = 0; i < 4; i++) {
                                $(`.eight-cities .extra-loc.${eightSlideArray[i + 4]} .city-name`).text("");
                                if (weatherInfo.eightCities.cities[i + 4]) {
                                    $(`.eight-cities .extra-loc.${eightSlideArray[i]} .city-name`).text(weatherInfo.eightCities.cities[i + 4].name);
                                    $(`.eight-cities .extra-loc.${eightSlideArray[i]} .noreport`).fadeIn(0);
                                } else {
                                    $(`.eight-cities .extra-loc.${eightSlideArray[i]} .noreport`).fadeOut(0);
                                }
                            }
                            setTimeout(() => {
                                // Start next slide early to prevent black flash between 8 Cities and Bulletin
                                if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'bulletin') {
                                    slideCallBack();
                                        $('.eight-cities').fadeOut(0);
                                } else {
                                    $('.eight-cities').fadeOut(0);
                                    slideCallBack();
                                }
                            }, slideSettings.slideDelay);
                        }, slideSettings.slideDelay)
                    } else {
                        setTimeout(() => {
                            // Start next slide early to prevent black flash between 8 Cities and Bulletin
                            if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'bulletin') {
                                slideCallBack();
                                    $('.eight-cities').fadeOut(0);
                            } else {
                                $('.eight-cities').fadeOut(0);
                                slideCallBack();
                            }
                        }, slideSettings.slideDelay);
                    }
                }
            }
        },
        dayDesc() {
            $(".local-forecast").css({
                "background-image": `url(${getPreloadedBackground('dayDesc')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            try {
                if (weatherInfo.dayDesc.noReport == true) {
                    throw new Error("36hr forecast has no data");
                }
                
                $('.local-forecast').fadeIn(0);
                // Hide elements for animation
                $('.local-forecast .city-name').fadeOut(0);
                $('.local-forecast .slide .period').fadeOut(0);
                $('.local-forecast .slide .description').fadeOut(0);
                $('.local-forecast .city-name').text(locationConfig.mainCity.extraname);
                
                // Get tomorrow's name for proper day reference
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
                
                // Check if we're in the "Today, Tonight, Tomorrow" pattern
                const isNewPattern = weatherInfo.dayDesc.days[0].name === "Today";
                
                // Use period names from the forecast data
                $('.local-forecast .slide .period').text(weatherInfo.dayDesc.days[0].name);
                $('.local-forecast .slide .description').text(weatherInfo.dayDesc.days[0].desc);
                
                setTimeout(() => { if (audioSettings.narrations) { playAudioSafely('lf') } }, 500)
                setTimeout(() => {
                    $('.local-forecast .city-name').fadeIn(0);
                    $('.local-forecast .slide .period').fadeIn(0);
                    $('.local-forecast .slide .description').fadeIn(0);
                }, animationDelay)
                setTimeout(() => {
                    $('.local-forecast .slide .period').text(weatherInfo.dayDesc.days[1].name);
                    $('.local-forecast .slide .description').text(weatherInfo.dayDesc.days[1].desc);
                }, slideSettings.slideDelay);
                setTimeout(() => {
                    // If we're in the "Today, Tonight, Friday" pattern, use tomorrow's name
                    const periodName = isNewPattern ? tomorrowName : weatherInfo.dayDesc.days[2].name;
                    $('.local-forecast .slide .period').text(periodName);
                    $('.local-forecast .slide .description').text(weatherInfo.dayDesc.days[2].desc);
                }, slideSettings.slideDelay * 2);
                setTimeout(() => {
                    $('.local-forecast').fadeOut(0);
                    slideCallBack();
                }, slideSettings.slideDelay * 3);
            } catch (error) {
                console.error(error);
                $('.local-forecast').fadeIn(0);
                $('.local-forecast .city-name').text(locationConfig.mainCity.extraname);
                setTimeout(() => {
                    $('.local-forecast .noreport').fadeIn(0);
                    $('.local-forecast .city-name').fadeIn(0);
                }, 900)
                setTimeout(() => {
                    $('.local-forecast').fadeOut(0);
                    slideCallBack();
                }, slideSettings.slideDelay * 3);
            }
        },
        weekAhead() {
            $(".week-ahead").css({
                "background-image": `url(${getPreloadedBackground('weekAhead')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            try {
                if (weatherInfo.weekAhead.noReport == true) {
                    throw new Error("Week Ahead has no data");
                }
                $('.week-ahead').fadeIn(0);
                // Hide elements for animation
                $('.week-ahead .city-name').fadeOut(0);
                $('.week-ahead .information').fadeOut(0);
                $('.week-ahead .city-name').text(locationConfig.mainCity.extraname);

                var waDivs = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
                for (var i = 0; i < 7; i++) {
                    // Get day name directly from the data
                    var dayName = weatherInfo.weekAhead.days[i].name;
                    
                    // Check if it's a weekend day
                    if (dayName === "Sat" || dayName === "Sun") {
                        // Weekend styling: white background, blue text, no text shadow
                        $(`.week-ahead .day.${waDivs[i]} .weekend`).fadeIn(0);
                        $(`.week-ahead .day.${waDivs[i]} .name`).css("color", "#001cad");
                        $(`.week-ahead .day.${waDivs[i]} .name`).css("text-shadow", "0px 0px black");
                    } else {
                        // Weekday styling: no white background, normal text
                        $(`.week-ahead .day.${waDivs[i]} .weekend`).fadeOut(0);
                        $(`.week-ahead .day.${waDivs[i]} .name`).css("color", "");
                        $(`.week-ahead .day.${waDivs[i]} .name`).css("text-shadow", "");
                    }
                    
                    // Display the data
                    $(`.week-ahead .day.${waDivs[i]} .name`).text(dayName.toUpperCase());
                    $(`.week-ahead .day.${waDivs[i]} .cond`).text(weatherInfo.weekAhead.days[i].cond);
                    $(`.week-ahead .day.${waDivs[i]} .high`).text(weatherInfo.weekAhead.days[i].high + "°");
                    if(weatherInfo.weekAhead.days[i].low != null){
                    $(`.week-ahead .day.${waDivs[i]} .low`).text(weatherInfo.weekAhead.days[i].low + "°");
                    }
                    getIcon($(`.week-ahead .day.${waDivs[i]} .icon`), weatherInfo.weekAhead.days[i].icon, "forecast");
                }
                setTimeout(() => {
                    if (audioSettings.narrations) { playAudioSafely('ef') }
                    $('.week-ahead .city-name').fadeIn(0);
                    $('.week-ahead .information').fadeIn(0);
                }, 500)
                        setTimeout(() => {
                        $('.week-ahead').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay);
            } catch (error) {
                console.error(error);
                $('.week-ahead').fadeIn(0);
                $('.week-ahead .city-name').text(locationConfig.mainCity.extraname);
                setTimeout(() => {
                    if (audioSettings.narrations) { playAudioSafely('ef') }
                    $('.week-ahead .city-name').fadeIn(0);
                    $('.week-ahead .noreport').fadeIn(0);
                }, 500)
                        setTimeout(() => {
                        $('.week-ahead').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay);
            }
        },
        dopplerRadar() {
            $(".radar").css({
                "background-image": `url(${getPreloadedBackground('dopplerRadar')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            try {
                $('.radar').fadeIn(0);
                // Hide elements for animation
                $('.radar .banner').fadeOut(0);
                $('#locradar').fadeIn(0);
                $('#locmap').fadeIn(0);
                locmap.resize();
                
                // Only destroy and hide regular LDL if no alert crawl is active
                if (!weatherInfo.bulletin.crawlAlert.enabled) {
                $('.ldl .crawl').marquee('destroy');
                    pauseLDL(); // Pause LDL instead of clearing interval
                    $('.ldl').fadeOut(0);
                } else {
                    // Keep alert crawl visible and on top during radar
                    $('.ldl').css('z-index', '10');
                    $('.ldl .warning-crawl').css('z-index', '10');
                    $('.ldl').fadeIn(0);
                    $('.ldl .warning-crawl').fadeIn(0);
                }
                
                $('.radar .banner').fadeIn(0);

                startRadar(locradar);

                setTimeout(() => {
                    stopRadar();
                    // Start next slide early to prevent black flash between Radar and next slide
                    if (slideSettings.order[nidx] && (slideSettings.order[nidx].function === 'almanac' || slideSettings.order[nidx].function === 'currentConditions' || slideSettings.order[nidx].function === 'dayDesc')) {
                        slideCallBack();
                            $('#locradar').fadeOut(0);
                            $('#locmap').fadeOut(0);
                            $('.radar').fadeOut(0);
                            $('.radar .banner').fadeOut(0);
                        // Only show and resume LDL if no alert crawl is active
                        if (!weatherInfo.bulletin.crawlAlert.enabled) {
                                $('.ldl').fadeIn(0);
                                resumeLDL(); // Resume LDL from where it left off
                        } else {
                            // Keep alert crawl visible but reset z-index
                            $('.ldl').css('z-index', '8');
                            $('.ldl .warning-crawl').css('z-index', '');
                            $('.ldl').fadeIn(0);
                            $('.ldl .warning-crawl').fadeIn(0);
                        }
                    } else {
                        $('#locradar').fadeOut(0);
                        $('#locmap').fadeOut(0);
                        $('.radar').fadeOut(0);
                        $('.radar .banner').fadeOut(0);
                        slideCallBack();
                        // Only show and resume LDL if no alert crawl is active
                        if (!weatherInfo.bulletin.crawlAlert.enabled) {
                            $('.ldl').fadeIn(0);
                            resumeLDL(); // Resume LDL from where it left off
                        } else {
                            // Keep alert crawl visible but reset z-index
                            $('.ldl').css('z-index', '8');
                            $('.ldl .warning-crawl').css('z-index', '');
                            $('.ldl').fadeIn(0);
                            $('.ldl .warning-crawl').fadeIn(0);
                        }
                    }
                }, slideSettings.flavor == 'D' ? slideSettings.slideDelay : (slideSettings.slideDelay * 2));
            } catch (error) {
                console.error(error);
                $('.radar').fadeIn(0);
                $('#locmap').fadeIn(0);
            }
        },
        daypartForecast() {
            try {
                if (weatherInfo.daypartForecast.noReport == true) {
                    throw new Error("Daypart forecast has no data");
                }
                $('.daypart-forecast').css("background-image", 
                    `url(${getPreloadedBackground('daypartForecast', weatherInfo.daypartForecast.dayName)})`
                );
                // Preload next slide's background
                if (slideSettings.order[nidx]) {
                    preloadNextSlide(slideSettings.order[nidx].function);
                }
                $('.daypart-forecast').fadeIn(0);
                $('.daypart-forecast .city-name').text(locationConfig.mainCity.extraname);
                var barTemps = [
                    weatherInfo.daypartForecast.times[0].temp,
                    weatherInfo.daypartForecast.times[1].temp,
                    weatherInfo.daypartForecast.times[2].temp,
                    weatherInfo.daypartForecast.times[3].temp,
                ]
                var barMin = Math.min(...barTemps);
                var barMax = Math.max(...barTemps);
                var barRange = barMax - barMin;
                var barminHeight = 48;
                var dpDivs = ["i", "ii", "iii", "iv"]
                for (var i = 0; i < 4; i++) {
                    //the easy part
                    getIcon($(`.daypart-forecast .hour.${dpDivs[i]} .icon`), weatherInfo.daypartForecast.times[i].icon, "forecast");
                    $(`.daypart-forecast .hour.${dpDivs[i]} .name`).text(weatherInfo.daypartForecast.times[i].name);
                    $(`.daypart-forecast .hour.${dpDivs[i]} .cond`).text(weatherInfo.daypartForecast.times[i].cond);
                    $(`.daypart-forecast .hour.${dpDivs[i]} .temp`).text(weatherInfo.daypartForecast.times[i].temp + "°");
                    $(`.daypart-forecast .hour.${dpDivs[i]} .wind`).text(weatherInfo.daypartForecast.times[i].wind);

                    var barHgtMultipler = barRange == 0 ? 45 : ((weatherInfo.daypartForecast.times[i].temp - barMin) / barRange) * 45;
                    //$(`.daypart-forecast .hour.${dpDivs[i]} .bar`).css('height', `${barminHeight + barHgtMultipler}px`);
                    $(`.daypart-forecast .hour.${dpDivs[i]} .temp`).css('margin-top', `${171 - barHgtMultipler}px`);
                    $(`.daypart-forecast .hour.${dpDivs[i]} .bar`).animate({ height: (barHgtMultipler + barminHeight) + "px" }, 1000, 'linear')
                }
                setTimeout(() => {
                    $(`.daypart-forecast .hour.i .temp`).fadeIn(0);
                    $(`.daypart-forecast .hour.ii .temp`).fadeIn(0);
                    $(`.daypart-forecast .hour.iii .temp`).fadeIn(0);
                    $(`.daypart-forecast .hour.iv .temp`).fadeIn(0);
                }, 1000);

                        setTimeout(() => {
                        $('.daypart-forecast').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay);
            } catch (error) {
                console.error(error);
                $('.daypart-forecast').css("background-image", `url(images/${appearanceSettings.graphicsPackage}/dpf_${weatherInfo.daypartForecast.dayName}.png)`)
                $('.daypart-forecast').fadeIn(0);
                $('.daypart-forecast .city-name').text(locationConfig.mainCity.extraname);
                $('.daypart-forecast .noreport').fadeIn(0);
                $(`.daypart-forecast .hour.i`).fadeOut(0);
                $(`.daypart-forecast .hour.ii`).fadeOut(0);
                $(`.daypart-forecast .hour.iii`).fadeOut(0);
                $(`.daypart-forecast .hour.iv`).fadeOut(0);

                        setTimeout(() => {
                        $('.daypart-forecast').fadeOut(0);
                        slideCallBack();
                }, slideSettings.slideDelay);
            }
        },
        almanac() {
            $(".almanac").css({
                "background-image": `url(${getPreloadedBackground('almanac')})`
            });
            // Preload next slide's background
            if (slideSettings.order[nidx]) {
                preloadNextSlide(slideSettings.order[nidx].function);
            }
            $('.almanac').fadeIn(0);
                // Hide elements for animation
                $('.almanac .information').fadeOut(0);
            $('.almanac .day.i .header').text(weatherInfo.almanac.days[0].day);
            $('.almanac .day.i .sunrise').text(weatherInfo.almanac.days[0].sunrise);
            $('.almanac .day.i .sunset').text(weatherInfo.almanac.days[0].sunset);
            $('.almanac .day.ii .header').text(weatherInfo.almanac.days[1].day);
            $('.almanac .day.ii .sunrise').text(weatherInfo.almanac.days[1].sunrise);
            $('.almanac .day.ii .sunset').text(weatherInfo.almanac.days[1].sunset);

            var mpDivs = ["i", "ii", "iii", "iv"]
            for (var i = 0; i < 4; i++) {
                $(`.almanac .moonphase.${mpDivs[i]} .moon`).css("background-image", `url(images/moonphases/${weatherInfo.almanac.moonphases[i].type}.png)`);
                $(`.almanac .moonphase.${mpDivs[i]} .type`).text(weatherInfo.almanac.moonphases[i].type.toLowerCase());
                $(`.almanac .moonphase.${mpDivs[i]} .date`).text(weatherInfo.almanac.moonphases[i].date);
            }

            setTimeout(() => {
                $('.almanac .information').fadeIn(0);
            }, animationDelay);
            setTimeout(() => {
                $('.almanac').fadeOut(0);
                slideCallBack();
            }, slideSettings.slideDelay);
        },
        bulletin() {
            // Check alert status dynamically - this allows the slide to appear/disappear during loops
            if (weatherInfo.bulletin.enabled == false || weatherInfo.bulletin.alerts.length == 0) {
                // If no bulletin alerts, make sure LDL is visible and skip this slide
                if (!weatherInfo.bulletin.crawlAlert.enabled) {
                    $('.ldl').fadeIn(0);
                    displayLDL(ldlIdx);
                }
                slideCallBack();
            } else {
                $(".bulletin").css({
                    "background-image": `url(${getPreloadedBackground('bulletin')})`
                });
                // Preload next slide's background
                if (slideSettings.order[nidx]) {
                    preloadNextSlide(slideSettings.order[nidx].function);
                }
                $('.bulletin').fadeIn(0);
                // Clear any existing bulletin alerts first
                $('.bulletin .alerts').empty();
                var bulletinText = "";
                for (var i = 0; i < 2; i++) {
                    if (!weatherInfo.bulletin.alerts[i]) { continue; }
                    bulletinText = bulletinText + `<span>${weatherInfo.bulletin.alerts[i].desc}</span>\n`;
                }
                $('.bulletin .alerts').append(bulletinText);

                // Set up interval to check if alerts expire during display
                var bulletinCheckInterval = setInterval(() => {
                    if (weatherInfo.bulletin.enabled == false || weatherInfo.bulletin.alerts.length == 0) {
                        // Alerts have expired during display - end the bulletin slide early
                        clearInterval(bulletinCheckInterval);
                        // Start next slide early to prevent black flash when alerts expire
                        if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'dayDesc') {
                            slideCallBack();
                                $('.bulletin').fadeOut(0);
                        } else {
                            $('.bulletin').fadeOut(0);
                            slideCallBack();
                        }
                    }
                }, 1000); // Check every second

                setTimeout(() => {
                    clearInterval(bulletinCheckInterval);
                    // Only fade out if alerts are still active (haven't been cleared early)
                    if (weatherInfo.bulletin.enabled && weatherInfo.bulletin.alerts.length > 0) {
                        // Start next slide early to prevent black flash between Bulletin and next slide
                        if (slideSettings.order[nidx] && slideSettings.order[nidx].function === 'dayDesc') {
                            slideCallBack();
                                $('.bulletin').fadeOut(0);
                        } else {
                            $('.bulletin').fadeOut(0);
                            slideCallBack();
                        }
                    }
                }, slideSettings.slideDelay);
            }
        }
    } //end of slidePrograms
    if (idx >= slideSettings.order.length) {
        idx = 0;
        grabData();
        updateRadarFrames(); // Add this line to update radar frames each loop
        ldlIdx = 0;
        
        // Reset only narration system at start of each loop
        console.log("Starting new loop - resetting narration system");
        try {
            if (window.audioPlayer && window.audioPlayer.$players) {
                // Only destroy voice players, leave music untouched
                window.audioPlayer.$players.find('.voice').each(function() {
                    try {
                        $(this).jPlayer('destroy');
                    } catch (e) {
                        console.warn("Error destroying voice player:", e);
                    }
                }).remove();
            }

            // Create new voice players while preserving music system
            if (window.audioPlayer) {
                window.audioPlayer.resetVoicePlayers();
            } else {
                // If no audio system exists at all, create it
                window.audioPlayer = new AudioManager();
            }
        } catch (error) {
            console.error("Failed to reset narration system:", error);
        }
        
        // Check if alert status has changed and handle accordingly
        if (!weatherInfo.bulletin.crawlAlert.enabled && warningCrawlEnabled) {
            // Alerts have expired - hide warning crawl and show normal LDL
            warningCrawlEnabled = false;
            $('.ldl .warning-crawl').fadeOut(0);
            $('.ldl .warning-crawl .marquee').marquee('destroy');
            $('.ldl').fadeIn(0);
            displayLDL(ldlIdx);
        } else if (weatherInfo.bulletin.crawlAlert.enabled && !warningCrawlEnabled) {
            // New alerts have become active - show warning crawl
            $('.ldl').fadeOut(0);
            displayLDL(ldlIdx); // This will activate the warning crawl
        }
        // If alert status hasn't changed, don't interrupt the current crawl state
        
        // Only manage normal LDL if no alerts are active
        if (!weatherInfo.bulletin.crawlAlert.enabled) {
            // Clear any existing LDL intervals
            clearInterval(ldlInterval);
            // Reset LDL elements to initial state
            $('.ldl .upper-text').fadeOut(0);
            $('.ldl .lower-text').fadeOut(0);
            $('.ldl .lower-text.left .label').fadeOut(0);
            $('.ldl .lower-text.left .cond').fadeOut(0);
            $('.ldl .lower-text.left .cc').fadeOut(0);
            $('.ldl .lower-text.right').fadeOut(0);
            $('.ldl .lower-text.right .label').fadeOut(0);
            $('.ldl .lower-text.right .cond').fadeOut(0);
            $('.ldl .crawl').marquee('destroy');
            $('.ldl .crawl').text("");
            // Reset any custom padding
            $('.ldl .lower-text.left .cond').css('padding-left', '');
            
            displayLDL(ldlIdx);
        }

        // Reset daypart forecast elements
        $(`.daypart-forecast .hour.i .temp`).css('margin-top', `315px`);
        $(`.daypart-forecast .hour.ii .temp`).css('margin-top', `315px`);
        $(`.daypart-forecast .hour.iii .temp`).css('margin-top', `315px`);
        $(`.daypart-forecast .hour.iv .temp`).css('margin-top', `315px`);

        $(`.daypart-forecast .hour.i .bar`).css('height', '5px');
        $(`.daypart-forecast .hour.ii .bar`).css('height', '5px');
        $(`.daypart-forecast .hour.iii .bar`).css('height', '5px');
        $(`.daypart-forecast .hour.iv .bar`).css('height', '5px');

        $(`.daypart-forecast .hour.i .temp`).fadeOut(0);
        $(`.daypart-forecast .hour.ii .temp`).fadeOut(0);
        $(`.daypart-forecast .hour.iii .temp`).fadeOut(0);
        $(`.daypart-forecast .hour.iv .temp`).fadeOut(0);

        // Clear accumulated elements that could cause duplication
        $('.bulletin .alerts').empty();
        
        // Reset all animated elements to their initial hidden states for proper transitions
        // Current Conditions
        $('.current-conditions .city-name').fadeOut(0);
        $('.current-conditions .labels').fadeOut(0);
        $('.current-conditions .information').fadeOut(0);
        $('.current-conditions .noreport').fadeOut(0);
        
        // Eight Cities
        $('.eight-cities .information').fadeOut(0);
        $('.eight-cities .top').fadeOut(0);
        $('.eight-cities .extra-loc .noreport').fadeOut(0);
        $('.eight-cities .extra-loc .icon').fadeIn(0);
        
        // Local Forecast
        $('.local-forecast .city-name').fadeOut(0);
        $('.local-forecast .slide .period').fadeOut(0);
        $('.local-forecast .slide .description').fadeOut(0);
        $('.local-forecast .noreport').fadeOut(0);
        
        // Week Ahead
        $('.week-ahead .city-name').fadeOut(0);
        $('.week-ahead .information').fadeOut(0);
        $('.week-ahead .noreport').fadeOut(0);
        
        // Radar
        $('#locradar').fadeOut(0);
        $('#locmap').fadeOut(0);
        $('.radar .banner').fadeOut(0);
        
        // Daypart Forecast
        $('.daypart-forecast .noreport').fadeOut(0);
        
        // Almanac
        $('.almanac .information').fadeOut(0);
    }
    if (nidx >= slideSettings.order.length) {
        nidx = 0;
    }
    currentProgram = slidePrograms[slideSettings.order[idx].function]
    currentDiv = slideDivs[slideSettings.order[idx].function]
    nextProgram = slidePrograms[slideSettings.order[nidx].function]
    nextDiv = slideDivs[slideSettings.order[nidx].function]
    currentProgram();

    function slideCallBack() {
        idx++;
        nidx++;
        showSlides();
    };
}//END OF showSlides() FUNCTION
