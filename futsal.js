// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () { // so the domcontentloded is there because the js may run before the html file is fully loaded and this helps to wait the js to run only after the html file is loaded.
    var container = document.querySelector('.futsal'); // here document is the built in object in js that represents the whole html file. queryselector is used to select the element with the class futsal., add event listner is method to listen the events, dom content loaded is the event of event listner.
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

    // --- GAME STATE ---
    var urlParams = new URLSearchParams(window.location.search);
    var targetGoals = parseInt(urlParams.get('goals')) || 3; 

    var gameState = { //gamestate ma chai u are tracking what u are doing ani function use hanesi matra game ma tyo kura haru implement hunxa.
        turn: 'red', // 'red' or 'blue'
        isTurnActive: false, // true when objects are moving
        score: { red: 0, blue: 0 },
        canShoot: true, // blocks input during movement
        turnCount: 0, // 1 to 30
        maxGoals: targetGoals,// goals needed to win
        isPaused: false //pause state ra pause function bhanne hunxa, pause state le chai remembers that game is paused so that weird physics apply na hoss, ani pause function halna imp xa cause tesle chai runner lai stop garxa and start garxa.
    };

    // --- DOM ELEMENTS ---
    var scoreRedEl = document.querySelector('.red-score');
    var scoreBlueEl = document.querySelector('.blue-score');
    var turnIndicator = document.querySelector('.turn p');
    var container = document.querySelector('.futsal');
    var width = container.clientWidth;
    var height = container.clientHeight;

    // --- PHYSICS SETUP ---
    var engine = Engine.create();
    engine.world.gravity.y = 0; // Top-down -> no gravity

    var render = Render.create({ // rendring means creating canvas and drawing and putting obejects using js.
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
    var PLAYER_RADIUS = 28;  // Increased player size
    var BALL_RADIUS = 20;
    var GOAL_WIDTH = 120;  // Match goal post size in image
    var GOAL_DEPTH = 40;

    // DECLARE PLAYERS AND BALL ARRAYS
    var players = [];
    var ball = null;

    // Groups for collision filtering
    var defaultCategory = 0x0001;

    // --- CREATE WALLS ---
    // Calculate playable field boundaries (matching the white lines in image)
    var fieldMarginX = width * 0.065;  // Left/right margins
    var fieldMarginY = height * 0.08;   // Top/bottom margins
    var goalDepthOffset = 25; // How far back the goal extends

    //creating powerups 
   
    var activePowerup = null;      // The powerup circle on the field (can be collected)
    var collectedPowerup = null;   // The powerup a team has collected and can use
   
    var powerupTypes = [ //here the powerup types is an array that holds different powerup objects, we can add other powerups on this same array.
    { 
        id: 'speed',           // Unique identifier to check which powerup it is
        name: 'Speed Boost',   // Display name for UI
        color: '#ffff00',      // Yellow color for the powerup circle
        icon: '⚡',            // Visual icon (optional)
        duration: 3            // Lasts for 3 turns
    }
];

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
        // Right goal top wall (roof of goal)
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
        // Top-right corner
        Bodies.rectangle(width - fieldMarginX / 2 - 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerTopRight',
            render: { fillStyle: 'transparent' }
        }),
        // Bottom-left corner
        Bodies.rectangle(fieldMarginX / 2 + 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true,
            label: 'CornerBottomLeft',
            render: { fillStyle: 'transparent' }
        }),
        // Bottom-right corner
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

    // Add walls and goals to world
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
                    xScale: 0.22,  // Increased sprite size
                    yScale: 0.22
                },
                // Fallback color in case image doesn't load
                fillStyle: team === 'red' ? '#ff0000' : '#0000ff'
            }
        });
        body.team = team;
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

    // --- FORMATION RESET ---
    function resetPositions(concedingTeam) {
        // Remove existing dynamic bodies
        if (players.length > 0) {
            Composite.remove(engine.world, players);
        }
        if (ball) {
            Composite.remove(engine.world, ball);
        }
        players = [];

        // Calculate positions within field boundaries
        var leftTeamX = fieldMarginX + 80;
        var leftMidX = width * 0.3;
        var rightMidX = width * 0.7;
        var rightTeamX = width - fieldMarginX - 80;

        // 5 Red Players (Left side) - positioned within field
        players.push(createPlayer(leftTeamX, height / 2, 'red'));  // Goalkeeper
        players.push(createPlayer(leftMidX - 50, height / 2 - 100, 'red'));  // Defender
        players.push(createPlayer(leftMidX - 50, height / 2 + 100, 'red'));  // Defender
        players.push(createPlayer(leftMidX + 80, height / 2 - 60, 'red'));  // Forward
        players.push(createPlayer(leftMidX + 80, height / 2 + 60, 'red'));  // Forward

        // 5 Blue Players (Right side) - positioned within field
        players.push(createPlayer(rightTeamX, height / 2, 'blue'));  // Goalkeeper
        players.push(createPlayer(rightMidX + 50, height / 2 - 100, 'blue'));  // Defender
        players.push(createPlayer(rightMidX + 50, height / 2 + 100, 'blue'));  // Defender
        players.push(createPlayer(rightMidX - 80, height / 2 - 60, 'blue'));  // Forward
        players.push(createPlayer(rightMidX - 80, height / 2 + 60, 'blue'));  // Forward

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
    var maxForce = 0.09;  // Adjusted for player size
    var currentMousePos = null; // Track mouse position for arrow drawing

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

        // Calculate the raw distance first
        var rawDistance = Math.sqrt(dx * dx + dy * dy);

        // Scale force based on distance (0 to maxForce)
        var forceMagnitude = Math.min(rawDistance * 0.0006, maxForce);  // Scale up distance to force

        // Create normalized direction vector
        if (rawDistance > 0.0005) {
            var normalizedDx = dx / rawDistance;
            var normalizedDy = dy / rawDistance;

            // Apply force in the direction with calculated magnitude
            var forceVector = Vector.create(normalizedDx * forceMagnitude, normalizedDy * forceMagnitude);

            Body.applyForce(selectedBody, selectedBody.position, forceVector);
            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        selectedBody = null;
        dragStart = null;
        currentMousePos = null;
    }

    // Draw Aim Arrow and Power Meter
    Events.on(render, 'afterRender', function () {
        if (selectedBody && dragStart && currentMousePos && gameState.canShoot) {
            var ctx = render.context;

            // Calculate direction vector (from current mouse to player)
            var dx = dragStart.x - currentMousePos.x;
            var dy = dragStart.y - currentMousePos.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) { // Only draw if dragged enough
                // Calculate arrow end point (from player outward)
                var arrowLength = Math.min(distance * 2, 150); // Scale arrow
                var angle = Math.atan2(dy, dx);
                var endX = selectedBody.position.x + Math.cos(angle) * arrowLength;
                var endY = selectedBody.position.y + Math.sin(angle) * arrowLength;

                // Calculate power percentage
                var power = Math.min(distance / 100, 1) * 100;

                // Draw arrow line
                ctx.strokeStyle = selectedBody.team === 'red' ? '#ff0000' : '#0000ff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(selectedBody.position.x, selectedBody.position.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw arrowhead
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

                // Draw power meter background
                var meterWidth = 100;
                var meterHeight = 15;
                var meterX = selectedBody.position.x - meterWidth / 2;
                var meterY = selectedBody.position.y - 50;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

                // Draw power meter fill
                var powerColor = power < 33 ? '#00ff00' : power < 66 ? '#ffff00' : '#ff0000';
                ctx.fillStyle = powerColor;
                ctx.fillRect(meterX, meterY, (meterWidth * power) / 100, meterHeight);

                // Draw power meter border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

                // Draw power percentage text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(Math.round(power) + '%', selectedBody.position.x, meterY - 5);
            }
        }
    });

    // --- GAME LOOP LOGIC ---
    Events.on(engine, 'beforeUpdate', function () {
        if (gameState.isTurnActive) {
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

    Events.on(engine, 'collisionStart', function (event) {
        var pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
            var bodyA = pairs[i].bodyA;
            var bodyB = pairs[i].bodyB;

            if ((bodyA.label === 'Ball' && bodyB.label === 'GoalLeft') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalLeft')) {
                handleGoal('blue');
            } else if ((bodyA.label === 'Ball' && bodyB.label === 'GoalRight') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalRight')) {
                handleGoal('red');
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
            // Victory condition met
            setTimeout(function () {
                window.location.href = "victory.html?winner=" + scoringTeam;
            }, 500);
            return;
        }

        gameState.turn = scoringTeam === 'red' ? 'blue' : 'red';

        setTimeout(function () {
            resetPositions();
        }, 1500);
    }

    function resetGame(concedingTeam) {
        // Remove existing dynamic bodies
        if (players.length > 0) {
            Composite.remove(engine.world, players);
        }
        if (ball) {
            Composite.remove(engine.world, ball);
        }
        players = [];

        // Calculate positions within field boundaries
        var leftTeamX = fieldMarginX + 80;
        var leftMidX = width * 0.3;
        var rightMidX = width * 0.7;
        var rightTeamX = width - fieldMarginX - 80;

        // 5 Red Players (Left side) - positioned within field
        players.push(createPlayer(leftTeamX, height / 2, 'red'));  // Goalkeeper
        players.push(createPlayer(leftMidX - 50, height / 2 - 100, 'red'));  // Defender
        players.push(createPlayer(leftMidX - 50, height / 2 + 100, 'red'));  // Defender
        players.push(createPlayer(leftMidX + 80, height / 2 - 60, 'red'));  // Forward
        players.push(createPlayer(leftMidX + 80, height / 2 + 60, 'red'));  // Forward

        // 5 Blue Players (Right side) - positioned within field
        players.push(createPlayer(rightTeamX, height / 2, 'blue'));  // Goalkeeper
        players.push(createPlayer(rightMidX + 50, height / 2 - 100, 'blue'));  // Defender
        players.push(createPlayer(rightMidX + 50, height / 2 + 100, 'blue'));  // Defender
        players.push(createPlayer(rightMidX - 80, height / 2 - 60, 'blue'));  // Forward
        players.push(createPlayer(rightMidX - 80, height / 2 + 60, 'blue'));  // Forward

        // Ball at center
        ball = createBall(width / 2, height / 2);

        Composite.add(engine.world, [...players, ball]);

        // Reset state
        gameState.isTurnActive = false;
        gameState.canShoot = true;
        gameState.score.red = 0;
        gameState.score.blue = 0;
        gameState.turn = 'red';
        gameState.turnCount = 0;
        updateTurnDisplay();
        scoreRedEl.innerText = gameState.score.red;
        scoreBlueEl.innerText = gameState.score.blue;
    }

    document.getElementById('reset').addEventListener('click', resetGame);

    function switchTurn() {
        gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
        gameState.turnCount++;
        if (gameState.turnCount > 30) {
            alert("Game Over!");
            gameState.turnCount = 30;
        }
        updateTurnDisplay();
    }

    function updateTurnDisplay() {
        turnIndicator.innerText = gameState.turnCount + "/30";
        turnIndicator.style.color = "white";
    }

    // --- INITIALIZATION ---
    Render.run(render); // when we put the things on window we can access the runner globally.
    var runner = Runner.create();
    Runner.run(runner, engine);// runner is matter.js object.

    window.gameRunner = runner; // now it can be accessed globally for pausing and resuming.
    window.gameEngine = engine;
    window.gameState = gameState;

    updateTurnDisplay();
    resetPositions();

    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });

});

