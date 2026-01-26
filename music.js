class MusicManager {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.volume = 0.3;
        this.isMuted = false;
        this.sfxEnabled = true; // Sound effects enabled by default
        
        this.restoreState();
        window.addEventListener('beforeunload', () => this.saveState());
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.audio && !this.isMuted) {
                this.audio.play().catch(e => console.log('Resume failed:', e));
            }
        });
    }

    restoreState() {
        const savedTrack = sessionStorage.getItem('currentMusic');
        const savedTime = sessionStorage.getItem('musicTime');
        const savedMuted = sessionStorage.getItem('musicMuted') === 'true';
        const savedSfx = sessionStorage.getItem('sfxEnabled');
        
        this.isMuted = savedMuted;
        this.sfxEnabled = savedSfx !== null ? savedSfx === 'true' : true;
        
        if (savedTrack) {
            this.init();
            this.currentTrack = savedTrack;
            this.audio.src = savedTrack;
            
            if (savedTime) {
                this.audio.currentTime = parseFloat(savedTime);
            }
            
            if (!this.isMuted) {
                setTimeout(() => {
                    this.audio.play().catch(error => {
                        console.log("Autoplay prevented, waiting for user interaction");
                        document.addEventListener('click', () => {
                            if (!this.isMuted) this.audio.play();
                        }, { once: true });
                    });
                }, 100);
            }
        }
    }

    saveState() {
        if (this.audio && this.currentTrack) {
            sessionStorage.setItem('currentMusic', this.currentTrack);
            sessionStorage.setItem('musicTime', this.audio.currentTime.toString());
            sessionStorage.setItem('musicMuted', this.isMuted.toString());
        }
        sessionStorage.setItem('sfxEnabled', this.sfxEnabled.toString());
    }

    init() {
        if (!this.audio) {
            this.audio = new Audio();
            this.audio.loop = true;
            this.audio.volume = this.volume;
            this.audio.preload = 'auto';
            
            this.audio.addEventListener('timeupdate', () => {
                if (this.audio.currentTime % 2 < 0.1) {
                    this.saveState();
                }
            });
        }
    }

    play(trackPath, shouldLoop = true) {
        this.init();
        
        if (this.currentTrack !== trackPath) {
            this.currentTrack = trackPath;
            this.audio.src = trackPath;
            this.audio.loop = shouldLoop;
            this.audio.currentTime = 0;
            
            sessionStorage.setItem('currentMusic', trackPath);
            sessionStorage.removeItem('musicTime');
        }
        
        if (!this.isMuted && this.audio.paused) {
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented");
                    document.addEventListener('click', () => {
                        if (!this.isMuted) this.audio.play();
                    }, { once: true });
                });
            }
        }
    }

    pause() {
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
        }
    }

    resume() {
        if (this.audio && this.audio.paused && !this.isMuted) {
            this.audio.play().catch(e => console.log('Resume failed:', e));
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.pause();
        } else {
            this.resume();
        }
        
        sessionStorage.setItem('musicMuted', this.isMuted.toString());
        return this.isMuted;
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        sessionStorage.setItem('sfxEnabled', this.sfxEnabled.toString());
        return this.sfxEnabled;
    }

    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            sessionStorage.removeItem('currentMusic');
            sessionStorage.removeItem('musicTime');
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }

    playSound(soundPath, volume = 0.5) {
        if (!this.sfxEnabled) return null;
        
        const sound = new Audio(soundPath);
        sound.volume = volume;
        sound.play().catch(error => {
            console.log("Sound effect playback failed:", error);
        });
        return sound;
    }

    getMuteState() {
        return this.isMuted;
    }

    getSFXState() {
        return this.sfxEnabled;
    }
}

window.musicManager = new MusicManager();

document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'start.html';
    
    const pageTracks = {
        'start.html': { path: './audio/menu-music.mp3', loop: true },
        'player.html': { path: './audio/menu-music.mp3', loop: true },
        'gamemode.html': { path: './audio/menu-music.mp3', loop: true },
        'futsal.html': { path: './audio/game-music.mp3', loop: true },
        'victory.html': { path: './audio/victory.mp3', loop: false }
    };
    
    if (pageTracks[currentPage]) {
        const track = pageTracks[currentPage];
        window.musicManager.play(track.path, track.loop);
    }
    
    initializeAudioButtons();
});

function initializeAudioButtons() {
    const musicBtn = document.getElementById('musicBtn');
    const sfxBtn = document.getElementById('sfxBtn');
    
    // Initialize Music Button
    if (musicBtn) {
        const isMuted = window.musicManager.getMuteState();
        const musicIcon = musicBtn.querySelector('i');
        
        if (isMuted) {
            musicBtn.classList.remove('active');
            musicBtn.classList.add('muted');
            if (musicIcon) musicIcon.className = 'fa-solid fa-volume-xmark';
        } else {
            musicBtn.classList.add('active');
            musicBtn.classList.remove('muted');
            if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high';
        }
        
        musicBtn.addEventListener('click', function() {
            const nowMuted = window.musicManager.toggleMute();
            
            this.classList.toggle('active');
            this.classList.toggle('muted');
            
            if (musicIcon) {
                musicIcon.className = nowMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            }
        });
    }
    
    // Initialize SFX Button
    if (sfxBtn) {
        const sfxEnabled = window.musicManager.getSFXState();
        const sfxIcon = sfxBtn.querySelector('i');
        
        if (!sfxEnabled) {
            sfxBtn.classList.remove('active');
            sfxBtn.classList.add('muted');
            if (sfxIcon) sfxIcon.className = 'fa-solid fa-bell-slash';
        } else {
            sfxBtn.classList.add('active');
            sfxBtn.classList.remove('muted');
            if (sfxIcon) sfxIcon.className = 'fa-solid fa-bell';
        }
        
        sfxBtn.addEventListener('click', function() {
            const nowEnabled = window.musicManager.toggleSFX();
            
            this.classList.toggle('active');
            this.classList.toggle('muted');
            
            if (sfxIcon) {
                sfxIcon.className = nowEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
            }
            
            // Play test sound when enabling
            if (nowEnabled) {
                window.musicManager.playSound('./audio/click2.mp3', 1);
            }
        });
    }
}

// Global function for click sounds - FIXED
function playClickSound() {
    if (window.musicManager) {
        window.musicManager.playSound('./audio/click2.mp3', 1);
    }
}

// Make it globally available
window.playClickSound = playClickSound;