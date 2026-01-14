// Wait for the DOM to load
let gameState = null;

function initFutsal(goals) {
    // Clean up previous game instance
    if (window.gameRunner) {
        Matter.Runner.stop(window.gameRunner);
        Matter.World.clear(window.gameEngine.world);
        Matter.Engine.clear(window.gameEngine);
    }

    window.selectedGoals = goals;

    // Check container size
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

    // Setup pause menu (only once)
    const menuBtn = document.querySelector('.menu');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (menuBtn && !menuBtn.dataset.bound) {
        menuBtn.dataset.bound = "true";

        menuBtn.onclick = () => {
            // Play click sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('click');
            }
            pauseGame();
            pauseOverlay.classList.remove('hidden');
        };

        resumeBtn.onclick = () => {
            // Play click sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('click');
            }
            pauseOverlay.classList.add('hidden');
            resumeGame();
        };

        restartBtn.onclick = () => {
            // Play click sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('click');
            }
            pauseOverlay.classList.add('hidden');
            resumeGame();
            resetGame();
        };
    }

    // Display player names
    const player1Name = localStorage.getItem("player1") || "Player 1";
    const player2Name = localStorage.getItem("player2") || "Player 2";
    
    const redNameEl = document.querySelector('.red-name');
    const blueNameEl = document.querySelector('.blue-name');
    
    if (redNameEl) redNameEl.innerText = player1Name;
    if (blueNameEl) blueNameEl.innerText = player2Name;

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
    var targetGoals = window.selectedGoals || 3;

    gameState = {
        turn: 'red',
        isTurnActive: false,
        score: { red: 0, blue: 0 },
        canShoot: true,
        turnCount: 0,
        maxGoals: targetGoals,
        isPaused: false
    };

    // --- DOM ELEMENTS ---
    var scoreRedEls = document.querySelectorAll('.red-score');
    var scoreBlueEls = document.querySelectorAll('.blue-score');
    var turnIndicator = document.querySelector('.turn p');
    var width = container.clientWidth;
    var height = container.clientHeight;

    // --- PHYSICS SETUP ---
    var engine = Engine.create();
    engine.world.gravity.y = 0;
    engine.world.gravity.x = 0;

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

    // --- ENTITY CONFIG ---
    var WALL_THICKNESS = 10;
    var PLAYER_RADIUS = 28;
    var BALL_RADIUS = 20;
    var GOAL_WIDTH = 120;
    var GOAL_DEPTH = 40;

    var players = [];
    var ball = null;

    // Calculate field boundaries
    var fieldMarginX = width * 0.065;
    var fieldMarginY = height * 0.08;
    var goalDepthOffset = 25;

    // --- CREATE WALLS ---
    var walls = [
        Bodies.rectangle(width / 2, fieldMarginY + 20, width, WALL_THICKNESS, {
            isStatic: true, label: 'WallTop', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width / 2, height - fieldMarginY - 13, width, WALL_THICKNESS, {
            isStatic: true, label: 'WallBottom', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX + 102, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true, label: 'WallLeftTop', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX + 102, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 10, {
            isStatic: true, label: 'WallLeftBottom', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 - GOAL_WIDTH / 2 - 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 + 5, {
            isStatic: true, label: 'WallRightTop', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX - 103, height / 2 + GOAL_WIDTH / 2 + 125, WALL_THICKNESS, (height - fieldMarginY * 2 - GOAL_WIDTH) / 2 - 12, {
            isStatic: true, label: 'WallRightBottom', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX - goalDepthOffset + 40, (height / 2) + 5, WALL_THICKNESS, GOAL_WIDTH + 50, {
            isStatic: true, label: 'LeftGoalBack', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 - GOAL_WIDTH / 2 - 20, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true, label: 'LeftGoalTop', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX - goalDepthOffset / 2 + 70, height / 2 + GOAL_WIDTH / 2 + 27, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true, label: 'LeftGoalBottom', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset - 40, height / 2 + 5, WALL_THICKNESS, GOAL_WIDTH + 60, {
            isStatic: true, label: 'RightGoalBack', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 - GOAL_WIDTH / 2 - 18, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true, label: 'RightGoalTop', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX + goalDepthOffset / 2 - 73, height / 2 + GOAL_WIDTH / 2 + 28, goalDepthOffset + 70, WALL_THICKNESS, {
            isStatic: true, label: 'RightGoalBottom', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX / 2 + 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true, label: 'CornerTopLeft', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, fieldMarginY + 10, fieldMarginX, WALL_THICKNESS, {
            isStatic: true, label: 'CornerTopRight', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(fieldMarginX / 2 + 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true, label: 'CornerBottomLeft', render: { fillStyle: 'transparent' }
        }),
        Bodies.rectangle(width - fieldMarginX / 2 - 100, height - fieldMarginY - 7, fieldMarginX, WALL_THICKNESS, {
            isStatic: true, label: 'CornerBottomRight', render: { fillStyle: 'transparent' }
        })
    ];

    // --- CREATE GOALS ---
    var goalLeft = Bodies.rectangle(fieldMarginX + 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true, isSensor: true, label: 'GoalLeft', render: { fillStyle: 'transparent' }
    });

    var goalRight = Bodies.rectangle(width - fieldMarginX - 55, height / 2 + 5, GOAL_DEPTH + 20, GOAL_WIDTH + 16, {
        isStatic: true, isSensor: true, label: 'GoalRight', render: { fillStyle: 'transparent' }
    });

    Composite.add(engine.world, [...walls, goalLeft, goalRight]);

    // --- PLAYER & BALL CREATION ---
    function createPlayer(x, y, team) {
        var texture = team === 'red' ? 'img/red-player.png' : 'img/blue-player.png';
        var body = Bodies.circle(x, y, PLAYER_RADIUS, {
            label: team + 'Player',
            restitution: 0.99,
            frictionAir: 0.008,
            friction: 0.001,
            density: 0.002,
            render: {
                sprite: { texture: texture, xScale: 0.22, yScale: 0.22 },
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
            render: { fillStyle: '#ffffff', strokeStyle: '#000000', lineWidth: 2 }
        });
    }

    // --- RESET POSITIONS ---
    function resetPositions() {
        if (window.gameRunner) {
            Matter.Runner.stop(window.gameRunner);
        }

        if (players.length > 0) Composite.remove(engine.world, players);
        if (ball) Composite.remove(engine.world, ball);
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

        var allBodies = Composite.allBodies(engine.world);
        for (var i = 0; i < allBodies.length; i++) {
            Body.setVelocity(allBodies[i], { x: 0, y: 0 });
            Body.setAngularVelocity(allBodies[i], 0);
        }

        if (window.gameRunner && !gameState.isPaused) {
            Matter.Runner.run(window.gameRunner, window.gameEngine);
        }

        gameState.isTurnActive = false;
        gameState.canShoot = true;
        updateTurnDisplay();
    }

    // --- INPUT HANDLING ---
    var dragStart = null;
    var selectedBody = null;
    var maxForce = 0.09;
    var currentMousePos = null;

    render.canvas.addEventListener('mousedown', handleInputStart);
    render.canvas.addEventListener('touchstart', handleInputStart);
    render.canvas.addEventListener('mousemove', handleMouseMove);
    render.canvas.addEventListener('touchmove', handleMouseMove);
    render.canvas.addEventListener('mouseup', handleInputEnd);
    render.canvas.addEventListener('touchend', handleInputEnd);

    function handleInputStart(e) {
        if (gameState.isPaused || !gameState.canShoot) return;

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

    function handleInputEnd(e) {
        if (!selectedBody || !dragStart) return;

        var rect = render.canvas.getBoundingClientRect();
        var clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        var clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        var x = clientX - rect.left;
        var y = clientY - rect.top;

        var dx = dragStart.x - x;
        var dy = dragStart.y - y;
        var rawDistance = Math.sqrt(dx * dx + dy * dy);
        var forceMagnitude = Math.min(rawDistance * 0.0006, maxForce);

        if (rawDistance > 0.0005) {
            var normalizedDx = dx / rawDistance;
            var normalizedDy = dy / rawDistance;
            var forceVector = Vector.create(normalizedDx * forceMagnitude, normalizedDy * forceMagnitude);
            Body.applyForce(selectedBody, selectedBody.position, forceVector);
            
            // Play kick sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('kick');
            }
            
            gameState.canShoot = false;
            gameState.isTurnActive = true;
        }

        selectedBody = null;
        dragStart = null;
        currentMousePos = null;
    }

    // Draw aim arrow
    Events.on(render, 'afterRender', function () {
        if (selectedBody && dragStart && currentMousePos && gameState.canShoot) {
            var ctx = render.context;
            var dx = dragStart.x - currentMousePos.x;
            var dy = dragStart.y - currentMousePos.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                var arrowLength = Math.min(distance * 2, 150);
                var angle = Math.atan2(dy, dx);
                var endX = selectedBody.position.x + Math.cos(angle) * arrowLength;
                var endY = selectedBody.position.y + Math.sin(angle) * arrowLength;
                var power = Math.min(distance / 100, 1) * 100;

                ctx.strokeStyle = selectedBody.team === 'red' ? '#ff0000' : '#0000ff';
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
                ctx.lineTo(endX - headLength * Math.cos(angle - headAngle), endY - headLength * Math.sin(angle - headAngle));
                ctx.lineTo(endX - headLength * Math.cos(angle + headAngle), endY - headLength * Math.sin(angle + headAngle));
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

    // --- GAME LOOP ---
    Events.on(engine, 'beforeUpdate', function () {
        engine.world.gravity.y = 0;
        engine.world.gravity.x = 0;
        
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
        // Play goal sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.play('goal');
        }
        
        gameState.score[scoringTeam]++;
        scoreRedEls.forEach(el => el.innerText = gameState.score.red);
        scoreBlueEls.forEach(el => el.innerText = gameState.score.blue);

        if (gameState.score[scoringTeam] >= gameState.maxGoals) {
            setTimeout(function () {
                if (window.gameRunner) {
                    Matter.Runner.stop(window.gameRunner);
                }
                endGame(scoringTeam);
            }, 500);
            return;
        }

        gameState.turn = scoringTeam === 'red' ? 'blue' : 'red';
        gameState.canShoot = false;
        
        setTimeout(function() {
            resetPositions();
        }, 1500);
    }

    function resetGame() {
        if (window.gameRunner) {
            Matter.Runner.stop(window.gameRunner);
        }

        if (players.length > 0) Composite.remove(engine.world, players);
        if (ball) Composite.remove(engine.world, ball);
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

        var allBodies = Composite.allBodies(engine.world);
        for (var i = 0; i < allBodies.length; i++) {
            Body.setVelocity(allBodies[i], { x: 0, y: 0 });
            Body.setAngularVelocity(allBodies[i], 0);
        }

        if (window.gameRunner && !gameState.isPaused) {
            Matter.Runner.run(window.gameRunner, window.gameEngine);
        }

        gameState.isTurnActive = false;
        gameState.canShoot = true;
        gameState.score.red = 0;
        gameState.score.blue = 0;
        gameState.turn = 'red';
        gameState.turnCount = 0;
        updateTurnDisplay();
        scoreRedEls.forEach(el => el.innerText = 0);
        scoreBlueEls.forEach(el => el.innerText = 0);
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

    window.gameRunner = runner;
    window.gameEngine = engine;
    window.gameState = gameState;

    updateTurnDisplay();
    resetPositions();

    window.addEventListener('resize', function () {
        render.canvas.width = container.clientWidth;
        render.canvas.height = container.clientHeight;
    });
}

function pauseGame() {
    if (!gameState || gameState.isPaused) return;
    Matter.Runner.stop(window.gameRunner);
    gameState.isPaused = true;
}

function resumeGame() {
    if (!gameState || !gameState.isPaused) return;
    Matter.Runner.run(window.gameRunner, window.gameEngine);
    gameState.isPaused = false;
}

function endGame(winner) {
    // Play win sound
    if (typeof SoundManager !== 'undefined') {
        SoundManager.play('win');
    }
    
    const winnerName = winner === 'red' 
        ? (localStorage.getItem("player1") || "Player 1")
        : (localStorage.getItem("player2") || "Player 2");
    
    const text = winnerName + " WINS!";
    document.getElementById("winnerText").innerText = text;
    
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById("victoryScreen").classList.remove("hidden");
}