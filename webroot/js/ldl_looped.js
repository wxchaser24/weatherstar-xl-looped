var ldlInterval;
var ldlDelay = 8000;
var ldlIdx = 0;
var warningCrawlEnabled = false;
var warningCrawlCheckInterval; // Add variable to track the expiration check interval
var ldlPaused = false; // Add variable to track if LDL is paused
var ldlResuming = false; // Add variable to track if LDL is resuming
var ldlPauseTime = 0; // Track when the pause started
var ldlStartTime = 0; // Track when the current slide started

function pauseLDL() {
    ldlPaused = true;
    ldlPauseTime = Date.now();
    clearInterval(ldlInterval);
}

function resumeLDL() {
    if (ldlPaused) {
        ldlPaused = false;
        ldlResuming = true; // Set flag to indicate we're resuming
        
        // Calculate how much time was left in the current slide
        var elapsedTime = ldlPauseTime - ldlStartTime;
        var remainingTime = ldlDelay - elapsedTime;
        
        // If there's still time left in the slide, continue with remaining time
        if (remainingTime > 0) {
            // Resume the current slide with remaining time
            resumeCurrentSlide(remainingTime);
        } else {
            // Time was already up, move to next slide
            displayLDL(ldlIdx);
        }
    }
}

function resumeCurrentSlide(remainingTime) {
    // Set timeout for the remaining time, then move to next slide
    ldlInterval = setTimeout(() => {
        // Clear the resuming flag since we're moving to the next slide
        ldlResuming = false;
        // Don't increment here - let displayLDL handle the increment
        // Just call displayLDL with current index, it will increment properly
        displayLDL(ldlIdx);
    }, remainingTime);
}

function adCrawl(){
    var crawlIdx = Math.floor(Math.random() * appearanceSettings.marqueeAd.length);
    $('.ldl .crawl').text(appearanceSettings.marqueeAd[crawlIdx])
    $('.ldl .crawl').marquee({ speed: 170, pauseOnHover: false }).on('finished', () =>{
        $('.ldl .crawl').text("");
        $('.ldl .crawl').marquee('destroy');
    })
}

