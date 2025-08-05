class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isListening = false;
        this.recognition = null;
        this.lastProcessTime = 0;
        this.currentAudioData = {
            speech: '',
            dominantFrequency: 0,
            volumeLevel: 0,
            toneAnalysis: 'neutral',
            timestamp: Date.now()
        };

        this.setupSpeechRecognition();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        }

        if (this.recognition) {
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    this.currentAudioData.speech = finalTranscript;
                    this.updateUI();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
            };
        }
    }

    setupEventListeners() {
        document.getElementById('startListening').addEventListener('click', () => {
            this.startListening();
        });

        document.getElementById('stopListening').addEventListener('click', () => {
            this.stopListening();
        });
    }

    async startListening() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 2048;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.microphone.connect(this.analyser);
            
            this.isListening = true;
            document.getElementById('startListening').disabled = true;
            document.getElementById('stopListening').disabled = false;
            
            if (this.recognition) {
                this.recognition.start();
            }
            
            this.analyzeAudio();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    stopListening() {
        this.isListening = false;
        
        if (this.microphone) {
            this.microphone.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        document.getElementById('startListening').disabled = false;
        document.getElementById('stopListening').disabled = true;
    }

    analyzeAudio() {
        if (!this.isListening) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate volume level
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const averageVolume = sum / this.dataArray.length;
        this.currentAudioData.volumeLevel = Math.round(averageVolume);

        // Find dominant frequency
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > maxValue) {
                maxValue = this.dataArray[i];
                maxIndex = i;
            }
        }
        
        const nyquist = this.audioContext.sampleRate / 2;
        const dominantFreq = (maxIndex * nyquist) / this.dataArray.length;
        this.currentAudioData.dominantFrequency = Math.round(dominantFreq);

        // Analyze tone based on frequency ranges
        this.currentAudioData.toneAnalysis = this.analyzeTone(dominantFreq, averageVolume);

        this.updateUI();
        this.visualizeAudio();

        // Send to plant AI every 30 seconds
        const now = Date.now();
        if (now - this.lastProcessTime > 30000) {
            this.sendToPlantAI();
            this.lastProcessTime = now;
        }

        requestAnimationFrame(() => this.analyzeAudio());
    }

    analyzeTone(frequency, volume) {
        if (volume < 10) return 'quiet';
        if (frequency < 100) return 'deep';
        if (frequency < 300) return 'low';
        if (frequency < 1000) return 'mid';
        if (frequency < 3000) return 'high';
        return 'very-high';
    }

    visualizeAudio() {
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const barWidth = width / this.dataArray.length * 2.5;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * height;
            
            const r = barHeight + 25 * (i / this.dataArray.length);
            const g = 250 * (i / this.dataArray.length);
            const b = 50;

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    updateUI() {
        document.getElementById('speechText').textContent = 
            this.currentAudioData.speech || 'Listening...';
        document.getElementById('dominantFreq').textContent = 
            `${this.currentAudioData.dominantFrequency} Hz`;
        document.getElementById('volumeLevel').textContent = 
            `${this.currentAudioData.volumeLevel}/255`;
        document.getElementById('toneAnalysis').textContent = 
            this.currentAudioData.toneAnalysis;
    }

    async sendToPlantAI() {
        if (window.plant) {
            const audioData = {
                ...this.currentAudioData,
                timestamp: Date.now()
            };
            
            await window.plant.processAudioData(audioData);
            
            // Reset speech after processing
            this.currentAudioData.speech = '';
        }
    }
}

// Initialize the audio analyzer when the page loads
window.addEventListener('load', () => {
    window.audioAnalyzer = new AudioAnalyzer();
});

