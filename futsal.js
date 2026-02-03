// Global variables
var width, height, engine, mysteryBox, mysteryBoxTurn, gameState, lastMysteryBoxSpawn, storedPowerup, sizePower, opponentSlowed, players, ball, lastPowerupGiven;

// ✅ LISTEN FOR VS ANIMATION BEFORE DOMContentLoaded
var vsAnimationCompleted = false;
document.addEventListener("vsAnimationFinished", function () {
    vsAnimationCompleted = true;
    console.log("VS Animation finished - Ready to show RED TURN!");

    // Only trigger if game is already initialized
    if (typeof gameState !== 'undefined' && typeof showTurnAnimation === 'function') {
        showTurnAnimation('red');
    }
});

document.addEventListener("DOMContentLoaded", function () {
    var container = document.querySelector('.futsal');
    if (container) {
        var w = container.clientWidth;
        var h = container.clientHeight;
        if (w === 0 || h === 0) {
            alert("CRITICAL ERROR: The game field has 0 size! The players cannot be seen.");
            container.style.width = "100%";
            container.style.height = "600px";
        }
    }

    // Pause menu functionality
    const menuBtn = document.querySelector('.menu');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');

    // Pause overlay (activated from menu or ESC key)
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pauseGame();
            if (pauseOverlay) {
                pauseOverlay.classList.remove('hidden');
            }
            if (window.musicManager) {
                window.musicManager.playSound('./audio/pause.mp3', 0.6);
            }
        });
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            if (pauseOverlay) {
                pauseOverlay.classList.add('hidden');
            }
            resumeGame();
            if (window.musicManager) {
                window.musicManager.playSound('./audio/unpause.mp3', 0.6);
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (pauseOverlay) {
                pauseOverlay.classList.add('hidden');
            }
            resumeGame();
            resetGame();
            if (window.musicManager) {
                window.musicManager.playSound('./audio/unpause.mp3', 0.6);
            }
        });
    }

    // ESC key to pause
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pauseOverlay) {
            if (pauseOverlay.classList.contains('hidden')) {
                pauseGame();
                pauseOverlay.classList.remove('hidden');
                if (window.musicManager) {
                    window.musicManager.playSound('./audio/pause.mp3', 0.6);
                }
            } else {
                pauseOverlay.classList.add('hidden');
                resumeGame();
                if (window.musicManager) {
                    window.musicManager.playSound('./audio/unpause.mp3', 0.6);
                }
            }
        }
    });

    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Events = Matter.Events,
        Vector = Matter.Vector,
        Body = Matter.Body;

    mysteryBox = null;
    mysteryBoxTurn = null;
    lastMysteryBoxSpawn = 0;
    lastPowerupGiven = null;

    storedPowerup = {
        red: false,
        blue: false
    };

    sizePower = {
        red: false,
        blue: false
    };

    var urlParams = new URLSearchParams(window.location.search);
    var targetGoals = parseInt(urlParams.get('goals')) || 3;

    gameState = {
        turn: 'red',
        isTurnActive: false,
        score: { red: 0, blue: 0 },
        canShoot: true,
        turnCount: 0,
        maxGoals: targetGoals,
        isPaused: false,
        currentFormation: '2-2'
    };

    opponentSlowed = { red: false, blue: false };

    // --- DOM ELEMENTS ---
    var scoreRedEl = document.querySelector('.red-score');
    var scoreBlueEl = document.querySelector('.blue-score');
    var turnIndicator = document.querySelector('.turn p');
    var leftScoreEl = document.querySelector('.left-score');
    var rightScoreEl = document.querySelector('.right-score');

    container = document.querySelector('.futsal');
    width = container.clientWidth;
    height = container.clientHeight;

    engine = Engine.create();
    engine.world.gravity.y = 0;

    var render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent',
            pixelRatio: window.devicePixelRatio || 1
        }
    });

    var WALL_THICKNESS = 10;
    var PLAYER_RADIUS = 28;
    var BALL_RADIUS = 20;
    var GOAL_WIDTH = 120;
    var GOAL_DEPTH = 40;

    players = [];
    ball = null;

    var defaultCategory = 0x0001;

    var fieldMarginX = width * 0.065;
    var fieldMarginY = height * 0.08;
    var goalDepthOffset = 25;

    // Create walls with proper collision boundaries
    var walls = [
        // Top wall
        Bodies.rectangle(width / 2, fieldMarginY + 20, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallTop',
            render: { fillStyle: 'tansparent' }
        }),
        // Bottom wall
        Bodies.rectangle(width / 2, height - fieldMarginY - 13, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallBottom',
            render: { fillStyle: 'tansparent' }
        }),
        // Left wall segments (above and below goal)
        Bodies.rectangle(fieldMarginX + 102, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true,
            label: 'WallLeftTop',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(fieldMarginX + 102, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 10, {
            isStatic: true,
            label: 'WallLeftBottom',
            render: { fillStyle: 'tansparent' }
        }),
        // Right wall segments (above and below goal)
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true,
            label: 'WallRightTop',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 12, {
            isStatic: true,
            label: 'WallRightBottom',
            render: { fillStyle: 'tansparent' }
        }),
        // Left goal walls
        Bodies.rectangle(fieldMarginX - goalDepthOffset + 40, (height / 2) + 5, WALL_THICKNESS, GOAL_WIDTH + 50, {
            isStatic: true,
            label: 'LeftGoalBack',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 - GOAL_WIDTH / 2 - 20, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'LeftGoalTop',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 + GOAL_WIDTH / 2 + 27, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'LeftGoalBottom',
            render: { fillStyle: 'tansparent' }
        }),
        // Right goal walls
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset - 40, height / 2 + 5, WALL_THICKNESS, GOAL_WIDTH + 60, {
            isStatic: true,
            label: 'RightGoalBack',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 - GOAL_WIDTH / 2 - 18, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'RightGoalTop',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 + GOAL_WIDTH / 2 + 28, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'RightGoalBottom',
            render: { fillStyle: 'tansparent' }
        }),
        // Corner walls
        Bodies.rectangle(fieldMarginX / 2 + 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerTopLeft',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerTopRight',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(fieldMarginX / 2 + 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerBottomLeft',
            render: { fillStyle: 'tansparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerBottomRight',
            render: { fillStyle: 'tansparent' }
        })
    ];

    // Goal sensors
    var goalLeft = Bodies.rectangle(fieldMarginX + 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true,
        isSensor: true,
        label: 'GoalLeft',
        render: { fillStyle: 'tansparent' }
    });

    var goalRight = Bodies.rectangle(width - fieldMarginX - 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true,
        isSensor: true,
        label: 'GoalRight',
        render: { fillStyle: 'tansparent' }
    });

    Composite.add(engine.world, [...walls, goalLeft, goalRight]);

    function createPlayer(x, y, team) {
        var isRed = team === 'red';
        var texture = isRed ? 'img/red-player.png' : 'img/blue-player.png';
        var body = Bodies.circle(x, y, PLAYER_RADIUS, {
            label: team + 'Player',
            restitution: 0.99,
            frictionAir: 0.008,
            friction: 0.001,
            density: 0.002,
            render: {
                sprite: {
                    texture: texture,
                    xScale: 0.22,
                    yScale: 0.22
                },
                fillStyle: team === 'red' ? '#ff0000' : '#0000ff'
            }
        });
        body.team = team;
        body.baseRadius = PLAYER_RADIUS;
        return body;
    }

    function createBall(x, y) {
        return Bodies.circle(x, y, BALL_RADIUS, {
            label: 'Ball',
            restitution: 0.99,
            frictionAir: 0.008,
            friction: 0.001,
            density: 0.0008,
            render: {
                fillStyle: '#ffffff',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
    }

    // Formation system
    var formations = {
        '2-2': {
            name: '2-2 Square',
            getPositions: function (isRed, width, height, fieldMarginX) {
                var baseX = isRed ? fieldMarginX + 80 : width - fieldMarginX - 80;
                var midX = isRed ? width * 0.3 : width * 0.7;
                var forwardDir = isRed ? 1 : -1;

                return [
                    { x: baseX - 10, y: height / 2 },
                    { x: midX - (50 * forwardDir), y: height / 2 - 100 },
                    { x: midX - (50 * forwardDir), y: height / 2 + 100 },
                    { x: midX + (80 * forwardDir), y: height / 2 - 60 },
                    { x: midX + (80 * forwardDir), y: height / 2 + 60 }
                ];
            }
        },
        '1-2-1': {
            name: '1-2-1 Diamond',
            getPositions: function (isRed, width, height, fieldMarginX) {
                var baseX = isRed ? fieldMarginX + 80 : width - fieldMarginX - 80;
                var midX = isRed ? width * 0.3 : width * 0.7;
                var forwardDir = isRed ? 1 : -1;

                return [
                    { x: baseX, y: height / 2 },
                    { x: midX - (60 * forwardDir), y: height / 2 },
                    { x: midX, y: height / 2 - 120 },
                    { x: midX, y: height / 2 + 120 },
                    { x: midX + (80 * forwardDir), y: height / 2 }
                ];
            }
        },
        '3-1': {
            name: '3-1 Defensive',
            getPositions: function (isRed, width, height, fieldMarginX) {
                var baseX = isRed ? fieldMarginX + 80 : width - fieldMarginX - 80;
                var midX = isRed ? width * 0.3 : width * 0.7;
                var forwardDir = isRed ? 1 : -1;

                return [
                    { x: baseX, y: height / 2 },
                    { x: midX - (80 * forwardDir), y: height / 2 - 80 },
                    { x: midX - (80 * forwardDir), y: height / 2 + 80 },
                    { x: midX - (40 * forwardDir), y: height / 2 },
                    { x: midX + (80 * forwardDir), y: height / 2 }
                ];
            }
        }
    };

    function resetPositions(formationType) {
        var selectedFormation = formationType || gameState.currentFormation || '2-2';

        if (players.length > 0) {
            Composite.remove(engine.world, players);
        }
        if (ball) {
            Composite.remove(engine.world, ball);
        }
        players = [];

        var redPositions = formations[selectedFormation].getPositions(true, width, height, fieldMarginX);
        redPositions.forEach(pos => {
            players.push(createPlayer(pos.x, pos.y, 'red'));
        });

        var bluePositions = formations[selectedFormation].getPositions(false, width, height, fieldMarginX);
        bluePositions.forEach(pos => {
            players.push(createPlayer(pos.x, pos.y, 'blue'));
        });

        ball = createBall(width / 2, height / 2);

        Composite.add(engine.world, [...players, ball]);

        gameState.isTurnActive = false;
        gameState.canShoot = true;
        updateTurnDisplay();
    }

    // Mouse/Touch input handling
    var dragStart = null;
    var selectedBody = null;
    var currentMousePos = null;

    render.canvas.addEventListener('mousedown', function (e) { handleInputStart(e); });
    render.canvas.addEventListener('touchstart', function (e) { handleInputStart(e); });
    render.canvas.addEventListener('mousemove', function (e) { handleMouseMove(e); });
    render.canvas.addEventListener('touchmove', function (e) { handleMouseMove(e); });

    function handleInputStart(e) {
        if (gameState.isPaused) return;
        if (!gameState.canShoot) return;

        var rect = render.canvas.getBoundingClientRect();
        var x = (e.clientX || e.touches[0].clientX) - rect.left;
        var y = (e.clientY || e.touches[0].clientY) - rect.top;

        var bodies = Composite.allBodies(engine.world);
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.team === gameState.turn && Matter.Bounds.contains(b.bounds, { x: x, y: y })) {
                if (Matter.Vertices.contains(b.vertices, { x: x, y: y })) {
                    selectedBody = b;
                    dragStart = { x: x, y: y };

                    if (sizePower[gameState.turn]) {
                        // Apply Giant Powerup - Tuner: 1.5x Size (User requested decrease)
                        var scaleFactor = 1.5;
                        Matter.Body.scale(selectedBody, scaleFactor, scaleFactor);

                        // Increase density for collision power
                        // Normal density is 0.002. Set to 0.01 (5x).
                        // Mass scales with Area * Density. Area scales by 2.25x (1.5*1.5).
                        // Total mass factor = 2.25 * 5 = 11.25x.
                        Matter.Body.setDensity(selectedBody, 0.01);

                        // Update sprite scale
                        if (selectedBody.render.sprite) {
                            selectedBody.render.sprite.xScale *= scaleFactor;
                            selectedBody.render.sprite.yScale *= scaleFactor;
                        }
                        selectedBody.isGiant = true;
                        sizePower[gameState.turn] = false;
                    }

                    currentMousePos = { x: x, y: y };
                    break;
                }
            }
        }
    }

    function handleMouseMove(e) {
        if (!selectedBody || !dragStart) return;

        e.preventDefault();
        var rect = render.canvas.getBoundingClientRect();
        var x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        var y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

        currentMousePos = { x: x, y: y };
    }

    render.canvas.addEventListener('mouseup', function (e) { handleInputEnd(e); });
    render.canvas.addEventListener('touchend', function (e) { handleInputEnd(e); });

    function handleInputEnd(e) {
        if (!selectedBody || !dragStart) return;

        var rect = render.canvas.getBoundingClientRect();
        var clientX = e.clientX;
        var clientY = e.clientY;
        if (!clientX && e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        var x = clientX - rect.left;
        var y = clientY - rect.top;

        var dx = dragStart.x - x;
        var dy = dragStart.y - y;

        var rawDistance = Math.sqrt(dx * dx + dy * dy);

        var baseForce = 0.10;
        var currentMaxForce = baseForce;

        // Apply speed boost powerup - MOAB (Mother of all Boosts)
        // Logic moved inside the shot execution block to prevent wasting it on cancelled drags
        var dragMultiplier = 0.0006;
        if (storedPowerup[gameState.turn]) {
            currentMaxForce = baseForce * 3.0; // Drastic increase
            dragMultiplier = 0.0018; // 3x sensitivity - barely dragging triggers huge power
        }

        if (selectedBody.isGiant) {
            // Mass is ~11.25x normal.
            // User reported it's too fast with 11.25x force.
            // Reducing force multiplier to 8x (approx 70% of mass). 
            // This will make it accelerate slower (feel heavier) but still have huge momentum.
            var forceFactor = 5.0; //this is the change in power, when the giant hits the ball or player the force gets multiplied by 6.
            currentMaxForce *= forceFactor;
            dragMultiplier *= forceFactor;
            console.log(gameState.turn.toUpperCase() + ' GIANT PLAYER! Force scaled by ' + forceFactor);
        }

        // Apply decreased speed if opponent used slow powerup
        if (opponentSlowed[gameState.turn]) {
            currentMaxForce *= 0.15;
            console.log(gameState.turn.toUpperCase() + ' IS SLOWED! Ultra low power.');
        }

        var forceMagnitude = Math.min(rawDistance * dragMultiplier, currentMaxForce);

        if (rawDistance > 0.0005) {
            if (storedPowerup[gameState.turn]) {
                storedPowerup[gameState.turn] = false;
            }

            var normalizedDx = dx / rawDistance;
            var normalizedDy = dy / rawDistance;

            var forceVector = Vector.create(normalizedDx * forceMagnitude, normalizedDy * forceMagnitude);

            Body.applyForce(selectedBody, selectedBody.position, forceVector);

            // Play kick sound
            if (window.musicManager) {
                window.musicManager.playSound('./audio/goal.mp3', 1);
            }

            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        selectedBody = null;
        dragStart = null;
        currentMousePos = null;
    }

    // Rendering overlay graphics
    Events.on(render, 'afterRender', function () {
        var ctx = render.context;

        // Draw mystery box
        if (mysteryBox) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', mysteryBox.position.x, mysteryBox.position.y);
        }

        // Draw powerup indicators
        ['red', 'blue'].forEach(function (team, index) {
            var x = index === 0 ? 40 : width - 40;
            var y = 120;

            if (storedPowerup[team]) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚡', x, y);
            }

            if (sizePower[team]) {
                ctx.fillStyle = '#00FF00';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('👤', x, y + 50);
            }

            // Draw slowed icon (Turtle)
            if (opponentSlowed[team]) {
                ctx.fillStyle = '#8B4513'; // SaddleBrown
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🐢', x, y + 100);
            }
        });

        // Draw aiming arrow and power meter
        if (selectedBody && dragStart && currentMousePos && gameState.canShoot) {
            var dx = dragStart.x - currentMousePos.x;
            var dy = dragStart.y - currentMousePos.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                var arrowLength = Math.min(distance * 2, 150);
                var angle = Math.atan2(dy, dx);
                var endX = selectedBody.position.x + Math.cos(angle) * arrowLength;
                var endY = selectedBody.position.y + Math.sin(angle) * arrowLength;

                var power = Math.min(distance / 100, 1) * 100;

                if (storedPowerup[selectedBody.team]) {
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = '#FFD700';
                } else {
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = selectedBody.team === 'red' ? '#ff0000' : '#0000ff';
                }

                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(selectedBody.position.x, selectedBody.position.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                var headLength = 15;
                var headAngle = Math.PI / 6;
                ctx.fillStyle = selectedBody.team === 'red' ? '#ff0000' : '#0000ff';
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLength * Math.cos(angle - headAngle),
                    endY - headLength * Math.sin(angle - headAngle)
                );
                ctx.lineTo(
                    endX - headLength * Math.cos(angle + headAngle),
                    endY - headLength * Math.sin(angle + headAngle)
                );
                ctx.closePath();
                ctx.fill();

                var meterWidth = 100;
                var meterHeight = 15;
                var meterX = selectedBody.position.x - meterWidth / 2;
                var meterY = selectedBody.position.y - 50;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

                var powerColor = power < 33 ? '#00ff00' : power < 66 ? '#ffff00' : '#ff0000';
                ctx.fillStyle = powerColor;
                ctx.fillRect(meterX, meterY, (meterWidth * power) / 100, meterHeight);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(Math.round(power) + '%', selectedBody.position.x, meterY - 5);
            }
        }
    });

    // Physics update - check if turn is over
    Events.on(engine, 'beforeUpdate', function () {
        if (gameState.isTurnActive && !gameState.isPaused) {
            var totalEnergy = 0;
            var bodies = Composite.allBodies(engine.world);
            for (var i = 0; i < bodies.length; i++) {
                var b = bodies[i];
                if (!b.isStatic) {
                    totalEnergy += b.speed * b.speed + b.angularSpeed * b.angularSpeed;
                }
            }
            if (totalEnergy < 0.01) {
                gameState.isTurnActive = false;
                gameState.canShoot = true;
                switchTurn();
            }
        }
    });

    // Collision detection
    Events.on(engine, 'collisionStart', function (event) {
        var pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
            var bodyA = pairs[i].bodyA;
            var bodyB = pairs[i].bodyB;

            // Goal detection
            if ((bodyA.label === 'Ball' && bodyB.label === 'GoalLeft') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalLeft')) {
                handleGoal('blue');
            } else if ((bodyA.label === 'Ball' && bodyB.label === 'GoalRight') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalRight')) {
                handleGoal('red');
            }

            // Mystery box collection
            if (bodyA.label === 'MysteryBox' && bodyB.label && bodyB.label.includes('Player')) {
                if (bodyB.team) {
                    collectMysteryBox(bodyB.team);
                }
            }
            if (bodyB.label === 'MysteryBox' && bodyA.label && bodyA.label.includes('Player')) {
                if (bodyA.team) {
                    collectMysteryBox(bodyA.team);
                }
            }
        }
    });

    function handleGoal(scoringTeam) {
        gameState.score[scoringTeam]++;

        // Play goal sound
        if (window.musicManager) {
            window.musicManager.playSound('./audio/goal2.mp3', 0.8);
        }

        // Update score displays
        if (scoringTeam === 'red') {
            scoreRedEl.innerText = gameState.score.red;
            // if (leftScoreEl) leftScoreEl.innerText = gameState.score.red;
        } else {
            scoreBlueEl.innerText = gameState.score.blue;
            // if (rightScoreEl) rightScoreEl.innerText = gameState.score.blue;
        }

        showGoalConfetti(scoringTeam);

        // Check for victory
        if (gameState.score[scoringTeam] >= gameState.maxGoals) {
            //  SAVE WINNER TEAM
            localStorage.setItem("winnerTeam", scoringTeam);

            //  GET PLAYER NAMES (already saved earlier by you)
            const player1 = localStorage.getItem("player1") || "Player 1";
            const player2 = localStorage.getItem("player2") || "Player 2";

            //  SAVE WINNER NAME
            if (scoringTeam === "red") {
                localStorage.setItem("winnerName", player1);
            } else {
                localStorage.setItem("winnerName", player2);
            }

            //  GO TO VICTORY PAGE
            setTimeout(function () {
                window.location.href = "victory.html";
            }, 500);

            return;
        }

        // Change formation after goal
        var formationKeys = Object.keys(formations);
        var otherFormations = formationKeys.filter(k => k !== gameState.currentFormation);
        var randomKey = otherFormations[Math.floor(Math.random() * otherFormations.length)];
        gameState.currentFormation = randomKey;

        setTimeout(function () {
            resetPositions(gameState.currentFormation);
        }, 1500);
    }

    function resetGame() {
        // Clear existing entities
        if (players.length > 0) {
            Composite.remove(engine.world, players);
        }
        if (ball) {
            Composite.remove(engine.world, ball);
        }
        if (mysteryBox) {
            Composite.remove(engine.world, mysteryBox);
            mysteryBox = null;
        }
        players = [];

        // Reset to default formation
        var leftTeamX = fieldMarginX + 80;
        var leftMidX = width * 0.3;
        var rightMidX = width * 0.7;
        var rightTeamX = width - fieldMarginX - 80;

        // Create players in default positions
        players.push(createPlayer(leftTeamX, height / 2, 'red'));
        players.push(createPlayer(leftMidX - 50, height / 2 - 100, 'red'));
        players.push(createPlayer(leftMidX - 50, height / 2 + 100, 'red'));
        players.push(createPlayer(leftMidX + 80, height / 2 - 60, 'red'));
        players.push(createPlayer(leftMidX + 80, height / 2 + 60, 'red'));

        players.push(createPlayer(rightTeamX, height / 2, 'blue'));
        players.push(createPlayer(rightMidX + 50, height / 2 - 100, 'blue'));
        players.push(createPlayer(rightMidX + 50, height / 2 + 100, 'blue'));
        players.push(createPlayer(rightMidX - 80, height / 2 - 60, 'blue'));
        players.push(createPlayer(rightMidX - 90, height / 2 + 60, 'blue'));

        ball = createBall(width / 2, height / 2);

        Composite.add(engine.world, [...players, ball]);

        // Reset game state
        gameState.isTurnActive = false;
        gameState.canShoot = true;
        gameState.score.red = 0;
        gameState.score.blue = 0;
        gameState.turn = 'red';
        gameState.turnCount = 0;

        storedPowerup.red = false;
        storedPowerup.blue = false;
        sizePower.red = false;
        sizePower.blue = false;
        opponentSlowed = { red: false, blue: false };
        lastMysteryBoxSpawn = 0;

        gameState.currentFormation = '2-2';

        // Update UI
        scoreRedEl.innerText = gameState.score.red;
        scoreBlueEl.innerText = gameState.score.blue;
        // if (leftScoreEl) leftScoreEl.innerText = gameState.score.red;
        // if (rightScoreEl) rightScoreEl.innerText = gameState.score.blue;
        updateTurnDisplay();

        resetPositions('2-2');
    }

    function switchTurn() {
        // Reset giant players
        var bodies = Composite.allBodies(engine.world);
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.isGiant) {
                var scaleFactor = 1.5; // Must match the factor used in handleInputStart
                Matter.Body.scale(b, 1 / scaleFactor, 1 / scaleFactor);
                Matter.Body.setDensity(b, 0.002); // Reset to normal density
                if (b.render.sprite) {
                    b.render.sprite.xScale /= scaleFactor;
                    b.render.sprite.yScale /= scaleFactor;
                }
                b.isGiant = false;
            }
        }

        // Switch turn
        // Reset slow effect for the team that just finished their turn
        if (opponentSlowed[gameState.turn]) {
            opponentSlowed[gameState.turn] = false;
        }

        gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
        gameState.turnCount++;

        // Remove mystery box if expired (after 2 turns) - Check AFTER incrementing turnCount
        if (mysteryBox && gameState.turnCount > mysteryBoxTurn + 1) {
            Composite.remove(engine.world, mysteryBox);
            mysteryBox = null;
            mysteryBoxTurn = null;
        }

        // Spawn mystery box logic
        if (gameState.turnCount === 3) {
            spawnMysteryBox();
            lastMysteryBoxSpawn = gameState.turnCount;
        } else if (!mysteryBox && gameState.turnCount > lastMysteryBoxSpawn) {
            var turnsSinceLastSpawn = gameState.turnCount - lastMysteryBoxSpawn;
            var minGap = 2 + Math.floor(Math.random() * 2);

            if (turnsSinceLastSpawn >= minGap) {
                spawnMysteryBox();
                lastMysteryBoxSpawn = gameState.turnCount;
            }
        }
        // Time limit check - Game Over after 30 turns
        if (gameState.turnCount > 30) {
            // Get player names
            const player1 = localStorage.getItem("player1") || "Player 1";
            const player2 = localStorage.getItem("player2") || "Player 2";

            // Determine winner based on score
            if (gameState.score.red > gameState.score.blue) {
                // Red wins
                localStorage.setItem("winnerTeam", "red");
                localStorage.setItem("winnerName", player1);
            } else if (gameState.score.blue > gameState.score.red) {
                // Blue wins
                localStorage.setItem("winnerTeam", "blue");
                localStorage.setItem("winnerName", player2);
            } else {
                // Draw
                localStorage.setItem("winnerTeam", "draw");
                localStorage.setItem("winnerName", "Draw");
            }

            // Redirect to victory page
            setTimeout(function () {
                window.location.href = "victory.html";
            }, 500);

            return;
        }

        updateTurnDisplay();
        showTurnAnimation(gameState.turn);
    }

    function updateTurnDisplay() {
        turnIndicator.innerText = gameState.turnCount + "/30";
        turnIndicator.style.color = "white";
    }

    function showTurnAnimation(turn) {
        // Create div for turn indicator
        var turnEl = document.createElement('div');
        turnEl.innerText = turn === 'red' ? '🔴 RED TURN' : '🔵 BLUE TURN';

        // Common styles
        turnEl.style.position = 'fixed';
        turnEl.style.top = '120px';
        turnEl.style.fontSize = '32px';
        turnEl.style.fontWeight = 'bold';
        turnEl.style.padding = '15px 25px';
        turnEl.style.color = 'white';
        turnEl.style.zIndex = 9999;
        turnEl.style.opacity = 1;
        turnEl.style.background = turn === 'red' ? 'crimson' : 'dodgerblue';
        turnEl.style.pointerEvents = 'none'; // prevents clicks blocking

        // Start offscreen & set border-radius correctly
        if (turn === 'red') {
            turnEl.style.left = '-350px';
            turnEl.style.right = '';
            turnEl.style.borderRadius = '0 40px 40px 0';
        } else {
            turnEl.style.right = '-350px';
            turnEl.style.left = '';
            turnEl.style.borderRadius = '40px 0 0 40px';
        }

        document.body.appendChild(turnEl);

        // Animate slide in
        if (turn === 'red') {
            gsap.to(turnEl, { duration: 0.8, left: '10px', ease: "power4.out" });
        } else {
            gsap.to(turnEl, { duration: 0.8, right: '10px', ease: "power4.out" });
        }

        // Fade out after delay
        gsap.to(turnEl, {
            duration: 0.8,
            delay: 1.2,
            opacity: 0,
            onComplete: function () {
                turnEl.remove();
            }
        });

    }

    document.addEventListener("vsAnimationFinished", function () {
        gameState.turn = 'red';
        gameState.turnCount = 0;
        updateTurnDisplay();
        showTurnAnimation('red');
    });

    // Start renderer and physics engine
    Render.run(render);
    var runner = Runner.create();
    Runner.run(runner, engine);

    // Export globals for pause/resume
    window.gameRunner = runner;
    window.gameEngine = engine;
    window.gameState = gameState;

    updateTurnDisplay();
    resetPositions();

    // Check if VS animation already completed before game loaded
    if (vsAnimationCompleted) {
        console.log("VS already done, showing RED TURN now");
        showTurnAnimation('red');
    }

    // Show first RED turn at game start

    // Update score displays
    // if (leftScoreEl) leftScoreEl.innerText = gameState.score.red;
    // if (rightScoreEl) rightScoreEl.innerText = gameState.score.blue;

    // Handle window resize
    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });
});
function showGoalConfetti(team) {
    const container = document.getElementById('goal-confetti');
    const goalColor = team === 'red' ? 'crimson' : 'dodgerblue';

    // Position at goal center
    const goalX = team === 'red' ? window.innerWidth - 100 : 100;  // adjust for exact goal center
    const goalY = window.innerHeight / 2;  // middle of field vertically

    for (let i = 0; i < 25; i++) {
        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        const size = Math.random() * 12 + 8;  // size between 8-20px
        circle.style.width = circle.style.height = size + 'px';
        circle.style.backgroundColor = goalColor;
        circle.style.borderRadius = '50%';
        circle.style.left = goalX + 'px';
        circle.style.top = goalY + 'px';
        circle.style.opacity = 0;

        container.appendChild(circle);

        // Random burst direction
        const angle = Math.random() * Math.PI * 2; // 0 → 360 degrees
        const distance = Math.random() * 60 + 30;  // how far it pops out

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        // Animate
        gsap.to(circle, {
            duration: 2,  // pop duration
            x: x,
            y: y,
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            onComplete: () => {
                gsap.to(circle, {
                    duration: 2.5,
                    opacity: 0,
                    scale: 0,
                    onComplete: () => circle.remove()
                });
            }
        });
    }
}

