class HogwartsAudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.initializeServiceWorker();
        this.setupEventListeners();
    }

    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('service-worker.js');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    setupEventListeners() {
        const buttons = document.querySelectorAll('.house-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => this.playHouseSound(button.dataset.house));
        });
    }

    async playHouseSound(house) {
        const audioPath = `sounds/${house}.mp3`;

        if (this.currentAudio) {
            // Create a gain node for fade out
            const gainNode = this.currentAudio.context.createGain();
            this.currentAudio.disconnect();
            this.currentAudio.connect(gainNode);
            gainNode.connect(this.currentAudio.context.destination);

            // Fade out over 1000ms
            gainNode.gain.setValueAtTime(gainNode.gain.value, this.currentAudio.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, this.currentAudio.context.currentTime + 1);

            // Stop the current audio after fade out
            setTimeout(() => {
                this.currentAudio.pause();
                this.currentAudio = null;
            }, 1000);
        }

        try {
            const audio = new Audio(audioPath);
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audio);
            source.connect(audioContext.destination);
            
            audio.play();
            this.currentAudio = source;
        } catch (error) {
            console.error(`Error playing ${house} sound:`, error);
        }
    }
}

// Initialize the app
const app = new HogwartsAudioPlayer();
