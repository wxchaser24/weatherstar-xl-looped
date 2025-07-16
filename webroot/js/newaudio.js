class AudioManager {
    constructor() {
        this.playlist = []
        this.$players = $('<div id="players">')
        this.isMobile = false
        this.vocallocal = []
        this.isAlertBeepPlaying = false
        this.queuedNarration = null
        this.alertBeepTimeout = null
        this.musicVolume = 0.8 // Track music volume
        this.isDucking = false // Track ducking state

        $('body').append(this.$players)

        if (audioSettings.enableMusic) {
            this.buildPlaylist();
            if (audioSettings.randomStart) { this.shuffleStart() }
            if (audioSettings.shuffle) { shuffle(this.playlist) }
        }
    }

    // Add resetVoicePlayers method
    resetVoicePlayers() {
        try {
            // Remove any existing voice players
            this.$players.find('.voice').each(function() {
                try {
                    $(this).jPlayer('destroy');
                } catch (e) {
                    console.warn("Error destroying voice player:", e);
                }
            }).remove();

            // Reset vocal local array and alert beep flag
            this.vocallocal = [];
            this.isAlertBeepPlaying = false;
            this.queuedNarration = null;
            if (this.alertBeepTimeout) {
                clearTimeout(this.alertBeepTimeout);
                this.alertBeepTimeout = null;
            }
            
            // Restore music volume if it was ducked
            if (this.isDucking) {
                this.restoreMusicVolume();
            }
            
            console.log("Reset voice players - alert beep state:", this.isAlertBeepPlaying);
        } catch (error) {
            console.error("Error in resetVoicePlayers:", error);
        }
    }

    // Add method to restore music volume
    restoreMusicVolume() {
        try {
            const musicPlayers = this.$players.find('.music');
            if (musicPlayers.length > 0) {
                musicPlayers.jPlayer('volume', this.musicVolume);
                console.log("Restored music volume to:", this.musicVolume);
            }
            this.isDucking = false;
        } catch (error) {
            console.error("Error restoring music volume:", error);
        }
    }

    // Add method to duck music volume
    duckMusicVolume() {
        try {
            const musicPlayers = this.$players.find('.music');
            if (musicPlayers.length > 0) {
                // Store current volume before ducking
                const player = musicPlayers.first();
                const playerData = player.data('jPlayer');
                if (playerData) {
                    this.musicVolume = playerData.options.volume;
                }
                musicPlayers.jPlayer('volume', 0);
                this.isDucking = true;
                console.log("Ducked music volume, stored volume:", this.musicVolume);
            }
        } catch (error) {
            console.error("Error ducking music volume:", error);
        }
    }

    shuffleStart() {
        var firstHalf = this.playlist
        var secondHalf = firstHalf.splice(Math.floor(Math.random() * firstHalf.length))
        this.playlist = [...secondHalf, ...firstHalf]
    }

    playCC(vl) {
        try {
            console.log("Attempting to play CC, alert beep state:", this.isAlertBeepPlaying);
            if(vl && this.vocallocal && this.vocallocal.length > 0){
            this.startPlaying(this.vocallocal, false);
        } else{
            this.startPlaying(['narrations/Your_current_conditions.mp3'], false)
            }
        } catch (error) {
            console.error("Error in playCC:", error);
            this.startPlaying(['narrations/Your_current_conditions.mp3'], false);
        }
    }

    playLF() {
        try {
            console.log("Attempting to play LF, alert beep state:", this.isAlertBeepPlaying);
        this.startPlaying(['narrations/The_forecast_for_your_area.mp3'], false)
        } catch (error) {
            console.error("Error in playLF:", error);
        }
    }

    playEF() {
        try {
            console.log("Attempting to play EF, alert beep state:", this.isAlertBeepPlaying);
        this.startPlaying(['narrations/Your_extended_forecast.mp3'], false)
        } catch (error) {
            console.error("Error in playEF:", error);
        }
    }

    resetAlertState() {
        console.log("Forcibly resetting alert state");
        this.isAlertBeepPlaying = false;
        if (this.alertBeepTimeout) {
            clearTimeout(this.alertBeepTimeout);
            this.alertBeepTimeout = null;
        }
        // Play any queued narration
        if (this.queuedNarration) {
            console.log("Playing queued narration after reset:", this.queuedNarration[0]);
            const narration = this.queuedNarration;
            this.queuedNarration = null;
            this.startPlaying(narration, false);
        }
    }

    playWarningBeep() {
        console.log("Starting warning beep");
        // Clear any existing voice players first
        this.$players.find('.voice').each(function() {
            try {
                $(this).jPlayer('destroy');
            } catch (e) {
                console.warn("Error destroying voice player:", e);
            }
        }).remove();
        
        // Clear any existing timeout
        if (this.alertBeepTimeout) {
            clearTimeout(this.alertBeepTimeout);
        }
        
        this.isAlertBeepPlaying = true;
        
        // Set a timeout to reset the alert state after 2 seconds
        // This ensures we don't get stuck if the ended event doesn't fire
        this.alertBeepTimeout = setTimeout(() => this.resetAlertState(), 2000);
        
        // Use absolute path for warning beep
        const beepPath = window.location.protocol + '//' + window.location.host + '/narrations/warningbeep.wav';
        this.startPlaying([beepPath], false);
    }

    buildPlaylist() {
        var musicPath = 'music/';
        this.playlist = [];
        for(var i = 0; i < audioSettings.order.length; i++){
            this.playlist.push(`${musicPath}${audioSettings.order[i]}.mp3`);
        }
    }

    startPlaying(arr, loop) {
        try {
            var audioType = loop ? 'music' : 'voice'
            const isAlertBeep = !loop && arr[0].includes('warningbeep.wav');
            const isNarration = !loop && !isAlertBeep;
            
            console.log("startPlaying called:", {
                audioType,
                isAlertBeep,
                isNarration,
                file: arr[0],
                alertBeepState: this.isAlertBeepPlaying
            });
            
            // If this is a narration and an alert beep is playing, queue it for later
            if (isNarration && this.isAlertBeepPlaying) {
                console.log("Queuing narration for later:", arr[0]);
                this.queuedNarration = arr;
                return;
            }
            
            if (this.$players.find(`.${audioType}`).length > 0) {
                console.log("Player of type", audioType, "already exists, returning");
                return;
            }
            
            if (!arr || !Array.isArray(arr) || arr.length === 0) {
                console.warn("Invalid audio array provided to startPlaying");
                return;
            }

            var current = -1;
            const len = arr.length;
            var self = this;

            const initPlayer = (id, audioType) => {
                var $div = $(`<div id="${id}" class="jplayer ${audioType}"></div>`);
                $div.jPlayer({
                    swfPath: `${document.baseURI}jplayer`,
                    preload: 'auto',
                    ended: function() { 
                        // Reset alert beep flag when it finishes playing
                        if (isAlertBeep) {
                            console.log("Alert beep finished playing naturally");
                            if (self.alertBeepTimeout) {
                                clearTimeout(self.alertBeepTimeout);
                                self.alertBeepTimeout = null;
                            }
                            self.resetAlertState();
                        }
                        playNext();
                    },
                    error: function(event) {
                        console.error("jPlayer error:", event.jPlayer.error);
                        if (isAlertBeep) {
                            console.log("Alert beep error - resetting state");
                            self.resetAlertState();
                        }
                        // Clean up players and restore music volume on error
                        try {
                            if (self.isDucking) {
                                self.restoreMusicVolume();
                            }
                            // Clean up the failed players
                            $player.jPlayer('destroy').remove();
                            $preloader.jPlayer('destroy').remove();
                        } catch (e) {
                            console.warn("Error cleaning up after audio error:", e);
                        }
                    }
                });
                this.$players.append($div);
                return $div;
            }

            var $player = initPlayer('p1', audioType)
            var $preloader = initPlayer('p2', audioType)

            const playNext = () => {
                try {
                    current = getNextIndex();

                    if (getNextIndex() === null) {
                        $preloader.off($.jPlayer.event.ended).on($.jPlayer.event.ended, () => {
                            try {
                                // Restore music volume if this was a voice player or alert beep
                                if ((audioType === 'voice' || isAlertBeep) && self.isDucking) {
                                    self.restoreMusicVolume();
                                }
                                $player.jPlayer('destroy').remove();
                                $preloader.jPlayer('destroy').remove();
                            } catch (e) {
                                console.warn("Error cleaning up players:", e);
                            }
                        });
                        switchAudio();
                    } else {
                        switchAudio();
                        preloadTrack(arr[getNextIndex()]);
                    }
                } catch (error) {
                    console.error("Error in playNext:", error);
                    // Clean up and restore music volume on error
                    try {
                        if (self.isDucking) {
                            self.restoreMusicVolume();
                        }
                        $player.jPlayer('destroy').remove();
                        $preloader.jPlayer('destroy').remove();
                    } catch (e) {
                        console.warn("Error cleaning up after playNext error:", e);
                    }
                }
            };

            const preloadTrack = (trackName) => {
                try {
                    // Ensure the track name is a valid URL
                    if (!trackName.startsWith('http') && !trackName.startsWith('/')) {
                        trackName = '/' + trackName;
                    }
                    $preloader.jPlayer('setMedia', { mp3: trackName })
                        .jPlayer('play', audioType == 'music' ? Math.abs(audioSettings.offset) : 0)
                        .jPlayer('stop');
                } catch (e) {
                    console.error("Error preloading track:", e);
                    setTimeout(() => preloadTrack(trackName), 500);
                }
            };

            const getNextIndex = () => {
                const nextIndex = current + 1;
                return nextIndex < len ? nextIndex : (loop ? 0 : null);
            };

            const switchAudio = () => {
                try {
                    var tempAudio = $player;
                    var tempAudio2 = $preloader;
                    $player = tempAudio2;
                    $preloader = tempAudio;
                    
                    $player.jPlayer('play', audioType == 'music' ? Math.abs(audioSettings.offset) : 0);

                    if (!this.isMobile) {
                        $(document).one('mousedown', () => {
                            $player.jPlayer('play', audioType == 'music' ? Math.abs(audioSettings.offset) : 0);
                            this.isMobile = true;
                        });
                    }
                } catch (error) {
                    console.error("Error in switchAudio:", error);
                    // Clean up and restore music volume on error
                    try {
                        if (self.isDucking) {
                            self.restoreMusicVolume();
                        }
                        $player.jPlayer('destroy').remove();
                        $preloader.jPlayer('destroy').remove();
                    } catch (e) {
                        console.warn("Error cleaning up after switchAudio error:", e);
                    }
                }
            };

            // Duck music volume for voice playback or alert beeps
            if (audioType === 'voice' || isAlertBeep) {
                this.duckMusicVolume();
            }

            this.playCallback = {};
            // Ensure the first track name is a valid URL
            if (!arr[0].startsWith('http') && !arr[0].startsWith('/')) {
                arr[0] = '/' + arr[0];
            }
            $preloader.jPlayer('setMedia', { mp3: arr[0] });
            playNext();
        } catch (error) {
            console.error("Error in startPlaying:", error);
            // Clean up and restore music volume on error
            try {
                if (this.isDucking) {
                    this.restoreMusicVolume();
                }
                if ($player) $player.jPlayer('destroy').remove();
                if ($preloader) $preloader.jPlayer('destroy').remove();
            } catch (e) {
                console.warn("Error cleaning up after startPlaying error:", e);
            }
        }
    }

    stopPlaying() {
        try {
            // Store current volume before stopping
            const musicPlayers = this.$players.find('.music');
            if (musicPlayers.length > 0) {
                const player = musicPlayers.first();
                const playerData = player.data('jPlayer');
                if (playerData) {
                    this.musicVolume = playerData.options.volume;
                }
            }
        this.$players.find('.music').jPlayer('volume', 0);
        } catch (error) {
            console.error("Error in stopPlaying:", error);
        }
    }
}

var audioPlayer = new AudioManager();