// Pause and resume functions
function pauseGame() {
    if (gameState.isPaused) return;
    Matter.Runner.stop(window.gameRunner);
    window.gameState.isPaused = true;
}

function resumeGame() {
    if (!gameState.isPaused) return;
    Matter.Runner.run(window.gameRunner, window.gameEngine);
    window.gameState.isPaused = false;
}

// Mystery box spawning
function spawnMysteryBox() {
    if (mysteryBox) return;

    var maxAttempts = 10;
    var x, y, validPosition;

    // Try to find valid position away from players
    for (var i = 0; i < maxAttempts; i++) {
        x = width * 0.3 + Math.random() * width * 0.4;
        y = height * 0.25 + Math.random() * height * 0.5;
        validPosition = true;

        for (var j = 0; j < players.length; j++) {
            var p = players[j];
            var dist = Math.sqrt(Math.pow(x - p.position.x, 2) + Math.pow(y - p.position.y, 2));
            if (dist < 60) {
                validPosition = false;
                break;
            }
        }

        if (validPosition) break;
    }

    if (!validPosition) {
        x = width / 2;
        y = height / 2;
    }

    mysteryBox = Matter.Bodies.rectangle(x, y, 40, 40, {
        isStatic: true,
        isSensor: true,
        label: 'MysteryBox',
        render: {
            fillStyle: '#222',
            strokeStyle: '#FFD700',
            lineWidth: 4
        }
    });

    mysteryBoxTurn = gameState.turnCount;
    Matter.Composite.add(engine.world, mysteryBox);
}

