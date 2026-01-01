// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
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
    var gameState = {
        turn: 'red', // 'red' or 'blue'
        isTurnActive: false, // true when objects are moving
        score: { red: 0, blue: 0 },
        canShoot: true // blocks input during movement
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

    var render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent'
        }
    });

    // --- ENTITY CONFIG ---
    var WALL_THICKNESS = 100;
    var PLAYER_RADIUS = 20;
    var BALL_RADIUS = 12;
    var GOAL_WIDTH = 250; // Opening for the goal
    // Offset goal sensors slightly outside the visible field so ball enters "net"
    var GOAL_DEPTH = 30;

    // Groups for collision filtering (optional, but good practice)
    var defaultCategory = 0x0001;

    // --- BODIES CREATION ---

    // 1. Walls
    // Top, Bottom, and Corners (split Left/Right walls to leave hole for goal)
    var walls = [
        // Top
        Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true, render: { visible: false } }),
        // Bottom
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true, render: { visible: false } }),
        // Left Top Segment
        Bodies.rectangle(-WALL_THICKNESS / 2, (height - GOAL_WIDTH) / 4, WALL_THICKNESS, (height - GOAL_WIDTH) / 2, { isStatic: true, render: { visible: false } }),
        // Left Bottom Segment
        Bodies.rectangle(-WALL_THICKNESS / 2, height - (height - GOAL_WIDTH) / 4, WALL_THICKNESS, (height - GOAL_WIDTH) / 2, { isStatic: true, render: { visible: false } }),
        // Right Top Segment
        Bodies.rectangle(width + WALL_THICKNESS / 2, (height - GOAL_WIDTH) / 4, WALL_THICKNESS, (height - GOAL_WIDTH) / 2, { isStatic: true, render: { visible: false } }),
        // Right Bottom Segment
        Bodies.rectangle(width + WALL_THICKNESS / 2, height - (height - GOAL_WIDTH) / 4, WALL_THICKNESS, (height - GOAL_WIDTH) / 2, { isStatic: true, render: { visible: false } })
    ];
    Composite.add(engine.world, walls);

    // 2. Goal Sensors
    var leftGoal = Bodies.rectangle(-GOAL_DEPTH, height / 2, GOAL_DEPTH, GOAL_WIDTH, {
        isStatic: true,
        isSensor: true,
        label: 'GoalLeft',
        render: { visible: false }
    });
    var rightGoal = Bodies.rectangle(width + GOAL_DEPTH, height / 2, GOAL_DEPTH, GOAL_WIDTH, {
        isStatic: true,
        isSensor: true,
        label: 'GoalRight',
        render: { visible: false }
    });
    Composite.add(engine.world, [leftGoal, rightGoal]);

    // 3. Players & Ball
    var players = [];
    var ball;

    function createPlayer(x, y, team) {
        var isRed = team === 'red';
        var texture = isRed ? 'img/red-player.png' : 'img/blue-player.png';
        var body = Bodies.circle(x, y, PLAYER_RADIUS, {
            label: team + 'Player',
            restitution: 0.5,
            frictionAir: 0.05, // Resistance to sliding
            friction: 0.1,
            density: 0.002,
            render: {
                sprite: {
                    texture: texture,
                    xScale: 0.1,
                    yScale: 0.1
                }
            }
        });
        body.team = team; // Custom property
        return body;
    }

    function createBall(x, y) {
        // Try to load user ball image if exists, else fallback to null (white circle)
        // We'll assume ball.png exists or fallback to drawing
        return Bodies.circle(x, y, BALL_RADIUS, {
            label: 'Ball',
            restitution: 0.8, // Bouncy
            frictionAir: 0.015, // Rolls longer than players
            friction: 0.005,
            density: 0.001, // Lighter than players
            render: {
                fillStyle: '#ffffff',
                strokeStyle: '#000000',
                lineWidth: 2,
                sprite: {
                    // Start without texture, can add 'img/ball.png' if user provided
                }
            }
        });
    }

    // --- FORMATION RESET ---
    function resetPositions(concedingTeam) {
        // Remove existing dynamic bodies
        Composite.remove(engine.world, players);
        Composite.remove(engine.world, ball);
        players = [];

        // Conceding team gets kick-off (optional rule) or just reset standard

        // 5 Red Players (Left) - Standard 1-2-2 or 1-3-1
        var startX = 100;
        var startY = height / 2;

        // Goalkeeper
        players.push(createPlayer(100, height / 2, 'red'));
        // Defenders
        players.push(createPlayer(250, height / 2 - 100, 'red'));
        players.push(createPlayer(250, height / 2 + 100, 'red'));
        // Attackers
        players.push(createPlayer(450, height / 2 - 50, 'red'));
        players.push(createPlayer(450, height / 2 + 50, 'red'));

        // 5 Blue Players (Right) - Mirror
        // Goalkeeper
        players.push(createPlayer(width - 100, height / 2, 'blue'));
        // Defenders
        players.push(createPlayer(width - 250, height / 2 - 100, 'blue'));
        players.push(createPlayer(width - 250, height / 2 + 100, 'blue'));
        // Attackers
        players.push(createPlayer(width - 450, height / 2 - 50, 'blue'));
        players.push(createPlayer(width - 450, height / 2 + 50, 'blue'));

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
    var maxForce = 0.02; // Tune this power

    // We listen to canvas events
    render.canvas.addEventListener('mousedown', function (e) { handleInputStart(e); });
    render.canvas.addEventListener('touchstart', function (e) { handleInputStart(e); });

    // Visualizing the aim line (simple overlay)
    // We can use Matter.Events.on(render, 'afterRender', ...) to draw lines

    function handleInputStart(e) {
        if (!gameState.canShoot) return;

        // Get mouse position relative to canvas
        var rect = render.canvas.getBoundingClientRect();
        var x = (e.clientX || e.touches[0].clientX) - rect.left;
        var y = (e.clientY || e.touches[0].clientY) - rect.top;

        // Check if we clicked our team's player
        var bodies = Composite.allBodies(engine.world);
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b.team === gameState.turn && Matter.Bounds.contains(b.bounds, { x: x, y: y })) {
                if (Matter.Vertices.contains(b.vertices, { x: x, y: y })) {
                    selectedBody = b;
                    dragStart = { x: x, y: y };
                    break;
                }
            }
        }
    }

    render.canvas.addEventListener('mouseup', function (e) { handleInputEnd(e); });
    render.canvas.addEventListener('touchend', function (e) { handleInputEnd(e); });

    function handleInputEnd(e) {
        if (!selectedBody || !dragStart) return;

        // Get release position
        var rect = render.canvas.getBoundingClientRect();
        // Use changedTouches for touch event if needed, or just mouse
        var clientX = e.clientX;
        var clientY = e.clientY;
        if (!clientX && e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        var x = clientX - rect.left;
        var y = clientY - rect.top;

        // Calculate vector
        var dx = dragStart.x - x; // Pull back to shoot forward
        var dy = dragStart.y - y;

        var forceVector = Vector.create(dx * 0.00025, dy * 0.00025); // Scale force

        // Clamp force
        var magnitude = Vector.magnitude(forceVector);
        if (magnitude > maxForce) {
            forceVector = Vector.mult(Vector.normalise(forceVector), maxForce);
        }

        // Apply force if strong enough
        if (magnitude > 0.0005) {
            Body.applyForce(selectedBody, selectedBody.position, forceVector);
            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        // Cleanup
        selectedBody = null;
        dragStart = null;
    }

    // Draw Aim Line
    Events.on(render, 'afterRender', function () {
        if (selectedBody && dragStart && gameState.canShoot) {
            // We need current mouse pos. Since we don't track it globally, 
            // we'll skip drawing the line for this simplified implementation 
            // OR we'd add a 'mousemove' listener to update a variable.
            // Let's rely on the user dragging "blind" or add mousemove tracking quickly.
        }
    });

    // Add mousemove for aiming visual (optional logic, kept simple for now)

    // --- GAME LOOP LOGIC ---
    Events.on(engine, 'beforeUpdate', function () {
        // 1. Check if bodies are moving
        if (gameState.isTurnActive) {
            var totalEnergy = 0;
            var bodies = Composite.allBodies(engine.world);
            for (var i = 0; i < bodies.length; i++) {
                var b = bodies[i];
                if (!b.isStatic) {
                    totalEnergy += b.speed * b.speed + b.angularSpeed * b.angularSpeed;
                }
            }

            // Stop threshold
            if (totalEnergy < 0.05) {
                // Everything stopped
                gameState.isTurnActive = false;
                gameState.canShoot = true;
                switchTurn();
            }
        }

        // 2. Goal Collision Detection
        // Using sensors, we check collision active/start
    });

    Events.on(engine, 'collisionStart', function (event) {
        var pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
            var bodyA = pairs[i].bodyA;
            var bodyB = pairs[i].bodyB;

            // Check Ball entering Goal
            if ((bodyA.label === 'Ball' && bodyB.label === 'GoalLeft') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalLeft')) {
                handleGoal('blue'); // Ball in Left Goal -> Blue moves R to L? No, wait. 
                // Left goal is usually defended by Red. So correct, Blue scores?
                // Visuals: Team Red is on left (first half), Team Blue on right.
                // If ball goes into Left sensor, Blue scored.
            } else if ((bodyA.label === 'Ball' && bodyB.label === 'GoalRight') ||
                (bodyB.label === 'Ball' && bodyA.label === 'GoalRight')) {
                handleGoal('red');
            }
        }
    });

    function handleGoal(scoringTeam) {
        gameState.score[scoringTeam]++;

        // Update UI
        if (scoringTeam === 'red') {
            scoreRedEl.innerText = gameState.score.red;
        } else {
            scoreBlueEl.innerText = gameState.score.blue;
        }

        // Determine who gets next turn (conceding team)
        gameState.turn = scoringTeam === 'red' ? 'blue' : 'red';

        // Reset after delay
        setTimeout(function () {
            resetPositions();
        }, 1500);
    }

    function switchTurn() {
        gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
        updateTurnDisplay();
    }

    function updateTurnDisplay() {
        turnIndicator.innerText = gameState.turn.toUpperCase() + "'S TURN";
        turnIndicator.style.color = gameState.turn === 'red' ? 'red' : 'cyan';
    }

    // --- INITIALIZATION ---
    // Run the engine
    Render.run(render);
    var runner = Runner.create();
    Runner.run(runner, engine);

    // Initial Start
    updateTurnDisplay();
    resetPositions();

    // Resize Handler
    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });
});
