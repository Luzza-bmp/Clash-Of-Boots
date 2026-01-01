// Wait for the DOM to load
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
        canShoot: true, // blocks input during movement
        turnCount: 0 // 1 to 30
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
    var GOAL_WIDTH = 250;
    var GOAL_DEPTH = 30;

    // DECLARE PLAYERS AND BALL ARRAYS
    var players = [];
    var ball = null;

    // Groups for collision filtering
    var defaultCategory = 0x0001;

    // --- CREATE WALLS ---
    var walls = [
        // Top wall
        Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallTop',
            render: { fillStyle: '#333' }
        }),
        // Bottom wall
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width, WALL_THICKNESS, {
            isStatic: true,
            label: 'WallBottom',
            render: { fillStyle: '#333' }
        }),
        // Left wall (top part)
        Bodies.rectangle(-WALL_THICKNESS / 2, height / 2 - GOAL_WIDTH / 2 - 50, WALL_THICKNESS, height / 2 - GOAL_WIDTH / 2, {
            isStatic: true,
            label: 'WallLeftTop',
            render: { fillStyle: '#333' }
        }),
        // Left wall (bottom part)
        Bodies.rectangle(-WALL_THICKNESS / 2, height / 2 + GOAL_WIDTH / 2 + 50, WALL_THICKNESS, height / 2 - GOAL_WIDTH / 2, {
            isStatic: true,
            label: 'WallLeftBottom',
            render: { fillStyle: '#333' }
        }),
        // Right wall (top part)
        Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2 - GOAL_WIDTH / 2 - 50, WALL_THICKNESS, height / 2 - GOAL_WIDTH / 2, {
            isStatic: true,
            label: 'WallRightTop',
            render: { fillStyle: '#333' }
        }),
        // Right wall (bottom part)
        Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2 + GOAL_WIDTH / 2 + 50, WALL_THICKNESS, height / 2 - GOAL_WIDTH / 2, {
            isStatic: true,
            label: 'WallRightBottom',
            render: { fillStyle: '#333' }
        })
    ];

    // --- CREATE GOALS (as sensors) ---
    var goalLeft = Bodies.rectangle(0, height / 2, GOAL_DEPTH, GOAL_WIDTH, {
        isStatic: true,
        isSensor: true,
        label: 'GoalLeft',
        render: { fillStyle: 'rgba(255, 0, 0, 0.3)' }
    });

    var goalRight = Bodies.rectangle(width, height / 2, GOAL_DEPTH, GOAL_WIDTH, {
        isStatic: true,
        isSensor: true,
        label: 'GoalRight',
        render: { fillStyle: 'rgba(0, 0, 255, 0.3)' }
    });

    // Add walls and goals to world
    Composite.add(engine.world, [...walls, goalLeft, goalRight]);

    // --- BODIES CREATION ---
    function createPlayer(x, y, team) {
        var isRed = team === 'red';
        var texture = isRed ? './img/red-player.png' : './img/blue-player.png';
        var body = Bodies.circle(x, y, PLAYER_RADIUS, {
            label: team + 'Player',
            restitution: 0.5,
            frictionAir: 0.05,
            friction: 0.1,
            density: 0.002,
            render: {
                fillStyle: team === 'red' ? '#ff0000' : '#0000ff'
            }
        });
        body.team = team;
        return body;
    }

    function createBall(x, y) {
        return Bodies.circle(x, y, BALL_RADIUS, {
            label: 'Ball',
            restitution: 0.8,
            frictionAir: 0.015,
            friction: 0.005,
            density: 0.001,
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

        // 5 Red Players (Left)
        players.push(createPlayer(100, height / 2, 'red'));
        players.push(createPlayer(250, height / 2 - 100, 'red'));
        players.push(createPlayer(250, height / 2 + 100, 'red'));
        players.push(createPlayer(450, height / 2 - 50, 'red'));
        players.push(createPlayer(450, height / 2 + 50, 'red'));

        // 5 Blue Players (Right)
        players.push(createPlayer(width - 100, height / 2, 'blue'));
        players.push(createPlayer(width - 250, height / 2 - 100, 'blue'));
        players.push(createPlayer(width - 250, height / 2 + 100, 'blue'));
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
    var maxForce = 0.02;

    render.canvas.addEventListener('mousedown', function (e) { handleInputStart(e); });
    render.canvas.addEventListener('touchstart', function (e) { handleInputStart(e); });

    function handleInputStart(e) {
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
                    break;
                }
            }
        }
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

        var forceVector = Vector.create(dx * 0.00025, dy * 0.00025);

        var magnitude = Vector.magnitude(forceVector);
        if (magnitude > maxForce) {
            forceVector = Vector.mult(Vector.normalise(forceVector), maxForce);
        }

        if (magnitude > 0.0005) {
            Body.applyForce(selectedBody, selectedBody.position, forceVector);
            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        selectedBody = null;
        dragStart = null;
    }

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

            if (totalEnergy < 0.05) {
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

        gameState.turn = scoringTeam === 'red' ? 'blue' : 'red';

        setTimeout(function () {
            resetPositions();
        }, 1500);
    }

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
    Render.run(render);
    var runner = Runner.create();
    Runner.run(runner, engine);

    updateTurnDisplay();
    resetPositions();

    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });
});