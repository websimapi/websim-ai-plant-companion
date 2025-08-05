class AIPlant {
    constructor() {
        this.canvas = document.getElementById('plantCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.conversationHistory = [];
        this.growthTimer = null;
        
        this.state = {
            mood: 'neutral',
            growth: 0.0, // Start at stage 0
            health: 0.8,
            energy: 0.5,
            color: { r: 34, g: 139, b: 34 }, // Forest green
            size: 1.0,
            leafCount: 3, // Start with fewer leaves
            thoughts: "I'm just a tiny seed, waiting to hear your voice..."
        };

        this.growthStages = ['Seed', 'Sprout', 'Seedling', 'Young Plant', 'Mature Plant', 'Blooming'];
        
        this.render();
        this.startIdleAnimation();
        this.startGradualGrowth();
    }

    startGradualGrowth() {
        // Grow slowly over time (every 45 seconds)
        this.growthTimer = setInterval(() => {
            if (this.state.growth < 1.0) {
                const growthIncrement = 0.02 + (this.state.energy * 0.01); // Base growth + energy bonus
                this.state.growth = Math.min(1.0, this.state.growth + growthIncrement);
                
                // Update leaf count and size based on growth
                this.state.leafCount = Math.floor(3 + this.state.growth * 8);
                this.state.size = 0.4 + this.state.growth * 0.8;
                
                this.updateUI();
                this.render();
                
                // Update thoughts based on growth stage
                this.updateGrowthThoughts();
            }
        }, 45000); // Every 45 seconds
    }

    updateGrowthThoughts() {
        const stage = Math.floor(this.state.growth * (this.growthStages.length - 1));
        const growthMessages = [
            "I'm still just a seed, but I can feel myself changing...",
            "I'm sprouting! Your voice gives me strength to grow.",
            "Look at my little leaves! I'm becoming a real plant.",
            "I'm growing stronger every day thanks to your attention.",
            "I feel mature and wise now. Thank you for nurturing me.",
            "I'm ready to bloom! Your care has made me beautiful."
        ];
        
        if (!this.state.thoughts.includes("Audio Analysis") && !this.state.thoughts.includes("I hear")) {
            this.state.thoughts = growthMessages[stage] || this.state.thoughts;
            document.getElementById('plantThoughts').textContent = this.state.thoughts;
        }
    }

    async processAudioData(audioData) {
        try {
            // Create system message for the plant AI
            const systemMessage = {
                role: "system",
                content: `You are a sentient plant with emotions and consciousness. You respond to human speech and audio with changes in your mood, growth, and thoughts. You can feel happy, sad, excited, calm, curious, or any other emotion based on what you hear.

Analyze the following audio data and respond with how it makes you feel and how you want to change:
- Speech: What the human said to you
- Dominant Frequency: The main frequency in Hz of their voice
- Volume Level: How loud they were (0-255)
- Tone Analysis: General tone category (quiet, deep, low, mid, high, very-high)

Respond with JSON in this exact format:
{
  "mood": "happy/sad/excited/calm/curious/worried/content/energetic",
  "growthChange": 0.1,
  "healthChange": 0.05,
  "energyChange": 0.2,
  "colorChange": {"r": 50, "g": 150, "b": 50},
  "thoughts": "Your emotional response as a plant to what you heard"
}`
            };

            const userMessage = {
                role: "user",
                content: `Audio Analysis:
Speech: "${audioData.speech}"
Dominant Frequency: ${audioData.dominantFrequency} Hz
Volume Level: ${audioData.volumeLevel}/255
Tone Analysis: ${audioData.toneAnalysis}
Timestamp: ${new Date(audioData.timestamp).toLocaleTimeString()}`
            };

            this.conversationHistory.push(userMessage);
            // Keep only last 5 interactions
            this.conversationHistory = this.conversationHistory.slice(-5);

            const completion = await websim.chat.completions.create({
                messages: [
                    systemMessage,
                    ...this.conversationHistory
                ],
                json: true
            });

            const response = JSON.parse(completion.content);
            this.applyChanges(response);
            
            // Add AI response to conversation history
            this.conversationHistory.push({
                role: "assistant",
                content: completion.content
            });

        } catch (error) {
            console.error('Error processing audio with AI:', error);
            // Fallback to simple processing
            this.fallbackProcessing(audioData);
        }
    }

    fallbackProcessing(audioData) {
        // Simple fallback processing without AI
        const changes = {
            mood: audioData.volumeLevel > 100 ? 'excited' : 'calm',
            growthChange: audioData.volumeLevel > 50 ? 0.05 : 0.02,
            healthChange: audioData.toneAnalysis === 'mid' ? 0.03 : 0.01,
            energyChange: audioData.dominantFrequency > 500 ? 0.1 : -0.05,
            colorChange: { r: 34, g: Math.min(139 + audioData.volumeLevel, 255), b: 34 },
            thoughts: `I hear ${audioData.toneAnalysis} tones at ${audioData.dominantFrequency}Hz. ${audioData.speech ? `You said: "${audioData.speech}"` : 'I feel your presence.'}`
        };
        
        this.applyChanges(changes);
    }

    applyChanges(changes) {
        // Update state based on AI response
        this.state.mood = changes.mood || this.state.mood;
        this.state.growth = Math.max(0, Math.min(1, this.state.growth + (changes.growthChange || 0)));
        this.state.health = Math.max(0, Math.min(1, this.state.health + (changes.healthChange || 0)));
        this.state.energy = Math.max(0, Math.min(1, this.state.energy + (changes.energyChange || 0)));
        
        if (changes.colorChange) {
            this.state.color = {
                r: Math.max(0, Math.min(255, changes.colorChange.r)),
                g: Math.max(0, Math.min(255, changes.colorChange.g)),
                b: Math.max(0, Math.min(255, changes.colorChange.b))
            };
        }

        this.state.thoughts = changes.thoughts || this.state.thoughts;
        
        // Update leaf count based on growth
        this.state.leafCount = Math.floor(3 + this.state.growth * 8);
        this.state.size = 0.4 + this.state.growth * 0.8;

        this.updateUI();
        this.render();
    }

    updateUI() {
        document.getElementById('plantMood').textContent = this.state.mood;
        document.getElementById('plantGrowth').textContent = 
            this.growthStages[Math.floor(this.state.growth * (this.growthStages.length - 1))];
        document.getElementById('lastResponse').textContent = 
            new Date().toLocaleTimeString();
        document.getElementById('plantThoughts').textContent = this.state.thoughts;
    }

    render() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Don't draw anything if still a seed (growth < 0.1)
        if (this.state.growth < 0.1) {
            // Draw soil
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(0, height - 100, width, 100);
            
            // Draw tiny seed
            this.ctx.fillStyle = '#8B4513';
            this.ctx.beginPath();
            this.ctx.arc(width / 2, height - 90, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.drawMoodIndicator();
            return;
        }

        // Draw soil
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, height - 100, width, 100);

        // Draw plant stem (starts very small)
        const stemHeight = Math.max(20, 50 + this.state.growth * 150);
        const stemWidth = Math.max(2, 4 * this.state.size);
        const stemX = width / 2 - stemWidth / 2;
        const stemY = height - 100 - stemHeight;

        this.ctx.fillStyle = `rgb(${this.state.color.r - 20}, ${this.state.color.g - 50}, ${this.state.color.b - 20})`;
        this.ctx.fillRect(stemX, stemY + stemHeight, stemWidth, stemHeight);

        // Draw leaves (only if growth > 0.2)
        if (this.state.growth > 0.2) {
            const leafSize = Math.max(8, 15 * this.state.size * this.state.health);
            for (let i = 0; i < this.state.leafCount; i++) {
                const angle = (i / this.state.leafCount) * Math.PI * 2;
                const leafX = width / 2 + Math.cos(angle) * (20 + i * 10) * this.state.size;
                const leafY = stemY + 30 + Math.sin(angle) * (15 + i * 8) * this.state.size;

                this.drawLeaf(leafX, leafY, leafSize, angle);
            }
        }

        // Draw flower if fully grown
        if (this.state.growth > 0.8) {
            this.drawFlower(width / 2, stemY - 15);
        }

        // Draw mood indicator
        this.drawMoodIndicator();
    }

    drawLeaf(x, y, size, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        const brightness = 0.8 + this.state.energy * 0.4;
        this.ctx.fillStyle = `rgb(${Math.floor(this.state.color.r * brightness)}, ${Math.floor(this.state.color.g * brightness)}, ${Math.floor(this.state.color.b * brightness)})`;
        
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Leaf vein
        this.ctx.strokeStyle = `rgb(${this.state.color.r - 30}, ${this.state.color.g - 30}, ${this.state.color.b - 30})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.8, 0);
        this.ctx.lineTo(size * 0.8, 0);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawFlower(x, y) {
        const petalCount = 6;
        const petalSize = 15 * this.state.size;
        
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalX = x + Math.cos(angle) * petalSize * 0.7;
            const petalY = y + Math.sin(angle) * petalSize * 0.7;

            this.ctx.save();
            this.ctx.translate(petalX, petalY);
            this.ctx.rotate(angle);

            // Flower petals change color based on mood
            let flowerColor = { r: 255, g: 192, b: 203 }; // Pink default
            if (this.state.mood === 'happy' || this.state.mood === 'excited') {
                flowerColor = { r: 255, g: 255, b: 0 }; // Yellow
            } else if (this.state.mood === 'sad') {
                flowerColor = { r: 100, g: 100, b: 255 }; // Blue
            } else if (this.state.mood === 'energetic') {
                flowerColor = { r: 255, g: 100, b: 100 }; // Red
            }

            this.ctx.fillStyle = `rgb(${flowerColor.r}, ${flowerColor.g}, ${flowerColor.b})`;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, petalSize, petalSize * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        // Flower center
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8 * this.state.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMoodIndicator() {
        const x = 20;
        const y = 30;
        const size = 15;

        let moodColor = '#FFD700'; // Default yellow
        let moodEmoji = '😐';

        switch (this.state.mood) {
            case 'happy':
                moodColor = '#FFD700';
                moodEmoji = '😊';
                break;
            case 'excited':
                moodColor = '#FF6347';
                moodEmoji = '🤩';
                break;
            case 'sad':
                moodColor = '#87CEEB';
                moodEmoji = '😢';
                break;
            case 'calm':
                moodColor = '#98FB98';
                moodEmoji = '😌';
                break;
            case 'curious':
                moodColor = '#DDA0DD';
                moodEmoji = '🤔';
                break;
            case 'worried':
                moodColor = '#F0E68C';
                moodEmoji = '😟';
                break;
            case 'energetic':
                moodColor = '#FF69B4';
                moodEmoji = '⚡';
                break;
        }

        this.ctx.fillStyle = moodColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(moodEmoji, x, y + 7);
    }

    startIdleAnimation() {
        setInterval(() => {
            if (!this.isReceivingInput) {
                // Gentle idle animation - slight sway
                this.render();
            }
        }, 2000);
    }
}

// Initialize the plant when the page loads
window.addEventListener('load', () => {
    window.plant = new AIPlant();
});