function displayLDL(idx){
    if (ldlPaused) {
        return; // Don't continue if LDL is paused
    }
    
    // Track when this slide starts (only if not resuming)
    if (!ldlResuming) {
        ldlStartTime = Date.now();
    }
    
    if(slideSettings.flavor == 'D') {ldlDelay = 7150;}
    if(weatherInfo.bulletin.crawlAlert.enabled){
        if(warningCrawlEnabled == false){
            // Hide all LDL elements first regardless of mode
            $('.ldl .upper-text').fadeOut(0);
            $('.ldl .lower-text').fadeOut(0);
            $('.ldl .crawl').marquee('destroy');
            $('.ldl .crawl').text("");
            
            $('.ldl .warning-crawl').fadeIn(0);
            console.log(weatherInfo.bulletin.crawlAlert.alert.significance);
            // Use the appropriate background image based on significance
            $('.ldl .warning-crawl').css('background-image', `url(images/crawl/alert_${weatherInfo.bulletin.crawlAlert.alert.significance}.png)`);
            $('.ldl .warning-crawl .title').text(weatherInfo.bulletin.crawlAlert.alert.name);
            $('.ldl .warning-crawl .marquee').text(weatherInfo.bulletin.crawlAlert.alert.description.toUpperCase());
            $('.ldl .warning-crawl .marquee').marquee({
                speed: 170, 
                pauseOnHover: false
            }).on('finished', () => {
                // Play beep every time the marquee completes a cycle
                if(weatherInfo.bulletin.crawlAlert.alert.severe) {
                    audioPlayer.playWarningBeep();
                }
            });
            if(weatherInfo.bulletin.crawlAlert.alert.severe) {audioPlayer.playWarningBeep();}
            warningCrawlEnabled = true;
            
            // Start checking for alert expiration every second
            warningCrawlCheckInterval = setInterval(() => {
                // Refresh alert data to check for real-time expiration
                $.getJSON(`https://api.weather.com/v3/alerts/headlines?geocode=${locationConfig.mainCity.lat},${locationConfig.mainCity.lon}&format=json&language=en-US&apiKey=${api_key}`, function(data){
                    var alertStillActive = false;
                    var currentAlertKey = weatherInfo.bulletin.crawlAlert.alert.detailKey;
                    
                    if(data && data.alerts) {
                        for(var i = 0; i < data.alerts.length; i++){
                            if(data.alerts[i].detailKey === currentAlertKey) {
                                // Verify alert hasn't expired
                                var expirationTime = new Date(data.alerts[i].expireTimeLocal);
                                if(expirationTime > new Date()) {
                                    alertStillActive = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!alertStillActive) {
                        // Alert has expired - immediately stop the warning crawl and resume LDL
                        weatherInfo.bulletin.crawlAlert.enabled = false;
                        clearInterval(warningCrawlCheckInterval);
                        warningCrawlEnabled = false;
                        $('.ldl .warning-crawl').fadeOut(0);
                        $('.ldl .warning-crawl .marquee').marquee('destroy');
                        $('.ldl').fadeIn(0);
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
                        // Start normal LDL cycle
                        displayLDL(0);
                    }
                }).fail(function(){
                    // If API call fails, assume alert has expired to be safe
                    weatherInfo.bulletin.crawlAlert.enabled = false;
                    clearInterval(warningCrawlCheckInterval);
                    warningCrawlEnabled = false;
                    $('.ldl .warning-crawl').fadeOut(0);
                    $('.ldl .warning-crawl .marquee').marquee('destroy');
                    $('.ldl').fadeIn(0);
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
                    // Start normal LDL cycle
                    displayLDL(0);
                });
            }, 1000); // Check every second for more responsive expiration
            
            return;
        }
        return; // Stay on warning crawl if already enabled
    } else {
        // Clear the warning crawl check interval if alerts are not enabled
        if (warningCrawlCheckInterval) {
            clearInterval(warningCrawlCheckInterval);
            warningCrawlCheckInterval = null;
        }
    }
    if(appearanceSettings.ldlType == 'crawl'){
        if(ldlIdx == -1) return;
        $('.ldl .upper-text').fadeOut(0);
        $('.ldl .lower-text').fadeOut(0);
        $('.ldl').fadeIn(0); // Ensure LDL is visible for crawl mode
        adCrawl();
        ldlIdx = -1;
        return;
    }
    if(weatherInfo.currentConditions.noReport == true){
        throw new Error("LDL will not display due to no report on current conditions");
    }
    if(appearanceSettings.graphicsPackage == "v1" && ldlRound == 0){
        $('.ldl .upper-text').fadeOut(0);
        $('.ldl .lower-text').fadeOut(0);
        adCrawl();
        return;
    }
    var displays = {
        currentObs(){
            $('.ldl .upper-text').fadeIn(0);
            $('.ldl .lower-text').fadeIn(0);
            $('.ldl .lower-text.left .cc').fadeIn(0);
            $('.ldl .upper-text').text("CURRENTLY AT  " + locationConfig.mainCity.displayname.toUpperCase());
            $('.ldl .lower-text.left .cc').text(weatherInfo.currentConditions.cond);

            ldlInterval = setTimeout(() =>{
                $('.ldl .lower-text.left .cc').fadeOut(0);
                displayLDL(idx);
            }, ldlDelay)
        },
        temperature(){
            $('.ldl .lower-text.left .label').fadeIn(0);
            $('.ldl .lower-text.left .cond').fadeIn(0);
            $('.ldl .lower-text.left .label').text("Temp");
            $('.ldl .lower-text.left .cond').text(weatherInfo.currentConditions.temp + "°");
            if(weatherInfo.currentConditions.feelslike.type != null){
                $('.ldl .lower-text.right').fadeIn(0);
                $('.ldl .lower-text.right .label').fadeIn(0);
                $('.ldl .lower-text.right .cond').fadeIn(0);
                $('.ldl .lower-text.right .label').text(weatherInfo.currentConditions.feelslike.type);
                $('.ldl .lower-text.right .cond').text(weatherInfo.currentConditions.feelslike.val + "°");
            }

            ldlInterval = setTimeout(() =>{
                $('.ldl .lower-text.right').fadeOut(0);
                displayLDL(idx);
            },ldlDelay);
        },
        wind(){
            $('.ldl .lower-text.left .label').text("Wind");
            $('.ldl .lower-text.left .cond').text(weatherInfo.currentConditions.wind);
            if(weatherInfo.currentConditions.gusts != "None"){
                $('.ldl .lower-text.right').fadeIn(0);
                $('.ldl .lower-text.right .label').fadeIn(0);
                $('.ldl .lower-text.right .cond').fadeIn(0);
                $('.ldl .lower-text.right .label').text("Gusts");
                $('.ldl .lower-text.right .cond').text(weatherInfo.currentConditions.gusts);
            }

            ldlInterval = setTimeout(() =>{
                displayLDL(idx);
            },ldlDelay);
        },
        humidityDewPoint(){
            $('.ldl .lower-text.right .label').fadeIn(0);
            $('.ldl .lower-text.right .cond').fadeIn(0);
            $('.ldl .lower-text.right').fadeIn(0);
            $('.ldl .lower-text.left .label').text("Humidity");
            $('.ldl .lower-text.left .cond').text(weatherInfo.currentConditions.humidity);
            $('.ldl .lower-text.right .label').text("Dew Point");
            $('.ldl .lower-text.right .cond').text(weatherInfo.currentConditions.dewpoint + "°");

            ldlInterval = setTimeout(() =>{
                displayLDL(idx);
            },ldlDelay);
        },
        pressure(){
            $('.ldl .lower-text.right').fadeOut(0);
            $('.ldl .lower-text.left .label').text("Pressure");
            $('.ldl .lower-text.left .cond').text(weatherInfo.currentConditions.pressure + " in");

            ldlInterval = setTimeout(() =>{
                displayLDL(idx);
            },ldlDelay);
        },
        ceilingAndVisibility(){
            $('.ldl .lower-text.right').fadeIn(0);
            $('.ldl .lower-text.left .label').text("Ceiling");
            $('.ldl .lower-text.left .cond').text(weatherInfo.currentConditions.ceiling + (weatherInfo.currentConditions.ceiling == "Unlimited" ? "" : " ft"));
            $('.ldl .lower-text.right .label').text("Visibility");
            $('.ldl .lower-text.right .cond').text(weatherInfo.currentConditions.visibility + " mi");

            ldlInterval = setTimeout(() =>{
                displayLDL(idx);
            },ldlDelay);
        },
        precipitation(){
            $('.ldl .lower-text.right').fadeOut(0);
            $('.ldl .lower-text.left .label').text(new Date().toString().split(" ")[1] + " Precipitation");
            $('.ldl .lower-text.left .cond').text(weatherInfo.monthlyPrecip);
            if(appearanceSettings.aspectRatio == 3/2){
                $('.ldl .lower-text.left .cond').css('padding-left', '270px');
            }
            if(appearanceSettings.aspectRatio == 4/3){
                $('.ldl .lower-text.left .cond').css('padding-left', '144px');
            }

            ldlInterval = setTimeout(() =>{
                $('.ldl .upper-text').fadeOut(0);
                $('.ldl .lower-text.left .label').fadeOut(0);
                $('.ldl .lower-text.left .cond').fadeOut(0);
                $('.ldl .lower-text.right .label').fadeOut(0);
                $('.ldl .lower-text.right .cond').fadeOut(0);
                displayLDL(idx);
            },ldlDelay);
        },
        localAdSales(){
            $('.ldl .lower-text.left .cond').css('padding-left', '');
            if(appearanceSettings.ldlType == 'observations') return;
            if(appearanceSettings.ldlType == 'both' && slideSettings.flavor != 'M') return;
            if(appearanceSettings.graphicsPackage == "v1") return;
            clearInterval(ldlInterval);
            $('.ldl .upper-text').fadeOut(0);
            $('.ldl .lower-text').fadeOut(0);
            adCrawl();
        }
    }

    var ldlFuncs = Object.keys(displays);
    var ldlFunc = displays[ldlFuncs[idx]];
    
    // Only increment index if not resuming from pause
    if (!ldlResuming) {
        idx = (++idx===ldlFuncs.length ? 0 : idx);
        ldlIdx = idx;
    } else {
        // Clear the resuming flag after first resume
        ldlResuming = false;
    }
    
    ldlFunc();
}
