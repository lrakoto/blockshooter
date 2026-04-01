// Main event listener
window.addEventListener('DOMContentLoaded', function() {

    // --- DOM Elements ---
    const gameCanvas     = document.querySelector('#gamecanvas');
    const startMenu      = document.querySelector('#startmenu');
    const winMenu        = document.querySelector('#winmenu');
    const loseMenu       = document.querySelector('#losemenu');
    const levelMenu      = document.querySelector('#levelmenu');
    const returnMenuWin  = document.querySelector('#returntomenuwin');
    const returnMenuLose = document.querySelector('#returntomenulose');
    const resetWin       = document.querySelector('#resetwin');
    const resetLose      = document.querySelector('#resetlose');
    const continueBtn    = document.querySelector('#continuebutton');
    const topBar         = document.querySelector('#topbar');
    const bottomBar      = document.querySelector('#bottombar');
    const healthText     = document.querySelector('#healthtext');
    const scoreBoard     = document.querySelector('#score');
    const startButton    = document.querySelector('#startbutton');
    const livesText      = document.querySelector('#lives');
    const healthBar      = document.querySelector('#health');
    const turret         = document.querySelector('#turret');
    const creditsDisplay = document.querySelector('#credits');
    const weaponDisplay  = document.querySelector('#activeweapon');
    const levelDisplay   = document.querySelector('#levelnum');
    const levelHeading   = document.querySelector('#levelheading');
    const levelDesc      = document.querySelector('#leveldesc');
    const shopCredits    = document.querySelector('#shopcredits');
    const weaponShop     = document.querySelector('#weaponshop');
    const ctx            = gameCanvas.getContext('2d');

    // --- Audio ---
    let audioCtx = null;

    function ensureAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playLaserSound() {
        ensureAudioCtx();
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2); gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2800, t);
        osc2.frequency.exponentialRampToValueAtTime(200, t + 0.08);
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc2.start(t); osc2.stop(t + 0.08);
    }

    function playExplosionSound() {
        ensureAudioCtx();
        const ac = audioCtx;
        const t = ac.currentTime;
        // Low thump — body of the explosion
        const thump = ac.createOscillator();
        const thumpGain = ac.createGain();
        thump.connect(thumpGain); thumpGain.connect(ac.destination);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(160, t);
        thump.frequency.exponentialRampToValueAtTime(35, t + 0.18);
        thumpGain.gain.setValueAtTime(0.9, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        thump.start(t); thump.stop(t + 0.22);
        // Initial crack — filtered so it's not too sharp/tinny
        const crackLen = Math.floor(ac.sampleRate * 0.04);
        const crackBuf = ac.createBuffer(1, crackLen, ac.sampleRate);
        const cd = crackBuf.getChannelData(0);
        for (let i = 0; i < crackLen; i++) cd[i] = Math.random() * 2 - 1;
        const crack = ac.createBufferSource();
        crack.buffer = crackBuf;
        const crackLP = ac.createBiquadFilter();
        crackLP.type = 'lowpass'; crackLP.frequency.value = 2200;
        const crackGain = ac.createGain();
        crack.connect(crackLP); crackLP.connect(crackGain); crackGain.connect(ac.destination);
        crackGain.gain.setValueAtTime(1.0, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        crack.start(t);
        // Debris tail — bandpass noise + slowing LFO, fades fully before stopping
        const tailDur = 1.1;
        const bitsLen = Math.floor(ac.sampleRate * tailDur);
        const bitsBuf = ac.createBuffer(1, bitsLen, ac.sampleRate);
        const bd = bitsBuf.getChannelData(0);
        for (let i = 0; i < bitsLen; i++) bd[i] = Math.random() * 2 - 1;
        const bits = ac.createBufferSource();
        bits.buffer = bitsBuf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(700, t);
        bp.frequency.exponentialRampToValueAtTime(150, t + tailDur);
        bp.Q.value = 0.6;
        const bitsGain = ac.createGain();
        bitsGain.gain.setValueAtTime(0.5, t + 0.03);
        bitsGain.gain.exponentialRampToValueAtTime(0.001, t + tailDur - 0.12); // silent before stop
        const lfoAmpGain = ac.createGain();
        lfoAmpGain.gain.setValueAtTime(0.5, t + 0.03);
        lfoAmpGain.gain.linearRampToValueAtTime(0.0, t + tailDur - 0.15); // LFO fades out cleanly
        const lfo = ac.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(55, t + 0.03);
        lfo.frequency.linearRampToValueAtTime(8, t + tailDur);
        lfo.connect(lfoAmpGain); lfoAmpGain.connect(bitsGain.gain);
        bits.connect(bp); bp.connect(bitsGain); bitsGain.connect(ac.destination);
        bits.start(t + 0.03); lfo.start(t + 0.03);
        bits.stop(t + tailDur); lfo.stop(t + tailDur);
    }

    function playGatlingSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const len = Math.floor(ac.sampleRate * 0.025);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2.5;
        const gain = ac.createGain();
        src.connect(bp); bp.connect(gain); gain.connect(ac.destination);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        src.start(t);
    }

    function playShotgunSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const thump = ac.createOscillator();
        const tGain = ac.createGain();
        thump.connect(tGain); tGain.connect(ac.destination);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(110, t);
        thump.frequency.exponentialRampToValueAtTime(28, t + 0.13);
        tGain.gain.setValueAtTime(0.75, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        thump.start(t); thump.stop(t + 0.16);
        const len = Math.floor(ac.sampleRate * 0.13);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1400;
        const gain = ac.createGain();
        src.connect(lp); lp.connect(gain); gain.connect(ac.destination);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        src.start(t);
    }

    function playRailgunSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.07);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.start(t); osc.stop(t + 0.09);
        // Metallic ring decay
        const ring = ac.createOscillator();
        const rGain = ac.createGain();
        ring.connect(rGain); rGain.connect(ac.destination);
        ring.type = 'sine';
        ring.frequency.setValueAtTime(3400, t);
        ring.frequency.linearRampToValueAtTime(2900, t + 0.35);
        rGain.gain.setValueAtTime(0.18, t);
        rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        ring.start(t); ring.stop(t + 0.35);
    }

    // --- Canvas Setup ---
    gameCanvas.setAttribute('height', getComputedStyle(gameCanvas)['height']);
    gameCanvas.setAttribute('width', getComputedStyle(gameCanvas)['width']);
    const canvasWidth  = parseInt(getComputedStyle(gameCanvas)['width']);
    const canvasHeight = parseInt(getComputedStyle(gameCanvas)['height']);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // --- Game Constants ---

    // 5 levels — killsToNext: kills needed to advance, spawnInterval: ms between spawns
    const LEVELS = [
        { killsToNext: 8,  spawnInterval: 1000, toughChance: 0,    eliteChance: 0 },
        { killsToNext: 12, spawnInterval: 850,  toughChance: 0.35,  eliteChance: 0 },
        { killsToNext: 15, spawnInterval: 700,  toughChance: 0.5,   eliteChance: 0.15 },
        { killsToNext: 18, spawnInterval: 580,  toughChance: 0.55,  eliteChance: 0.3 },
        { killsToNext: 20, spawnInterval: 480,  toughChance: 0.5,   eliteChance: 0.45 },
    ];

    // Enemy speed per level
    const LEVEL_SPEEDS = [0.15, 0.28, 0.45, 0.65, 0.9];

    // Shown on the level-up screen (index = new level - 1)
    const LEVEL_DESCS = [
        '',
        'Tougher blocks are joining the assault. Orange blocks take 2 hits.',
        'Elite red blocks have appeared. They require 3 hits to destroy.',
        'Forces are overwhelming. Upgrade your arsenal before re-deploying.',
        'Final wave. Maximum threat level. Hold the line, Cadet.',
    ];

    // Weapons: cost 0 = default (always owned), cooldown in ms
    const WEAPONS = {
        laser:   { name: 'LASER',   desc: 'Single precision beam.',                cost: 0,   cooldown: 250  },
        gatling: { name: 'GATLING', desc: 'Rapid kinetic rounds. High fire rate.',  cost: 350, cooldown: 65   },
        shotgun: { name: 'SHOTGUN', desc: '6 pellets wide cone. Short range.',      cost: 300, cooldown: 500  },
        railgun: { name: 'RAILGUN', desc: 'Piercing slug. 2 damage per enemy hit.', cost: 500, cooldown: 800  },
        rocket:  { name: 'ROCKET',  desc: 'AOE blast. Large radius. Slow reload.',  cost: 600, cooldown: 1400 },
    };

    // --- Game State ---
    let state = {};
    let enemies     = [];
    let particles   = [];
    let laserTrails = [];
    let bombEffects = [];
    let rocketTrails = [];

    let gameLoopInt = null;
    let spawnInt    = null;
    let moveInt     = null;

    let cursorPosX = centerX;
    let cursorPosY = 0;

    // --- Player ---
    class Player {
        constructor(x, y, width, height) {
            this.x = x; this.y = y; this.width = width; this.height = height;
            this.render = () => ctx.drawImage(turret, this.x, this.y, this.width, this.height);
        }
    }
    const playerTurret = new Player(centerX - 25, centerY - 25, 50, 50);

    // --- Input ---
    gameCanvas.addEventListener('mousemove', e => {
        cursorPosX = e.clientX - gameCanvas.offsetLeft;
        cursorPosY = e.clientY - gameCanvas.offsetTop;
    });
    gameCanvas.addEventListener('mousedown', fireAction);

    // Keys 1-5 switch active weapon (if owned)
    window.addEventListener('keydown', e => {
        const map = { '1': 'laser', '2': 'gatling', '3': 'shotgun', '4': 'railgun', '5': 'rocket' };
        const w = map[e.key];
        if (w && state.weapons && state.weapons.includes(w)) setWeapon(w);
    });

    function setWeapon(key) {
        state.activeWeapon = key;
        state.fireCooldown = WEAPONS[key].cooldown;
        weaponDisplay.textContent = WEAPONS[key].name;
    }

    // --- Level Helpers ---
    function getLevelDef() {
        return LEVELS[Math.min(state.level - 1, LEVELS.length - 1)];
    }

    function getEnemyHp() {
        const def = getLevelDef();
        const r = Math.random();
        if (r < def.eliteChance) return 3;
        if (r < def.eliteChance + def.toughChance) return 2;
        return 1;
    }

    function getEnemyColor(hp) {
        if (hp >= 3) return '#ff3333';
        if (hp === 2) return '#ff8800';
        return '#1bffc1';
    }

    // --- Enemies ---
    function spawnEnemy() {
        let x, y;
        do {
            x = Math.floor(Math.random() * canvasWidth) - 15;
            y = Math.floor(Math.random() * canvasHeight) - 15;
        } while (Math.hypot(x - centerX, y - centerY) < 100);
        const hp = getEnemyHp();
        enemies.push({ x, y, hp, maxHp: hp, hitTimer: 0 });
    }

    function moveEnemies() {
        enemies.forEach(e => {
            const angle = Math.atan2(centerY - e.y, centerX - e.x);
            e.x += Math.cos(angle) * state.perFrameDistance;
            e.y += Math.sin(angle) * state.perFrameDistance;
        });
    }

    function renderEnemies() {
        enemies.forEach(e => {
            if (e.hitTimer > 0) e.hitTimer--;
            // Flash white on hit, otherwise color by HP
            ctx.fillStyle = e.hitTimer > 0 ? '#ffffff' : getEnemyColor(e.hp);
            ctx.fillRect(e.x - 7, e.y - 7, 11, 11);
            // HP bar above multi-HP enemies
            if (e.maxHp > 1) {
                const bw = 16, bh = 3, bx = e.x - 8, by = e.y - 14;
                ctx.fillStyle = '#222';
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = getEnemyColor(e.hp);
                ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
            }
        });
    }

    // --- Drawing Helpers ---
    function turretBarrel(x1, y1, x2, y2, maxLen, color, lineWidth) {
        const vx = x2 - x1, vy = y2 - y1;
        const mag = Math.sqrt(vx * vx + vy * vy);
        const scale = mag > maxLen ? maxLen / mag : 1;
        ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + vx * scale, y1 + vy * scale); ctx.stroke();
    }

    function drawMuzzleFlash(x, y) {
        ctx.save();
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.4; ctx.fillStyle = '#88ccff';
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); ctx.stroke();
        }
        ctx.restore();
    }

    function turretTarget(x, y) {
        ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 20, 0, 2 * Math.PI); ctx.stroke();
    }

    function drawLaser(x1, y1, x2, y2, alpha) {
        ctx.save(); ctx.lineCap = 'round';
        ctx.globalAlpha = alpha * 0.3; ctx.shadowColor = '#0066ff'; ctx.shadowBlur = 40;
        ctx.strokeStyle = '#0044ff'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = alpha * 0.8; ctx.shadowBlur = 20;
        ctx.strokeStyle = '#4499ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = alpha; ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
    }

    function drawTrail(l) {
        if (!l.type || l.type === 'laser') {
            drawLaser(l.x1, l.y1, l.x2, l.y2, l.alpha);
        } else if (l.type === 'bullet') {
            // Short muzzle tracer from center in shot direction
            const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
            const mag = Math.hypot(dx, dy) || 1;
            ctx.save();
            ctx.globalAlpha = l.alpha;
            ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 12;
            ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x1 + (dx / mag) * 45, l.y1 + (dy / mag) * 45);
            ctx.stroke();
            ctx.restore();
        } else if (l.type === 'shell') {
            // Shotgun pellet — warm orange line to range endpoint
            ctx.save();
            ctx.globalAlpha = l.alpha;
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
            ctx.restore();
        } else if (l.type === 'rail') {
            // Silver/indigo full-length piercing streak
            ctx.save();
            ctx.lineCap = 'round';
            ctx.globalAlpha = l.alpha * 0.4;
            ctx.shadowColor = '#aabbff'; ctx.shadowBlur = 35;
            ctx.strokeStyle = '#6677cc'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
            ctx.globalAlpha = l.alpha;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
            ctx.restore();
        }
    }

    function renderLaserTrails() {
        laserTrails = laserTrails.filter(l => l.alpha > 0);
        laserTrails.forEach(l => {
            drawTrail(l);
            const fadeRate = l.type === 'bullet' ? 0.3 : l.type === 'shell' ? 0.25 : 0.15;
            l.alpha -= fadeRate;
        });
    }

    function renderBombEffects() {
        bombEffects = bombEffects.filter(b => b.alpha > 0);
        bombEffects.forEach(b => {
            ctx.save();
            ctx.globalAlpha = b.alpha;
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = b.alpha * 0.15;
            ctx.fillStyle = '#ff6600'; ctx.fill();
            ctx.restore();
            b.radius += 5; b.alpha -= 0.06;
        });
    }

    function renderRocketTrails() {
        rocketTrails = rocketTrails.filter(r => {
            r.progress += 0.09;
            if (r.progress >= 1) {
                bombEffects.push({ x: r.x2, y: r.y2, radius: 5, alpha: 1 });
                return false;
            }
            return true;
        });
        rocketTrails.forEach(r => {
            const rx = r.x1 + (r.x2 - r.x1) * r.progress;
            const ry = r.y1 + (r.y2 - r.y1) * r.progress;
            const dx = r.x2 - r.x1, dy = r.y2 - r.y1;
            const mag = Math.hypot(dx, dy) || 1;
            ctx.save();
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 18;
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - (dx / mag) * 22, ry - (dy / mag) * 22);
            ctx.stroke();
            ctx.restore();
        });
    }

    // --- Particles ---
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

    function renderParticles() {
        particles = particles.filter(p => p.alpha > 0);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.15;
            p.size *= 0.90; p.alpha -= 0.05;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.globalAlpha = 1;
    }

    // --- Hit Logic ---

    // Returns false (remove enemy) if dead, true (keep) if still alive
    function hitEnemy(e, damage = 1) {
        e.hp -= damage;
        if (e.hp <= 0) {
            state.levelKills++;
            state.kills++;
            addScore(e.maxHp * 100);
            addCredits(e.maxHp * 75);
            spawnExplosion(e.x, e.y);
            return false;
        }
        e.hitTimer = 6; // flash white for 6 frames
        return true;
    }

    // Point-to-line-segment distance check for ray hit detection
    function rayHitsEnemy(e, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq > 0
            ? Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / lenSq))
            : 0;
        return Math.hypot(e.x - (x1 + t * dx), e.y - (y1 + t * dy)) < 10;
    }

    // --- Fire ---
    function fireAction(event) {
        if (!state.weapons) return;
        const now = Date.now();
        if (now - state.lastFired < state.fireCooldown) return;
        state.lastFired = now;

        const tx = event.offsetX, ty = event.offsetY;

        // Muzzle flash at barrel tip
        const fireInterval = setInterval(function() {
            turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 30, 'white', 5);
            turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 25, 'black', 5);
            const dx = cursorPosX - centerX, dy = cursorPosY - centerY;
            const mag = Math.sqrt(dx * dx + dy * dy);
            if (mag > 0) {
                const s = Math.min(25, mag) / mag;
                drawMuzzleFlash(centerX + dx * s, centerY + dy * s);
            }
        }, 10);
        setTimeout(() => clearInterval(fireInterval), 50);

        const w = state.activeWeapon;

        if (w === 'laser') {
            playLaserSound();
            laserTrails.push({ x1: centerX, y1: centerY, x2: tx, y2: ty, alpha: 1, type: 'laser' });
            let firstHit = false;
            enemies = enemies.filter(e => {
                if (!firstHit && rayHitsEnemy(e, centerX, centerY, tx, ty)) {
                    firstHit = true; return hitEnemy(e);
                }
                return true;
            });

        } else if (w === 'gatling') {
            playGatlingSound();
            laserTrails.push({ x1: centerX, y1: centerY, x2: tx, y2: ty, alpha: 1, type: 'bullet' });
            let firstHit = false;
            enemies = enemies.filter(e => {
                if (!firstHit && rayHitsEnemy(e, centerX, centerY, tx, ty)) {
                    firstHit = true; return hitEnemy(e);
                }
                return true;
            });

        } else if (w === 'shotgun') {
            playShotgunSound();
            const baseAngle = Math.atan2(ty - centerY, tx - centerX);
            const range = Math.min(canvasWidth, canvasHeight) * 0.65;
            for (let i = 0; i < 6; i++) {
                const spread = 0.70;
                const offset = -spread / 2 + (spread / 5) * i + (Math.random() - 0.5) * 0.1;
                const a = baseAngle + offset;
                const ex = centerX + Math.cos(a) * range;
                const ey = centerY + Math.sin(a) * range;
                laserTrails.push({ x1: centerX, y1: centerY, x2: ex, y2: ey, alpha: 1, type: 'shell' });
                let firstHit = false;
                enemies = enemies.filter(e => {
                    if (!firstHit && rayHitsEnemy(e, centerX, centerY, ex, ey)) {
                        firstHit = true; return hitEnemy(e);
                    }
                    return true;
                });
            }

        } else if (w === 'railgun') {
            playRailgunSound();
            laserTrails.push({ x1: centerX, y1: centerY, x2: tx, y2: ty, alpha: 1, type: 'rail' });
            enemies = enemies.filter(e => {
                if (rayHitsEnemy(e, centerX, centerY, tx, ty)) return hitEnemy(e, 2);
                return true;
            });

        } else if (w === 'rocket') {
            playExplosionSound();
            rocketTrails.push({ x1: centerX, y1: centerY, x2: tx, y2: ty, progress: 0 });
            const bombR = 130;
            enemies = enemies.filter(e => {
                if (Math.hypot(e.x - tx, e.y - ty) < bombR) return hitEnemy(e);
                return true;
            });
        }
    }

    // --- Score / Credits ---
    function addScore(points) {
        state.score += points;
        scoreBoard.textContent = state.score;
    }

    function addCredits(amount) {
        state.credits += amount;
        creditsDisplay.textContent = state.credits;
    }

    // --- Player Damage ---
    function hitDetect() {
        enemies = enemies.filter(e => {
            const hit = Math.abs(e.x - centerX) < 15 && Math.abs(e.y - centerY) < 15;
            if (hit) takeHealth();
            return !hit;
        });
    }

    function takeHealth() {
        state.health = Math.max(0, state.health - 5);
        healthBar.style.width = `${state.health}%`;
    }

    // --- Level Up ---
    function checkLevelUp() {
        const def = getLevelDef();
        if (state.levelKills < def.killsToNext) return;
        clearAllIntervals();
        enemies = [];
        if (state.level >= LEVELS.length) {
            gameWin();
        } else {
            state.level++;
            state.levelKills = 0;
            levelDisplay.textContent = state.level;
            showLevelUpScreen();
        }
    }

    function showLevelUpScreen() {
        levelHeading.textContent = `LEVEL ${state.level}`;
        levelDesc.textContent = LEVEL_DESCS[state.level - 1] || '';
        shopCredits.textContent = state.credits;
        populateShop();
        levelMenu.style.display = 'block';
        hideGame();
    }

    function hideLevelUpScreen() {
        levelMenu.style.display = 'none';
    }

    function populateShop() {
        weaponShop.innerHTML = '';
        Object.entries(WEAPONS).forEach(([key, w]) => {
            const owned    = state.weapons.includes(key);
            const isActive = state.activeWeapon === key;

            const card = document.createElement('div');
            card.className = 'weapon-card' + (isActive ? ' active-weapon' : '');

            const nameEl = document.createElement('div');
            nameEl.className = 'weapon-name';
            nameEl.textContent = w.name;

            const descEl = document.createElement('div');
            descEl.className = 'weapon-desc';
            descEl.textContent = w.desc;

            const actionEl = document.createElement('div');
            actionEl.className = 'weapon-action';

            if (isActive) {
                actionEl.innerHTML = '<span class="weapon-status">EQUIPPED</span>';
            } else if (owned) {
                const btn = document.createElement('button');
                btn.textContent = 'EQUIP';
                btn.onclick = () => {
                    setWeapon(key);
                    populateShop();
                    shopCredits.textContent = state.credits;
                };
                actionEl.appendChild(btn);
            } else {
                const btn = document.createElement('button');
                btn.textContent = `${w.cost} CR`;
                btn.disabled = state.credits < w.cost;
                btn.onclick = () => {
                    if (state.credits < w.cost) return;
                    state.credits -= w.cost;
                    state.weapons.push(key);
                    setWeapon(key);
                    creditsDisplay.textContent = state.credits;
                    shopCredits.textContent = state.credits;
                    populateShop();
                };
                actionEl.appendChild(btn);
            }

            card.appendChild(nameEl);
            card.appendChild(descEl);
            card.appendChild(actionEl);
            weaponShop.appendChild(card);
        });
    }

    // --- Game Loop ---
    function gameLoop() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        playerTurret.render();
        turretBarrel(centerX, centerY, cursorPosX, cursorPosY, 25, 'black', 5);
        turretTarget(cursorPosX, cursorPosY);
        renderEnemies();
        renderLaserTrails();
        renderRocketTrails();
        renderBombEffects();
        renderParticles();
        hitDetect();
        checkLevelUp();

        if (state.health <= 0 && state.lives > 0) {
            state.lives--;
            livesText.textContent = state.lives;
            state.health = 100;
            healthBar.style.width = '100%';
        } else if (state.health <= 0 && state.lives === 0) {
            gameLose();
        }
    }

    // --- HUD ---
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

    // --- Reset ---
    function defaults() {
        state = {
            score: 0,
            health: 100,
            lives: 3,
            perFrameDistance: LEVEL_SPEEDS[0],
            level: 1,
            levelKills: 0,
            kills: 0,
            credits: 0,
            weapons: ['laser'],
            activeWeapon: 'laser',
            fireCooldown: WEAPONS.laser.cooldown,
            lastFired: 0,
        };
        enemies = []; particles = []; laserTrails = []; bombEffects = []; rocketTrails = [];
        scoreBoard.textContent = '0';
        livesText.textContent = '3';
        creditsDisplay.textContent = '0';
        weaponDisplay.textContent = 'LASER';
        levelDisplay.textContent = '1';
        healthBar.style.width = '100%';
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    function clearAllIntervals() {
        clearInterval(gameLoopInt);
        clearInterval(spawnInt);
        clearInterval(moveInt);
        gameLoopInt = null; spawnInt = null; moveInt = null;
    }

    function startIntervals() {
        const def = getLevelDef();
        state.perFrameDistance = LEVEL_SPEEDS[Math.min(state.level - 1, LEVEL_SPEEDS.length - 1)];
        gameLoopInt = setInterval(gameLoop, 30);
        spawnInt    = setInterval(spawnEnemy, def.spawnInterval);
        moveInt     = setInterval(moveEnemies, 20);
    }

    // --- Button Listeners ---
    startButton.addEventListener('click', function() {
        startMenu.style.display = 'none';
        showGame(); defaults(); startIntervals();
    });

    continueBtn.addEventListener('click', function() {
        hideLevelUpScreen();
        showGame(); startIntervals();
    });

    returnMenuWin.addEventListener('click', function() {
        winMenu.style.display = 'none';
        startMenu.style.display = 'block';
        hideGame(); defaults();
    });

    returnMenuLose.addEventListener('click', function() {
        loseMenu.style.display = 'none';
        startMenu.style.display = 'block';
        hideGame(); defaults();
    });

    resetWin.addEventListener('click', function() {
        winMenu.style.display = 'none';
        showGame(); defaults(); startIntervals();
    });

    resetLose.addEventListener('click', function() {
        loseMenu.style.display = 'none';
        showGame(); defaults(); startIntervals();
    });

    // --- End States ---
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

});