function pauseGame() { //just putting the fucntion here so that it can be accessed globally.
    if (gameState.isPaused) return;
    Matter.Runner.stop(window.gameRunner);
    window.gameState.isPaused = true;
}

function resumeGame() {
    if (!gameState.isPaused) return;
    Matter.Runner.run(window.gameRunner, window.gameEngine);
    window.gameState.isPaused = false;
}


// POWERUP FUNCTIONS
function spawnPowerup() {
    if (activePowerup) return; // Don't spawn if one already exists
    
    // Random position in middle of field (40%-60% of width, 30%-70% of height)
    var x = width * 0.4 + Math.random() * width * 0.2;
    var y = height * 0.3 + Math.random() * height * 0.4;
    
    // Pick a random powerup type from the array
    var type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    
    // Create a physical circle body using Matter.js
    activePowerup = Bodies.circle(x, y, 25, {
        isStatic: true,      // Doesn't move or fall
        isSensor: true,      // Players can pass through it (ghost-like)
        label: 'Powerup',    // Identifier for collision detection
        render: {
            fillStyle: type.color,      // Yellow for speed boost
            strokeStyle: '#ffffff',     // White border
            lineWidth: 3
        }
    });
    
    // Attach the powerup type info to the body
    activePowerup.powerupType = type;
    
    // Add it to the physics world (now visible on screen)
    Composite.add(engine.world, activePowerup);
}

