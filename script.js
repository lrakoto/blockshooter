// Main event listener
    window.addEventListener('DOMContentLoaded', function() {
        // Grab DOM Elements
        const gameCanvas = document.querySelector('#gamecanvas');
        const startMenu = document.querySelector('#startmenu');
        const winMenu = document.querySelector('#winmenu');
        const loseMenu = document.querySelector('#losemenu');
        const returnMenuWin = document.querySelector('#returntomenuwin');
        const returnMenuLose = document.querySelector('#returntomenulose');
        const resetWin = document.querySelector('#resetwin');
        const resetLose = document.querySelector('#resetlose');
        const topBar = document.querySelector('#topbar');
        const bottomBar = document.querySelector('#bottombar');
        const healthText = document.querySelector('#healthtext');
        const scoreBoard = document.querySelector('#score');
        const startButton = document.querySelector('#startbutton');
        const livesText = document.querySelector('#lives');
        const healthBar = document.querySelector('#health');
        const turret = document.querySelector('#turret');
        const laserSound = document.querySelector('#laser');
        const ctx = gameCanvas.getContext('2d');

        // Canvas Setup
        gameCanvas.setAttribute('height', getComputedStyle(gameCanvas)['height']);
        gameCanvas.setAttribute('width', getComputedStyle(gameCanvas)['width']);
        const canvasWidth = parseInt(getComputedStyle(gameCanvas)['width']);
        const canvasHeight = parseInt(getComputedStyle(gameCanvas)['height']);
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Game state object
        let state = {};

        // Enemies as array of objects instead of parallel coord arrays
        let enemies = [];

        // Explosion particles
        let particles = [];

        // Laser trail afterimages
        let laserTrails = [];

        // Cursor position
        let cursorPosX = centerX;
        let cursorPosY = 0;

        // Interval references — tracked so all can be cleared on reset
        let gameLoopInt = null;
        let spawnInt = null;
        let moveInt = null;

        // Create Classes
        class Player {
            constructor(x, y, width, height) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;

                this.render = function() {
                    ctx.drawImage(turret, this.x, this.y, this.width, this.height);
                }
            }
        }

        // Create player class instance
        const playerTurret = new Player(centerX - 25, centerY - 25, 50, 50);

        // Canvas event listeners
        gameCanvas.addEventListener('mousemove', function(e) {
            cursorPosX = e.clientX - gameCanvas.offsetLeft;
            cursorPosY = e.clientY - gameCanvas.offsetTop;
        });
        gameCanvas.addEventListener('mousedown', fireAction);

        // Spawn enemy with exclusion zone around player
        function spawnEnemy() {
            let x, y;
            const exclusionRadius = 100;
            do {
                x = Math.floor(Math.random() * canvasWidth) - 15;
                y = Math.floor(Math.random() * canvasHeight) - 15;
            } while (Math.hypot(x - centerX, y - centerY) < exclusionRadius);
            enemies.push({ x, y });
        }

        // Enemy movement — mutates enemy objects directly
        function moveEnemies() {
            enemies.forEach(e => {
                const angle = Math.atan2(centerY - e.y, centerX - e.x);
                e.x += Math.cos(angle) * state.perFrameDistance;
                e.y += Math.sin(angle) * state.perFrameDistance;
            });
        }

        // Render enemies
        function renderEnemies() {
            ctx.fillStyle = '#1bffc1';
            enemies.forEach(e => {
                ctx.fillRect(e.x - 7, e.y - 7, 11, 11);
            });
        }

        // Turret Barrel — merged barrel and flash into one function
        function turretBarrel(x1, y1, x2, y2, maxLen, color, lineWidth) {
            const vx = x2 - x1;
            const vy = y2 - y1;
            const mag = Math.sqrt(vx * vx + vy * vy);
            const scale = mag > maxLen ? maxLen / mag : 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + vx * scale, y1 + vy * scale);
            ctx.stroke();
        }

        // Turret Muzzle Target
        function turretTarget(x, y) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Draw a single glowing laser beam at a given opacity
        function drawLaser(x1, y1, x2, y2, alpha) {
            ctx.save();
            ctx.lineCap = 'round';

            // Outer wide glow
            ctx.globalAlpha = alpha * 0.2;
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Mid glow
            ctx.globalAlpha = alpha * 0.6;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ffee44';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Bright white core
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.restore();
        }

        // Render and fade all active laser trails
        function renderLaserTrails() {
            laserTrails = laserTrails.filter(l => l.alpha > 0);
            laserTrails.forEach(l => {
                drawLaser(l.x1, l.y1, l.x2, l.y2, l.alpha);
                l.alpha -= 0.07;
            });
        }

        // Spawn explosion particles at hit position
        function spawnExplosion(x, y) {
            const colors = ['#1bffc1', '#ffffff', '#ffff00', '#18B5D5'];
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 / 10) * i + (Math.random() - 0.5) * 0.6;
                const speed = 2 + Math.random() * 3;
                particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 3,
                    alpha: 1,
                    color: colors[Math.floor(Math.random() * colors.length)]
                });
            }
        }

        // Render and update explosion particles
        function renderParticles() {
            particles = particles.filter(p => p.alpha > 0);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // slight gravity
                p.size *= 0.90;
                p.alpha -= 0.05;
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            });
            ctx.globalAlpha = 1;
        }

        // Turret Fire Action
        function fireAction(event) {
            laserSound.currentTime = 0;
            laserSound.play().catch(() => {});

            // Add a laser trail — glow + afterimage handled by renderLaserTrails()
            laserTrails.push({ x1: centerX, y1: centerY, x2: cursorPosX, y2: cursorPosY, alpha: 1 });

            // Brief muzzle flash on the barrel
            const fireInterval = setInterval(function() {
                turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 30, 'white', 5);
                turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 25, 'black', 5);
            }, 10);
            setTimeout(() => clearInterval(fireInterval), 50);

            // Hit detection — single pass, enemies truly removed via filter
            enemies = enemies.filter(e => {
                const hit =
                    event.offsetX >= e.x - 8 && event.offsetX <= e.x + 8 &&
                    event.offsetY >= e.y - 8 && event.offsetY <= e.y + 8;
                if (hit) {
                    addScore();
                    spawnExplosion(e.x, e.y);
                }
                return !hit;
            });
        }

        // Score Tally
        function addScore() {
            state.score += 100;
            scoreBoard.textContent = state.score;
        }

        // Scale difficulty — thresholds shifted earlier so player experiences
        // harder speeds before the 3000 win condition is reached
        function scaleDifficulty() {
            const s = state.score;
            if      (s >= 4000) state.perFrameDistance += 0.01;
            else if (s >= 2400) state.perFrameDistance = 0.9;
            else if (s >= 1800) state.perFrameDistance = 0.7;
            else if (s >= 1200) state.perFrameDistance = 0.5;
            else if (s >= 700)  state.perFrameDistance = 0.3;
            else if (s >= 300)  state.perFrameDistance = 0.2;
        }

        // Enemy hits player detection — true removal via filter
        function hitDetect() {
            enemies = enemies.filter(e => {
                const hit =
                    Math.abs(e.x - centerX) < 15 &&
                    Math.abs(e.y - centerY) < 15;
                if (hit) takeHealth();
                return !hit;
            });
        }

        // Remove Health
        function takeHealth() {
            state.health = Math.max(0, state.health - 5);
            healthBar.style.width = `${state.health}%`;
        }

        // Game loop function
        function gameLoop() {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            playerTurret.render();
            turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 25, 'black', 5);
            turretTarget(cursorPosX, cursorPosY);
            renderEnemies();
            renderLaserTrails();
            renderParticles();
            scaleDifficulty();
            hitDetect();

            if (state.score >= 3000 && state.health > 0) {
                gameWin();
            } else if (state.health <= 0 && state.lives > 0) {
                state.lives--;
                livesText.textContent = state.lives;
                state.health = 100;
                healthBar.style.width = '100%';
            } else if (state.health <= 0 && state.lives === 0) {
                gameLose();
            }
        }

        // Reset all game state
        function defaults() {
            state = {
                score: 0,
                health: 100,
                lives: 3,
                perFrameDistance: 0.1
            };
            enemies = [];
            particles = [];
            laserTrails = [];
            scoreBoard.textContent = '0';
            livesText.textContent = '3';
            healthBar.style.width = '100%';
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }

        // Clear all running intervals
        function clearAllIntervals() {
            clearInterval(gameLoopInt);
            clearInterval(spawnInt);
            clearInterval(moveInt);
            gameLoopInt = null;
            spawnInt = null;
            moveInt = null;
        }

        // Start all game intervals
        function startIntervals() {
            gameLoopInt = setInterval(gameLoop, 30);
            spawnInt = setInterval(spawnEnemy, 1000);
            moveInt = setInterval(moveEnemies, 20);
        }

        // Show/hide game HUD
        function showGame() {
            bottomBar.style.display = 'flex';
            topBar.style.display = 'flex';
            healthText.style.display = 'inline-block';
        }
        function hideGame() {
            bottomBar.style.display = 'none';
            topBar.style.display = 'none';
            healthText.style.display = 'none';
        }

        // Game functions
        startButton.addEventListener('click', function() {
            startMenu.style.display = 'none';
            showGame();
            defaults();
            startIntervals();
        });

        returnMenuWin.addEventListener('click', function() {
            winMenu.style.display = 'none';
            startMenu.style.display = 'block';
            hideGame();
            defaults();
        });

        returnMenuLose.addEventListener('click', function() {
            loseMenu.style.display = 'none';
            startMenu.style.display = 'block';
            hideGame();
            defaults();
        });

        resetWin.addEventListener('click', function() {
            winMenu.style.display = 'none';
            showGame();
            defaults();
            startIntervals();
        });

        resetLose.addEventListener('click', function() {
            loseMenu.style.display = 'none';
            showGame();
            defaults();
            startIntervals();
        });

        // End States
        function gameWin() {
            clearAllIntervals();
            winMenu.style.display = 'block';
            hideGame();
        }
        function gameLose() {
            clearAllIntervals();
            loseMenu.style.display = 'block';
            hideGame();
        }
    }

)
