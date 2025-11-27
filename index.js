class SoccerStars {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state - DATA STRUCTURE: Object representing game state
        this.gameState = {
            currentTeam: 0, // 0: blue, 1: red
            score: [0, 0],
            turnTime: 15,
            isMoving: false,
            selectedPlayer: null,
            dragStart: null,
            power: 0,
            players: [],
            ball: null,
            moveHistory: []
        };
        
        this.init();
        this.setupEventListeners();
        this.gameLoop();
        this.startTurnTimer();
    }

    init() {
        this.resetGame();
    }

    resetGame() {
        this.gameState.score = [0, 0];
        this.gameState.currentTeam = 0;
        this.gameState.isMoving = false;
        this.gameState.selectedPlayer = null;
        this.gameState.power = 0;
        this.gameState.moveHistory = [];
        
        this.createPlayers();
        this.createBall();
        this.updateUI();
    }

    // DATA STRUCTURE: Array of player objects with properties
    createPlayers() {
        this.gameState.players = [];
        
        // Blue team (left side)
        const blueFormation = [
            { x: 150, y: 150 }, { x: 150, y: 250 }, { x: 150, y: 350 },
            { x: 200, y: 200 }, { x: 200, y: 300 }
        ];
        
        // Red team (right side)  
        const redFormation = [
            { x: 650, y: 150 }, { x: 650, y: 250 }, { x: 650, y: 350 },
            { x: 600, y: 200 }, { x: 600, y: 300 }
        ];
        
        blueFormation.forEach(pos => {
            this.gameState.players.push({
                x: pos.x,
                y: pos.y,
                radius: 15,
                color: '#3498db',
                team: 0,
                velocity: { x: 0, y: 0 },
                mass: 1
            });
        });
        
        redFormation.forEach(pos => {
            this.gameState.players.push({
                x: pos.x,
                y: pos.y,
                radius: 15,
                color: '#e74c3c',
                team: 1,
                velocity: { x: 0, y: 0 },
                mass: 1
            });
        });
    }

    createBall() {
        this.gameState.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 12,
            color: 'white',
            velocity: { x: 0, y: 0 },
            mass: 0.5
        };
    }

    // DIGITAL LOGIC: Event handling with state checks
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleMouseDown(e) {
        if (this.gameState.isMoving) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.startDrag(x, y);
    }

    handleMouseMove(e) {
        if (!this.gameState.selectedPlayer || this.gameState.isMoving) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.updateDrag(x, y);
    }

    handleMouseUp(e) {
        if (!this.gameState.selectedPlayer || this.gameState.isMoving) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.endDrag(x, y);
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (this.gameState.isMoving) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.startDrag(x, y);
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.gameState.selectedPlayer || this.gameState.isMoving) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.updateDrag(x, y);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.gameState.selectedPlayer || this.gameState.isMoving) return;
        
        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.endDrag(x, y);
    }

    // ALGORITHM: Player selection with team validation
    startDrag(x, y) {
        const player = this.getPlayerAt(x, y);
        if (player && player.team === this.gameState.currentTeam) {
            this.gameState.selectedPlayer = player;
            this.gameState.dragStart = { x, y };
            this.gameState.power = 0;
        }
    }

    updateDrag(x, y) {
        if (!this.gameState.selectedPlayer || !this.gameState.dragStart) return;
        
        const dx = this.gameState.dragStart.x - x;
        const dy = this.gameState.dragStart.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate power (capped at maximum)
        this.gameState.power = Math.min(distance / 5, 100);
        document.getElementById('powerFill').style.width = this.gameState.power + '%';
    }

    endDrag(x, y) {
        if (!this.gameState.selectedPlayer || !this.gameState.dragStart) return;
        
        // ALGORITHM: Physics calculation for flick
        const dx = this.gameState.dragStart.x - x;
        const dy = this.gameState.dragStart.y - y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, 100);
        
        if (power > 5) { // Minimum power threshold
            this.saveMoveToHistory();
            
            // Apply velocity to player
            const angle = Math.atan2(dy, dx);
            this.gameState.selectedPlayer.velocity.x = Math.cos(angle) * power * 0.5;
            this.gameState.selectedPlayer.velocity.y = Math.sin(angle) * power * 0.5;
            
            this.gameState.isMoving = true;
        }
        
        this.gameState.selectedPlayer = null;
        this.gameState.dragStart = null;
        this.gameState.power = 0;
        document.getElementById('powerFill').style.width = '0%';
    }

    // ALGORITHM: Complex physics simulation
    updatePhysics() {
        let allStopped = true;
        const friction = 0.96;
        const minVelocity = 0.1;

        // Update players
        this.gameState.players.forEach(player => {
            if (Math.abs(player.velocity.x) > minVelocity || Math.abs(player.velocity.y) > minVelocity) {
                allStopped = false;
                
                // Apply velocity
                player.x += player.velocity.x;
                player.y += player.velocity.y;
                
                // Apply friction
                player.velocity.x *= friction;
                player.velocity.y *= friction;
                
                // Boundary collision
                this.handleBoundaryCollision(player);
            }
        });

        // Update ball
        if (Math.abs(this.gameState.ball.velocity.x) > minVelocity || 
            Math.abs(this.gameState.ball.velocity.y) > minVelocity) {
            allStopped = false;
            
            this.gameState.ball.x += this.gameState.ball.velocity.x;
            this.gameState.ball.y += this.gameState.ball.velocity.y;
            
            this.gameState.ball.velocity.x *= friction;
            this.gameState.ball.velocity.y *= friction;
            
            this.handleBoundaryCollision(this.gameState.ball);
        }

        // ALGORITHM: Collision detection between all entities
        this.handleCollisions();

        // Check if everything stopped moving
        if (allStopped && this.gameState.isMoving) {
            this.gameState.isMoving = false;
            this.nextTurn();
        }

        // Check for goals
        this.checkGoals();
    }

    // ALGORITHM: Boundary collision handling
    handleBoundaryCollision(entity) {
        // Top and bottom boundaries
        if (entity.y - entity.radius < 0) {
            entity.y = entity.radius;
            entity.velocity.y *= -0.8;
        } else if (entity.y + entity.radius > this.canvas.height) {
            entity.y = this.canvas.height - entity.radius;
            entity.velocity.y *= -0.8;
        }

        // Left and right boundaries (goals are in the middle of sides)
        const goalTop = 200;
        const goalBottom = 300;
        
        if (entity.x - entity.radius < 0) {
            if (entity.y < goalTop || entity.y > goalBottom) {
                entity.x = entity.radius;
                entity.velocity.x *= -0.8;
            }
        } else if (entity.x + entity.radius > this.canvas.width) {
            if (entity.y < goalTop || entity.y > goalBottom) {
                entity.x = this.canvas.width - entity.radius;
                entity.velocity.x *= -0.8;
            }
        }
    }

    // ALGORITHM: Complex collision detection between all entities
    handleCollisions() {
        // Check player-player collisions
        for (let i = 0; i < this.gameState.players.length; i++) {
            for (let j = i + 1; j < this.gameState.players.length; j++) {
                this.resolveCollision(this.gameState.players[i], this.gameState.players[j]);
            }
            
            // Check player-ball collisions
            this.resolveCollision(this.gameState.players[i], this.gameState.ball);
        }
    }

    // ALGORITHM: Physics-based collision resolution
    resolveCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = a.radius + b.radius;

        if (distance < minDistance) {
            // Collision detected - ALGORITHM: Elastic collision physics
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            // Rotate velocity vectors
            const v1 = this.rotateVector(a.velocity, sin, cos);
            const v2 = this.rotateVector(b.velocity, sin, cos);

            // Collision reaction (conservation of momentum)
            const m1 = a.mass;
            const m2 = b.mass;
            const u1 = v1.x;
            const u2 = v2.x;

            const v1x = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2);
            const v2x = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2);

            // Update velocities
            v1.x = v1x * 0.8; // Energy loss
            v2.x = v2x * 0.8;

            // Rotate velocities back
            a.velocity = this.rotateVector(v1, -sin, cos);
            b.velocity = this.rotateVector(v2, -sin, cos);

            // Separate entities to prevent sticking
            const overlap = minDistance - distance;
            const moveX = (overlap * cos) / 2;
            const moveY = (overlap * sin) / 2;

            a.x += moveX;
            a.y += moveY;
            b.x -= moveX;
            b.y -= moveY;
        }
    }

    // ALGORITHM: Vector rotation for collision physics
    rotateVector(vector, sin, cos) {
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos
        };
    }

    // ALGORITHM: Goal detection with position checking
    checkGoals() {
        const ball = this.gameState.ball;
        const goalWidth = 10;
        const goalHeight = 100;
        const goalTop = 200;
        const goalBottom = 300;

        // Left goal (Red scores)
        if (ball.x - ball.radius < goalWidth && 
            ball.y > goalTop && ball.y < goalBottom) {
            this.scoreGoal(1);
        }
        // Right goal (Blue scores)
        else if (ball.x + ball.radius > this.canvas.width - goalWidth && 
                 ball.y > goalTop && ball.y < goalBottom) {
            this.scoreGoal(0);
        }
    }

    scoreGoal(team) {
        this.gameState.score[team]++;
        this.showGoalAnimation();
        this.updateUI();
        
        // Reset positions after goal
        setTimeout(() => {
            this.createPlayers();
            this.createBall();
            this.gameState.isMoving = false;
        }, 2000);
    }

    showGoalAnimation() {
        const animation = document.getElementById('goalAnimation');
        animation.style.opacity = '1';
        animation.style.transform = 'translate(-50%, -50%) scale(1.5)';
        
        setTimeout(() => {
            animation.style.opacity = '0';
            animation.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 1500);
    }

    nextTurn() {
        // DIGITAL LOGIC: State transition
        this.gameState.currentTeam = 1 - this.gameState.currentTeam;
        this.updateUI();
        this.resetTurnTimer();
    }

    // DATA STRUCTURE: Stack for undo functionality
    saveMoveToHistory() {
        this.gameState.moveHistory.push({
            players: JSON.parse(JSON.stringify(this.gameState.players)),
            ball: JSON.parse(JSON.stringify(this.gameState.ball)),
            score: [...this.gameState.score],
            currentTeam: this.gameState.currentTeam
        });

        // Keep history limited
        if (this.gameState.moveHistory.length > 5) {
            this.gameState.moveHistory.shift();
        }
    }

    undoMove() {
        if (this.gameState.moveHistory.length > 0 && !this.gameState.isMoving) {
            const previousState = this.gameState.moveHistory.pop();
            this.gameState.players = previousState.players;
            this.gameState.ball = previousState.ball;
            this.gameState.score = previousState.score;
            this.gameState.currentTeam = previousState.currentTeam;
            this.updateUI();
        }
    }

    startTurnTimer() {
        setInterval(() => {
            if (this.gameState.isMoving) return;
            
            this.gameState.turnTime--;
            document.getElementById('timer').textContent = `Turn Time: ${this.gameState.turnTime}s`;
            
            if (this.gameState.turnTime <= 0) {
                this.nextTurn();
            }
        }, 1000);
    }

    resetTurnTimer() {
        this.gameState.turnTime = 15;
    }

    updateUI() {
        document.getElementById('scoreBlue').textContent = this.gameState.score[0];
        document.getElementById('scoreRed').textContent = this.gameState.score[1];
        
        const teamNames = ['Blue Team', 'Red Team'];
        const teamColors = ['#3498db', '#e74c3c'];
        
        document.getElementById('turnIndicator').textContent = `${teamNames[this.gameState.currentTeam]}'s Turn`;
        document.getElementById('turnIndicator').style.color = teamColors[this.gameState.currentTeam];
    }

    // ALGORITHM: Player selection with spatial search
    getPlayerAt(x, y) {
        for (let i = 0; i < this.gameState.players.length; i++) {
            const player = this.gameState.players[i];
            const dx = x - player.x;
            const dy = y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= player.radius) {
                return player;
            }
        }
        return null;
    }

    drawField() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Field background
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(0, 0, width, height);

        // Field markings
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // Center line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Goals
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, 200, 10, 100); // Left goal
        ctx.fillRect(width - 10, 200, 10, 100); // Right goal

        // Goal outlines
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 200, 10, 100);
        ctx.strokeRect(width - 10, 200, 10, 100);
    }

    drawPlayers() {
        this.gameState.players.forEach(player => {
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight current team's players
            if (player.team === this.gameState.currentTeam && !this.gameState.isMoving) {
                this.ctx.strokeStyle = 'gold';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }

            // Draw drag line
            if (this.gameState.selectedPlayer === player && this.gameState.dragStart) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(player.x, player.y);
                this.ctx.lineTo(this.gameState.dragStart.x, this.gameState.dragStart.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Draw power indicator
                const angle = Math.atan2(
                    this.gameState.dragStart.y - player.y,
                    this.gameState.dragStart.x - player.x
                );
                const powerLength = this.gameState.power * 2;
                
                this.ctx.strokeStyle = `hsl(${this.gameState.power * 1.2}, 100%, 50%)`;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(player.x, player.y);
                this.ctx.lineTo(
                    player.x + Math.cos(angle) * powerLength,
                    player.y + Math.sin(angle) * powerLength
                );
                this.ctx.stroke();
            }
        });
    }

    drawBall() {
        const ball = this.gameState.ball;
        
        // Ball shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Ball body
        this.ctx.fillStyle = ball.color;
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Ball pattern
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const x1 = ball.x + Math.cos(angle) * ball.radius * 0.7;
            const y1 = ball.y + Math.sin(angle) * ball.radius * 0.7;
            const x2 = ball.x + Math.cos(angle + Math.PI) * ball.radius * 0.7;
            const y2 = ball.y + Math.sin(angle + Math.PI) * ball.radius * 0.7;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawField();
        
        if (this.gameState.isMoving) {
            this.updatePhysics();
        }
        
        this.drawPlayers();
        this.drawBall();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
window.addEventListener('load', () => {
    window.game = new SoccerStars();
});