function switchTurn() {
    gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
    gameState.turnCount++;
    
    // Every 3 or 4 turns, spawn a powerup
    if (gameState.turnCount % 3 === 0 || gameState.turnCount % 4 === 0) {
        spawnPowerup();
    }
    
    updateTurnDisplay();
}

Events.on(engine, 'collisionStart', function (event) {
    var pairs = event.pairs;  // All collisions that happened this frame
    
    for (var i = 0; i < pairs.length; i++) {
        var bodyA = pairs[i].bodyA;
        var bodyB = pairs[i].bodyB;
        
        // Check if a player touched the powerup
        if (bodyA.label === 'Powerup' && bodyB.team) {
            collectPowerup(bodyB.team, bodyA);  // bodyB is the player
        } else if (bodyB.label === 'Powerup' && bodyA.team) {
            collectPowerup(bodyA.team, bodyB);  // bodyA is the player
        }
    }
});


function collectPowerup(team, powerupBody) {
    if (!activePowerup) return;  // Safety check
    
    // Remove the yellow circle from the field
    Composite.remove(engine.world, powerupBody);
    
    // Give the powerup to the team
    collectedPowerup = {
        team: team,                              // 'red' or 'blue'
        type: activePowerup.powerupType,         // { id: 'speed', name: '...', ... }
        turnsLeft: activePowerup.powerupType.duration  // 3 turns
    };
    
    activePowerup = null;  // No more powerup on field
    
    // Show notification
    alert(team.toUpperCase() + " collected Speed Boost!");
}