// Mystery box collection
function collectMysteryBox(team) {
    Matter.Composite.remove(engine.world, mysteryBox);
    mysteryBox = null;
    mysteryBoxTurn = null;

    var powerupName;
    var powerupType;

    // Alternate between powerup types
    if (lastPowerupGiven === 'speed') {
        powerupType = Math.random() < 0.5 ? 'giant' : 'slowOpponent';
    } else if (lastPowerupGiven === 'giant') {
        powerupType = Math.random() < 0.5 ? 'speed' : 'slowOpponent';
    } else if (lastPowerupGiven === 'slowOpponent') {
        powerupType = Math.random() < 0.5 ? 'speed' : 'giant';
    } else {
        // First powerup is random from all 3
        var rand = Math.random();
        if (rand < 0.33) powerupType = 'speed';
        else if (rand < 0.66) powerupType = 'giant';
        else powerupType = 'slowOpponent';
    }

    if (powerupType === 'speed') {
        storedPowerup[team] = true;
        powerupName = 'Speed Boost ⚡';
        lastPowerupGiven = 'speed';
        console.log('Gave Speed Boost to', team);
    } else if (powerupType === 'giant') {
        sizePower[team] = true;
        powerupName = 'Giant Player 👤';
        lastPowerupGiven = 'giant';
        console.log('Gave Giant Player to', team);
    } else {
        // Slow Opponent
        var opponent = team === 'red' ? 'blue' : 'red';
        opponentSlowed[opponent] = true;
        powerupName = 'Slow Opponent 🐢';
        lastPowerupGiven = 'slowOpponent';
        console.log('Gave Slow Opponent to', team, '-> slows', opponent);
    }

    // Play powerup sound
    if (window.musicManager) {
        window.musicManager.playSound('./audio/mystery.wav', 0.6);
    }

    showNotification(powerupName, team);
}

// Notification display
function showNotification(message, team) {
    var container = document.querySelector('.futsal');
    var notification = document.createElement('div');
    notification.innerText = message;
    notification.style.position = 'absolute';
    notification.style.top = '50%';
    notification.style.left = team === 'red' ? '10px' : 'auto';
    notification.style.right = team === 'blue' ? '10px' : 'auto';
    notification.style.transform = 'translateY(-50%)';
    notification.style.backgroundColor = team === 'red' ? '#ff0000' : '#0000ff';
    notification.style.color = '#ffffff';
    notification.style.padding = '15px 25px';
    notification.style.fontSize = '18px';
    notification.style.fontWeight = 'bold';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '100';
    notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    notification.style.pointerEvents = 'none';

    container.appendChild(notification);

    setTimeout(function () {
        container.removeChild(notification);
    }, 2000);
}