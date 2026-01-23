// Global variables
var width, height, engine, mysteryBox, mysteryBoxTurn, gameState, lastMysteryBoxSpawn, storedPowerup, sizePower, opponentSlowed, players, ball, lastPowerupGiven;

// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () { // so the domcontentloded is there because the js may run before the html file is fully loaded and this helps to wait the js to run only after the html file is loaded.
    var container = document.querySelector('.futsal');// here document is the built in object in js that represents the whole html file. queryselector is used to select the element with the class futsal., add event listner is method to listen the events, dom content loaded is the event of event listner.
    if (container) {
        var w = container.clientWidth;
        var h = container.clientHeight;
        if (w === 0 || h === 0) {
            alert("CRITICAL ERROR: The game field has 0 size! The players cannot be seen.");
            container.style.width = "100%";
            container.style.height = "600px";
        }
    }

    const menuBtn = document.querySelector('.menu');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');

    menuBtn.addEventListener('click', () => {
        pauseGame();
        pauseOverlay.classList.remove('hidden');
    });

    resumeBtn.addEventListener('click', () => {
        pauseOverlay.classList.add('hidden');
        resumeGame();
    });

    restartBtn.addEventListener('click', () => {
        pauseOverlay.classList.add('hidden');
        resumeGame();
        resetGame();
    });

    // Standard setup
    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Events = Matter.Events,
        Vector = Matter.Vector,
        Body = Matter.Body;

    // --- MYSTERY BOX & POWERUP STATE ---
    mysteryBox = null;
    mysteryBoxTurn = null;
    lastMysteryBoxSpawn = 0;
    lastPowerupGiven = null; // Track last powerup to alternate

    storedPowerup = {
        red: false,
        blue: false
    };

    sizePower = {
        red: false,
        blue: false
    };

    // --- GAME STATE ---
    var urlParams = new URLSearchParams(window.location.search);
    var targetGoals = parseInt(urlParams.get('goals')) || 3;

    gameState = {//gamestate ma chai u are tracking what u are doing ani function use hanesi matra game ma tyo kura haru implement hunxa.
        turn: 'red',
        isTurnActive: false,
        score: { red: 0, blue: 0 },
        canShoot: true,
        turnCount: 0,
        maxGoals: targetGoals,
        isPaused: false,//pause state ra pause function bhanne hunxa, pause state le chai remembers that game is paused so that weird physics apply na hoss, ani pause function halna imp xa cause tesle chai runner lai stop garxa and start garxa.
        currentFormation: '2-2' // Initial formation
    };

    opponentSlowed = { red: false, blue: false };

    // --- DOM ELEMENTS ---
    var scoreRedEl = document.querySelector('.red-score');
    var scoreBlueEl = document.querySelector('.blue-score');
    var turnIndicator = document.querySelector('.turn p');
    container = document.querySelector('.futsal');
    width = container.clientWidth;
    height = container.clientHeight;

    // --- PHYSICS SETUP ---
    engine = Engine.create();
    engine.world.gravity.y = 0;

    var render = Render.create({// rendring means creating canvas and drawing and putting obejects using js.
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

    // --- ENTITY CONFIG ---
    var WALL_THICKNESS = 10;
    var PLAYER_RADIUS = 28;
    var BALL_RADIUS = 20;
    var GOAL_WIDTH = 120;
    var GOAL_DEPTH = 40;

    // DECLARE PLAYERS AND BALL ARRAYS
    players = [];
    ball = null;

    // Groups for collision filtering
    var defaultCategory = 0x0001;

    // --- CREATE WALLS ---
    // Calculate playable field boundaries (matching the white lines in image)
    var fieldMarginX = width * 0.065; // Left/right margins
    var fieldMarginY = height * 0.08;  // Top/bottom margins
    var goalDepthOffset = 25;// How far back the goal extends

    var walls = [
        // Top wall (full length)
        Bodies.rectangle(width / 2, fieldMarginY + 20, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallTop',
            render: { fillStyle: 'transparent' }
        }),
        // Bottom wall (full length)
        Bodies.rectangle(width / 2, height - fieldMarginY - 13, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallBottom',
            render: { fillStyle: 'transparent' }
        }),
        // Left wall (top part - above goal)
        Bodies.rectangle(fieldMarginX + 102, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true,
            label: 'WallLeftTop',
            render: { fillStyle: 'transparent' }
        }),
        // Left wall (bottom part - below goal)
        Bodies.rectangle(fieldMarginX + 102, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 10, {
            isStatic: true,
            label: 'WallLeftBottom',
            render: { fillStyle: 'transparent' }
        }),
        // Right wall (top part - above goal)
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true,
            label: 'WallRightTop',
            render: { fillStyle: 'transparent' }
        }),
        // Right wall (bottom part - below goal)
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 12, {
            isStatic: true,
            label: 'WallRightBottom',
            render: { fillStyle: 'transparent' }
        }),
        // Left goal back wall (at the back of goal area)
        Bodies.rectangle(fieldMarginX - goalDepthOffset + 40, (height / 2) + 5, WALL_THICKNESS, GOAL_WIDTH + 50, {
            isStatic: true,
            label: 'LeftGoalBack',
            render: { fillStyle: 'transparent' }
        }),
        // Left goal top wall (roof of goal)
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 - GOAL_WIDTH / 2 - 20, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'LeftGoalTop',
            render: { fillStyle: 'transparent' }
        }),
        // Left goal bottom wall (floor of goal)
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 + GOAL_WIDTH / 2 + 27, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'LeftGoalBottom',
            render: { fillStyle: 'transparent' }
        }),
        // Right goal back wall (at the back of goal area)
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset - 40, height / 2 + 5, WALL_THICKNESS, GOAL_WIDTH + 60, {
            isStatic: true,
            label: 'RightGoalBack',
            render: { fillStyle: 'transparent' }
        }),
        // Right goal bottom wall (roff of goal)
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 - GOAL_WIDTH / 2 - 18, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'RightGoalTop',
            render: { fillStyle: 'transparent' }
        }),
        // Right goal bottom wall (floor of goal)
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 + GOAL_WIDTH / 2 + 28, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true,
            label: 'RightGoalBottom',
            render: { fillStyle: 'transparent' }
        }),
        // Extra corner walls to seal any gaps
        // Top-left corner
        Bodies.rectangle(fieldMarginX / 2 + 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerTopLeft',
            render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerTopRight',
            render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX / 2 + 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerBottomLeft',
            render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerBottomRight',
            render: { fillStyle: 'transparent' }
        })
    ];

    // --- CREATE GOALS (as sensors) ---
    var goalLeft = Bodies.rectangle(fieldMarginX + 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true,
        isSensor: true,
        label: 'GoalLeft',
        render: { fillStyle: 'transparent' }
    });

    var goalRight = Bodies.rectangle(width - fieldMarginX - 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true,
        isSensor: true,
        label: 'GoalRight',
        render: { fillStyle: 'transparent' }
    });
    //Adding walls and goals to world
    Composite.add(engine.world, [...walls, goalLeft, goalRight]);

    // --- BODIES CREATION ---
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

    // --- FORMATION DEFINITIONS ---
    var formations = {
        '2-2': {
            name: '2-2 Square',
            getPositions: function (isRed, width, height, fieldMarginX) {
                var baseX = isRed ? fieldMarginX + 80 : width - fieldMarginX - 80;
                var midX = isRed ? width * 0.3 : width * 0.7;
                var forwardDir = isRed ? 1 : -1;

                return [
                    { x: baseX, y: height / 2 },                                      // GK
                    { x: midX - (50 * forwardDir), y: height / 2 - 100 },             // def top
                    { x: midX - (50 * forwardDir), y: height / 2 + 100 },             // def bottom
                    { x: midX + (80 * forwardDir), y: height / 2 - 60 },              // fwd top
                    { x: midX + (80 * forwardDir), y: height / 2 + 60 }               // fwd bottom
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
                    { x: baseX, y: height / 2 },                                      // GK
                    { x: midX - (60 * forwardDir), y: height / 2 },                   // CDM (Central Def Mid)
                    { x: midX, y: height / 2 - 120 },                                 // Winger Top
                    { x: midX, y: height / 2 + 120 },                                 // Winger Bottom
                    { x: midX + (80 * forwardDir), y: height / 2 }                    // Striker
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
                    { x: baseX, y: height / 2 },                                      // GK
                    { x: midX - (80 * forwardDir), y: height / 2 - 80 },              // CB Top
                    { x: midX - (80 * forwardDir), y: height / 2 + 80 },              // CB Bottom
                    { x: midX - (40 * forwardDir), y: height / 2 },                   // CB Center
                    { x: midX + (80 * forwardDir), y: height / 2 }                    // Lone Striker
                ];
            }
        }
    };

    // --- FORMATION RESET ---
    function resetPositions(formationType) {
        // Default to current formation if not specified (or 2-2 if undefined)
        var selectedFormation = formationType || gameState.currentFormation || '2-2';

        // Remove existing dynamic bodies
        if (players.length > 0) {
            Composite.remove(engine.world, players);
        }
        if (ball) {
            Composite.remove(engine.world, ball);
        }
        players = [];

        // Get positions for Red Team
        var redPositions = formations[selectedFormation].getPositions(true, width, height, fieldMarginX);
        redPositions.forEach(pos => {
            players.push(createPlayer(pos.x, pos.y, 'red'));
        });

        // Get positions for Blue Team
        var bluePositions = formations[selectedFormation].getPositions(false, width, height, fieldMarginX);
        bluePositions.forEach(pos => {
            players.push(createPlayer(pos.x, pos.y, 'blue'));
        });

        // Ball at center
        ball = createBall(width / 2, height / 2);

        Composite.add(engine.world, [...players, ball]);

        // Reset state
        gameState.isTurnActive = false;
        gameState.canShoot = true;
        updateTurnDisplay();
    }

    // --- INPUT HANDLING (Drag & Flick) ---
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
                        // Update sprite scale along with body scale
                        Matter.Body.scale(selectedBody, 1.4, 1.4);
                        // Ensure sprite exists before scaling
                        if (selectedBody.render.sprite) {
                            selectedBody.render.sprite.xScale *= 1.4;
                            selectedBody.render.sprite.yScale *= 1.4;
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
        //Power effect application
        var baseForce = 0.09;
        var currentMaxForce = baseForce;

        // Apply speed boost powerup - MOAB (Mother of all Boosts)
        // Logic moved inside the shot execution block to prevent wasting it on cancelled drags
        var dragMultiplier = 0.0006;
        if (storedPowerup[gameState.turn]) {
            currentMaxForce = baseForce * 6.0; // Drastic increase
            dragMultiplier = 0.0018; // 3x sensitivity - barely dragging triggers huge power
        }

        // Apply giant player extra force
        if (selectedBody.isGiant) {
            currentMaxForce *= 2;
            console.log(gameState.turn.toUpperCase() + ' GIANT PLAYER! Double power: ' + currentMaxForce);
        }

        // Apply decreased speed if opponent used slow powerup
        if (opponentSlowed[gameState.turn]) {
            currentMaxForce *= 0.15;
            console.log(gameState.turn.toUpperCase() + ' IS SLOWED! Ultra low power.');
        }

        var forceMagnitude = Math.min(rawDistance * dragMultiplier, currentMaxForce);

        if (rawDistance > 0.0005) {
            // CONSUME POWERUP HERE (only if actually shooting)
            if (storedPowerup[gameState.turn]) {
                storedPowerup[gameState.turn] = false;
                console.log(gameState.turn.toUpperCase() + ' USED SPEED BOOST!');
            }

            var normalizedDx = dx / rawDistance;
            var normalizedDy = dy / rawDistance;

            var forceVector = Vector.create(normalizedDx * forceMagnitude, normalizedDy * forceMagnitude);

            Body.applyForce(selectedBody, selectedBody.position, forceVector);

            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        // Giant persistence: DO NOT reset scale here. It will be reset in switchTurn.

        selectedBody = null;
        dragStart = null;
        currentMousePos = null;
    }

    // Draw Aim Arrow and Power Meter
    Events.on(render, 'afterRender', function () {
        var ctx = render.context;
        //drawing mystery box question mark
        if (mysteryBox) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', mysteryBox.position.x, mysteryBox.position.y);
        }

        ['red', 'blue'].forEach(function (team, index) {
            var x = index === 0 ? 40 : width - 40;
            var y = 120;

            // Draw speed powerup icon
            if (storedPowerup[team]) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚡', x, y);
            }

            // Draw size powerup icon
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

                // Visual indicator for speed powerup
                if (storedPowerup[selectedBody.team]) {
                    ctx.shadowColor = '#FFD700'; // Gold glow
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = '#FFD700'; // Gold arrow for speed boost
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

    // --- GAME LOOP LOGIC ---
    Events.on(engine, 'beforeUpdate', function () {
        //Check if turn is complete
        if (gameState.isTurnActive) {
            var totalEnergy = 0;
            var bodies = Composite.allBodies(engine.world);
            for (var i = 0; i < bodies.length; i++) {
                var b = bodies[i];
                if (!b.isStatic) {
                    totalEnergy += b.speed * b.speed + b.angularSpeed * b.angularSpeed;
                }
            }
            //If all objects have stopped moving, end the turn
            if (totalEnergy < 0.01) {
                gameState.isTurnActive = false;
                gameState.canShoot = true;
                switchTurn();
            }
        }
    });

    // --- COLLISION DETECTION ---
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

            // Mystery box collection - check both label combinations
            if (bodyA.label === 'MysteryBox' && bodyB.label && (bodyB.label.includes('Player'))) {
                console.log('Mystery box touched by:', bodyB.team);
                if (bodyB.team) {
                    collectMysteryBox(bodyB.team);
                }
            }
            if (bodyB.label === 'MysteryBox' && bodyA.label && (bodyA.label.includes('Player'))) {
                console.log('Mystery box touched by:', bodyA.team);
                if (bodyA.team) {
                    collectMysteryBox(bodyA.team);
                }
            }
        }
    });

    function handleGoal(scoringTeam) {
        gameState.score[scoringTeam]++;

        if (scoringTeam === 'red') {
            scoreRedEl.innerText = gameState.score.red;
        } else {
            scoreBlueEl.innerText = gameState.score.blue;
        }

        if (gameState.score[scoringTeam] >= gameState.maxGoals) {
            setTimeout(function () {
                window.location.href = "victory.html?winner=" + scoringTeam;
            }, 500);
            return;
        }

        gameState.turn = scoringTeam === 'red' ? 'blue' : 'red';

        //change formation 
        var formationKeys = Object.keys(formations);
        var otherFormations = formationKeys.filter(k => k !== gameState.currentFormation);

        //Pick random new formation
        var randomKey = otherFormations[Math.floor(Math.random() * otherFormations.length)];
        gameState.currentFormation = randomKey;

        setTimeout(function () {
            resetPositions(gameState.currentFormation);
        }, 1500)
    }

    function resetGame(concedingTeam) {
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

        var leftTeamX = fieldMarginX + 80;
        var leftMidX = width * 0.3;
        var rightMidX = width * 0.7;
        var rightTeamX = width - fieldMarginX - 80;

        players.push(createPlayer(leftTeamX, height / 2, 'red'));
        players.push(createPlayer(leftMidX - 50, height / 2 - 100, 'red'));
        players.push(createPlayer(leftMidX - 50, height / 2 + 100, 'red'));
        players.push(createPlayer(leftMidX + 80, height / 2 - 60, 'red'));
        players.push(createPlayer(leftMidX + 80, height / 2 + 60, 'red'));

        players.push(createPlayer(rightTeamX, height / 2, 'blue'));
        players.push(createPlayer(rightMidX + 50, height / 2 - 100, 'blue'));
        players.push(createPlayer(rightMidX + 50, height / 2 + 100, 'blue'));
        players.push(createPlayer(rightMidX - 80, height / 2 - 60, 'blue'));
        players.push(createPlayer(rightMidX - 80, height / 2 + 60, 'blue'));

        ball = createBall(width / 2, height / 2);

        Composite.add(engine.world, [...players, ball]);

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

        // Reset to default formation
        gameState.currentFormation = '2-2';

        // Remove Mystery Box if exists
        if (mysteryBox) {
            Composite.remove(engine.world, mysteryBox);
            mysteryBox = null;
        }

        // Update UI
        scoreRedEl.innerText = gameState.score.red;
        scoreBlueEl.innerText = gameState.score.blue;
        updateTurnDisplay();

        // Reset positions with default formation
        resetPositions('2-2');

        updateTurnDisplay();
        scoreRedEl.innerText = gameState.score.red;
        scoreBlueEl.innerText = gameState.score.blue;
    }

    document.getElementById('reset').addEventListener('click', resetGame);

    // TEMPORARY TEST BUTTON - Add a button with id="testGiant" in your HTML
    var testBtn = document.getElementById('testGiant');
    if (testBtn) {
        testBtn.addEventListener('click', function () {
            sizePower[gameState.turn] = true;
            alert(gameState.turn.toUpperCase() + ' manually got Giant powerup for testing!');
        });
    }

    // --- UNIFIED SWITCH TURN FUNCTION ---
    function switchTurn() {
        // Reset giant players before switching turn
        var bodies = Composite.allBodies(engine.world);
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.isGiant) {
                Matter.Body.scale(b, 1 / 1.4, 1 / 1.4);
                if (b.render.sprite) {
                    b.render.sprite.xScale /= 1.4;
                    b.render.sprite.yScale /= 1.4;
                }
                b.isGiant = false;
            }
        }

        //mysterybox despawn logic
        if (mysteryBox && gameState.turnCount > mysteryBoxTurn) {
            Composite.remove(engine.world, mysteryBox);
            mysteryBox = null;
            mysteryBoxTurn = null;
        }

        // Reset slow effect for the team that just finished their turn
        if (opponentSlowed[gameState.turn]) {
            opponentSlowed[gameState.turn] = false;
        }

        gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
        gameState.turnCount++;

        // First mystery box spawns at turn 3
        if (gameState.turnCount === 3) {
            spawnMysteryBox();
            lastMysteryBoxSpawn = gameState.turnCount;
        }
        // After first spawn, spawn randomly with 2-3 turn gap
        else if (!mysteryBox && gameState.turnCount > lastMysteryBoxSpawn) {
            var turnsSinceLastSpawn = gameState.turnCount - lastMysteryBoxSpawn;
            var minGap = 2 + Math.floor(Math.random() * 2); // 2 or 3 turns

            if (turnsSinceLastSpawn >= minGap) {
                spawnMysteryBox();
                lastMysteryBoxSpawn = gameState.turnCount;
            }
        }

        //Game over check, score more than 30
        if (gameState.turnCount > 30) {
            alert("Game Over! Time limit reached.");
            gameState.turnCount = 30;
        }

        updateTurnDisplay();
    }

    function updateTurnDisplay() {
        turnIndicator.innerText = gameState.turnCount + "/30";
        turnIndicator.style.color = "white";
    }

    // --- INITIALIZATION ---
    Render.run(render);
    var runner = Runner.create();
    Runner.run(runner, engine);//Runner is matter.js object
    //when we put the things on window we can access the runner globally.


    window.gameRunner = runner;
    window.gameEngine = engine;
    window.gameState = gameState;

    updateTurnDisplay();
    resetPositions();

    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });
});

