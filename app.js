class HogwartsAudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentAudioContext = null;
        this.currentSource = null;
        this.currentGainNode = null;
        this.analyser = null;
        this.visualizer = document.querySelector('.audio-visualizer');
        this.houseAudios = {
            gryffindor: [],
            slytherin: [],
            ravenclaw: [],
            hufflepuff: []
        };
        this.currentIndex = {
            gryffindor: 0,
            slytherin: 0,
            ravenclaw: 0,
            hufflepuff: 0
        };
        this.isInitialized = false;
        this.pendingHouseSound = null;
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Handle protocol launch
            this.handleProtocolLaunch();

            // First, check if service workers are supported
            if (!('serviceWorker' in navigator)) {
                console.log('Service Workers not supported');
                this.initializeWithoutServiceWorker();
                return;
            }

            // Initialize service worker
            const registration = await this.initializeServiceWorker();
            
            // Setup message listener only after service worker is registered
            if (registration) {
                this.setupServiceWorkerMessages();
            }

            // Detect audio files
            await this.detectAudioFiles();
            
            // Setup UI
            this.setupEventListeners();
            
            // Cache files if service worker is ready
            if (registration && registration.active) {
                await this.cacheAudioFiles();
            } else {
                // If no service worker, mark as ready immediately
                this.updateUIStatus('ready');
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Initialization error:', error);
            // Fall back to basic functionality without service worker
            this.initializeWithoutServiceWorker();
        }
    }

    handleProtocolLaunch() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const house = urlParams.get('house');

        // If a house is specified and it's valid, play its sound
        if (house && this.houseAudios.hasOwnProperty(house.toLowerCase())) {
            // We'll play the sound once the app is initialized
            this.pendingHouseSound = house.toLowerCase();
        }
    }

    initializeWithoutServiceWorker() {
        this.detectAudioFiles()
            .then(() => {
                this.setupEventListeners();
                this.updateUIStatus('ready');
                this.isInitialized = true;
                // Play pending house sound if exists
                if (this.pendingHouseSound) {
                    this.playHouseSound(this.pendingHouseSound);
                    this.pendingHouseSound = null;
                }
            })
            .catch(error => {
                console.error('Failed to initialize without service worker:', error);
            });
    }

    async initializeServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('ServiceWorker registration successful');
            
            // Wait for the service worker to be ready
            if (registration.active) {
                return registration;
            }

            // If the service worker is installing, wait for it to activate
            if (registration.installing || registration.waiting) {
                await new Promise(resolve => {
                    registration.addEventListener('activate', () => resolve(registration), { once: true });
                });
            }

            return registration;
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
            return null;
        }
    }

    setupServiceWorkerMessages() {
        if (!navigator.serviceWorker) return;
        
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'AUDIO_CACHE_COMPLETE') {
                console.log('All audio files have been cached for offline use');
                this.updateUIStatus('ready');
                // Play pending house sound if exists
                if (this.pendingHouseSound) {
                    this.playHouseSound(this.pendingHouseSound);
                    this.pendingHouseSound = null;
                }
            }
        });
    }

    updateUIStatus(status) {
        const buttons = document.querySelectorAll('.house-btn');
        buttons.forEach(button => {
            if (status === 'ready') {
                button.removeAttribute('disabled');
                button.classList.remove('loading');
            } else {
                button.setAttribute('disabled', 'true');
                button.classList.add('loading');
            }
        });
    }

    setupEventListeners() {
        const buttons = document.querySelectorAll('.house-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (this.isInitialized) {
                    this.playHouseSound(button.dataset.house);
                }
            });
        });
    }

    async detectAudioFiles() {
        const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
        
        for (const house of houses) {
            // Reset the audio files array for this house
            this.houseAudios[house] = [];
            
            // Try different numbered variations
            let fileIndex = 1;
            while (true) {
                const numberedPath = `sounds/${house}${fileIndex}.mp3`;
                try {
                    const response = await fetch(numberedPath, { method: 'HEAD' });
                    if (response.ok) {
                        this.houseAudios[house].push(numberedPath);
                        fileIndex++;
                    } else {
                        break;
                    }
                } catch (error) {
                    break;
                }
            }
            
            // Also try the base filename without number
            const basePath = `sounds/${house}.mp3`;
            try {
                const response = await fetch(basePath, { method: 'HEAD' });
                if (response.ok) {
                    this.houseAudios[house].push(basePath);
                }
            } catch (error) {
                console.warn(`Base audio file for ${house} not found`);
            }
            
            // Shuffle the array to randomize playback order
            this.shuffleArray(this.houseAudios[house]);
            
            console.log(`Found ${this.houseAudios[house].length} audio files for ${house}`);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async cacheAudioFiles() {
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
            console.log('Service Worker not ready for caching');
            return;
        }

        const audioFiles = Object.values(this.houseAudios).flat();
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_AUDIO_FILES',
            files: audioFiles
        });
    }

    getNextAudioFile(house) {
        const audioFiles = this.houseAudios[house];
        if (!audioFiles || audioFiles.length === 0) {
            console.error(`No audio files found for ${house}`);
            return null;
        }

        // Get the next file and increment the index
        const file = audioFiles[this.currentIndex[house]];
        
        // Increment and wrap around if needed
        this.currentIndex[house] = (this.currentIndex[house] + 1) % audioFiles.length;
        
        // If we're back at the beginning, reshuffle for next round
        if (this.currentIndex[house] === 0) {
            this.shuffleArray(audioFiles);
        }
        
        return file;
    }

    async playHouseSound(house) {
        const audioPath = this.getNextAudioFile(house);
        console.log('Playing audio:', audioPath);
        try {
            // Stop current audio if playing
            if (this.currentAudio) {
                // Hide visualizer
                this.visualizer.classList.remove('active');
                
                // Create a gain node for fade out if not exists
                if (!this.currentGainNode) {
                    this.currentGainNode = this.currentAudioContext.createGain();
                    if (this.currentSource) {
                        this.currentSource.disconnect();
                        this.currentSource.connect(this.currentGainNode);
                        this.currentGainNode.connect(this.currentAudioContext.destination);
                    }
                }

                // Fade out over 500ms
                this.currentGainNode.gain.setValueAtTime(this.currentGainNode.gain.value, this.currentAudioContext.currentTime);
                this.currentGainNode.gain.linearRampToValueAtTime(0, this.currentAudioContext.currentTime + 0.5);

                // Clean up after fade out
                setTimeout(() => {
                    if (this.currentAudio) {
                        this.currentAudio.pause();
                        this.currentAudio.currentTime = 0;
                    }
                    if (this.currentSource) {
                        this.currentSource.disconnect();
                    }
                    if (this.currentGainNode) {
                        this.currentGainNode.disconnect();
                    }
                    if (this.analyser) {
                        this.analyser.disconnect();
                    }
                    this.currentSource = null;
                    this.currentGainNode = null;
                    this.currentAudio = null;
                    this.analyser = null;
                }, 500);
            }

            // Create new audio context and elements
            const audio = new Audio(audioPath);
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audio);
            const gainNode = audioContext.createGain();
            const analyser = audioContext.createAnalyser();
            
            // Configure analyser
            analyser.fftSize = 32;
            analyser.smoothingTimeConstant = 0.8;
            
            // Connect the audio graph
            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Store references
            this.currentAudio = audio;
            this.currentAudioContext = audioContext;
            this.currentSource = source;
            this.currentGainNode = gainNode;
            this.analyser = analyser;
            
            // Start with full volume
            gainNode.gain.setValueAtTime(1, audioContext.currentTime);
            
            // Show visualizer
            this.visualizer.classList.add('active');
            
            // Play the audio
            await audio.play();

            // Start visualization
            this.updateVisualization();
        } catch (error) {
            console.error(`Error playing ${house} sound:`, error);
        }
    }

    updateVisualization() {
        if (!this.analyser || !this.currentAudio) {
            this.visualizer.classList.remove('active');
            return;
        }

        // Keep the visualization active while audio is playing
        if (!this.currentAudio.paused) {
            requestAnimationFrame(() => this.updateVisualization());
        } else {
            this.visualizer.classList.remove('active');
        }
    }
}

// Initialize the app
const app = new HogwartsAudioPlayer();
