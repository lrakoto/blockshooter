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
        let audioCtx = null;

        function ensureAudioCtx() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }

        function playLaserSound() {
            ensureAudioCtx();

            // Main descending sweep — classic sci-fi pew
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);

            // High harmonic for crispness
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(2800, audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc2.start(audioCtx.currentTime);
            osc2.stop(audioCtx.currentTime + 0.08);
        }

        function playExplosionSound() {
            ensureAudioCtx();
            const ac = audioCtx;
            const t = ac.currentTime;

            // Sharp crack — short full-spectrum burst on the attack
            const crackBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
            const crackData = crackBuf.getChannelData(0);
            for (let i = 0; i < crackData.length; i++) crackData[i] = Math.random() * 2 - 1;
            const crack = ac.createBufferSource();
            crack.buffer = crackBuf;
            const crackGain = ac.createGain();
            crack.connect(crackGain);
            crackGain.connect(ac.destination);
            crackGain.gain.setValueAtTime(1.0, t);
            crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            crack.start(t);

            // Low rumble — heavily low-passed noise that lingers
            const rumbleBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.8), ac.sampleRate);
            const rumbleData = rumbleBuf.getChannelData(0);
            for (let i = 0; i < rumbleData.length; i++) rumbleData[i] = Math.random() * 2 - 1;
            const rumble = ac.createBufferSource();
            rumble.buffer = rumbleBuf;
            const lowpass = ac.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(300, t);
            lowpass.frequency.exponentialRampToValueAtTime(60, t + 0.7);
            const rumbleGain = ac.createGain();
            rumble.connect(lowpass);
            lowpass.connect(rumbleGain);
            rumbleGain.connect(ac.destination);
            rumbleGain.gain.setValueAtTime(0.7, t);
            rumbleGain.gain.setValueAtTime(0.5, t + 0.05);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            rumble.start(t);

            // Mid debris — bandpass noise for the shrapnel texture
            const debrisBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.35), ac.sampleRate);
            const debrisData = debrisBuf.getChannelData(0);
            for (let i = 0; i < debrisData.length; i++) debrisData[i] = Math.random() * 2 - 1;
            const debris = ac.createBufferSource();
            debris.buffer = debrisBuf;
            const bandpass = ac.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 800;
            bandpass.Q.value = 0.8;
            const debrisGain = ac.createGain();
            debris.connect(bandpass);
            bandpass.connect(debrisGain);
            debrisGain.connect(ac.destination);
            debrisGain.gain.setValueAtTime(0.4, t);
            debrisGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            debris.start(t);
        }

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

        // Muzzle flash starburst at the barrel tip
        function drawMuzzleFlash(x, y) {
            ctx.save();
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 25;
            // Outer glow
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#88ccff';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
            // Bright core
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            // Radial spikes
            ctx.strokeStyle = '#aaddff';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.75;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
                ctx.stroke();
            }
            ctx.restore();
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
            ctx.globalAlpha = alpha * 0.3;
            ctx.shadowColor = '#0066ff';
            ctx.shadowBlur = 40;
            ctx.strokeStyle = '#0044ff';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Mid glow
            ctx.globalAlpha = alpha * 0.8;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#4499ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Bright white core
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
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
                l.alpha -= 0.15;
            });
        }

        // Spawn explosion particles at hit position
        function spawnExplosion(x, y) {
            playExplosionSound();
            const colors = ['#1bffc1', '#ffffff', '#ffff00', '#18B5D5', '#ff4444'];
            for (let i = 0; i < 22; i++) {
                const angle = (Math.PI * 2 / 22) * i + (Math.random() - 0.5) * 0.8;
                const speed = 1.5 + Math.random() * 5;
                particles.push({
                    x: x + (Math.random() - 0.5) * 6,
                    y: y + (Math.random() - 0.5) * 6,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 2.5,
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
            playLaserSound();

            // Add a laser trail — glow + afterimage handled by renderLaserTrails()
            laserTrails.push({ x1: centerX, y1: centerY, x2: cursorPosX, y2: cursorPosY, alpha: 1 });

            // Brief muzzle flash at the barrel tip
            const fireInterval = setInterval(function() {
                turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 30, 'white', 5);
                turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 25, 'black', 5);
                const dx = cursorPosX - centerX;
                const dy = cursorPosY - centerY;
                const mag = Math.sqrt(dx * dx + dy * dy);
                if (mag > 0) {
                    const s = Math.min(25, mag) / mag;
                    drawMuzzleFlash(centerX + dx * s, centerY + dy * s);
                }
            }, 10);
            setTimeout(() => clearInterval(fireInterval), 50);

            // Ray hit detection — check distance from each enemy center to the
            // laser line segment (turret → click), not just the click point
            const x1 = centerX, y1 = centerY;
            const x2 = event.offsetX, y2 = event.offsetY;
            const dx = x2 - x1, dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            enemies = enemies.filter(e => {
                // Project enemy onto the ray, clamp to segment, measure distance
                const t = lenSq > 0
                    ? Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / lenSq))
                    : 0;
                const nearX = x1 + t * dx, nearY = y1 + t * dy;
                const hit = Math.hypot(e.x - nearX, e.y - nearY) < 10;
                if (hit) { addScore(); spawnExplosion(e.x, e.y); }
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