// --- GLOBAL PAUSE/RESUME FUNCTIONS ---
function pauseGame() {
    //putting the function here so that it can be acessed globally
    if (gameState.isPaused) return;
    Matter.Runner.stop(window.gameRunner);
    window.gameState.isPaused = true;
}

function resumeGame() {
    if (!gameState.isPaused) return;
    Matter.Runner.run(window.gameRunner, window.gameEngine);
    window.gameState.isPaused = false;
}

function spawnMysteryBox() {
    if (mysteryBox) return;

    var maxAttempts = 10;
    var x, y, validPosition;

    for (var i = 0; i < maxAttempts; i++) {
        x = width * 0.3 + Math.random() * width * 0.4;
        y = height * 0.25 + Math.random() * height * 0.5;
        validPosition = true;

        // Check distance to all players to prevent instant pickup
        for (var j = 0; j < players.length; j++) {
            var p = players[j];
            var dist = Math.sqrt(Math.pow(x - p.position.x, 2) + Math.pow(y - p.position.y, 2));
            if (dist < 60) { // 60px safety radius
                validPosition = false;
                break;
            }
        }

        if (validPosition) break;
    }

    // If we couldn't find a valid position after attempts, just default to center or skip
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

function collectMysteryBox(team) {
    Matter.Composite.remove(engine.world, mysteryBox);
    mysteryBox = null;
    mysteryBoxTurn = null;

    var powerupName;
    var powerupType;

    // Alternate powerups to ensure variety
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

    alert(team.toUpperCase() + ' got ' + powerupName + '!');
    showNotification(powerupName, team);
}

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