var maxForce = 0.09;  // Normal shooting power

function handleInputEnd(e) {
    // ... all your existing drag calculation code ...
    
    // 🔥CHECK IF SPEED BOOST IS ACTIVE
    if (collectedPowerup && 
        collectedPowerup.team === gameState.turn &&  // Is it my team's turn?
        collectedPowerup.type.id === 'speed') {      // Is it a speed boost?
        
        maxForce = 0.15;  // INCREASE POWER!
    } else {
        maxForce = 0.09;  // Normal power
    }
    
    // Calculate force with new maxForce
    var forceMagnitude = Math.min(rawDistance * 0.0006, maxForce);
    
    // Apply force to player
    var forceVector = Vector.create(normalizedDx * forceMagnitude, normalizedDy * forceMagnitude);
    Body.applyForce(selectedBody, selectedBody.position, forceVector);
    
    
}

function switchTurn() {
    gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
    gameState.turnCount++;
    
    // 🕐 DECREASE POWERUP TIMER
    if (collectedPowerup && collectedPowerup.turnsLeft > 0) {
        collectedPowerup.turnsLeft--;  // 3 → 2 → 1 → 0
        
        // When timer reaches 0, remove powerup
        if (collectedPowerup.turnsLeft === 0) {
            collectedPowerup = null;  // Speed boost gone!
            maxForce = 0.09;          // Back to normal
        }
    }
    
    updateTurnDisplay();
}