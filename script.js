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
        // retained but unused
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
        const ac = audioCtx, t = ac.currentTime;
        // Soft-clip waveshaper — adds harmonics to pure sines so they sound bigger
        const clipCurve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i * 2) / 255 - 1;
            clipCurve[i] = (Math.PI + 300) * x / (Math.PI + 300 * Math.abs(x));
        }
        // Hard-clip waveshaper for grit — softer at low freqs to avoid choppiness
        const gritCurve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i * 2) / 255 - 1;
            gritCurve[i] = Math.max(-0.55, Math.min(0.55, x * 2.2)) / 0.55;
        }
        // 0. Kick — sharp bass drum pop at the very start
        const kick = ac.createOscillator();
        const kickGain = ac.createGain();
        kick.connect(kickGain); kickGain.connect(ac.destination);
        kick.type = 'sine';
        kick.frequency.setValueAtTime(80, t);
        kick.frequency.exponentialRampToValueAtTime(28, t + 0.06);
        kickGain.gain.setValueAtTime(1.2, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.135);
        kick.start(t); kick.stop(t + 0.135);
        // 1. Noise burst — heavily muffled, distant thud (very low LP)
        const crackLen = Math.floor(ac.sampleRate * 0.9);
        const crackBuf = ac.createBuffer(1, crackLen, ac.sampleRate);
        const cd = crackBuf.getChannelData(0);
        for (let i = 0; i < crackLen; i++) cd[i] = Math.random() * 2 - 1;
        const crack = ac.createBufferSource();
        crack.buffer = crackBuf;
        const crackLP = ac.createBiquadFilter();
        crackLP.type = 'lowpass'; crackLP.frequency.value = 8;
        const crackGain = ac.createGain();
        crack.connect(crackLP); crackLP.connect(crackGain); crackGain.connect(ac.destination);
        crackGain.gain.setValueAtTime(0.0, t);
        crackGain.gain.linearRampToValueAtTime(0.32, t + 0.41);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        crack.start(t);
        // 2. Pressure wave — deep sub sine, what makes it "feel" like a boom
        const pressure = ac.createOscillator();
        const pressureShaper = ac.createWaveShaper();
        pressureShaper.curve = clipCurve; pressureShaper.oversample = '4x';
        const pressureGain = ac.createGain();
        pressure.connect(pressureShaper); pressureShaper.connect(pressureGain); pressureGain.connect(ac.destination);
        pressure.type = 'sine';
        pressure.frequency.setValueAtTime(1.1, t);
        pressure.frequency.exponentialRampToValueAtTime(0.22, t + 1.2);
        pressureGain.gain.setValueAtTime(0.0, t);
        pressureGain.gain.linearRampToValueAtTime(0.85, t + 0.375);
        pressureGain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
        pressure.start(t); pressure.stop(t + 1.35);
        // 3. Main thump — slow swell, very low, long decay
        const thump = ac.createOscillator();
        const thumpShaper = ac.createWaveShaper();
        thumpShaper.curve = clipCurve; thumpShaper.oversample = '4x';
        const thumpGain = ac.createGain();
        thump.connect(thumpShaper); thumpShaper.connect(thumpGain); thumpGain.connect(ac.destination);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(2.1, t);
        thump.frequency.exponentialRampToValueAtTime(0.35, t + 1.125);
        thumpGain.gain.setValueAtTime(0.0, t);
        thumpGain.gain.linearRampToValueAtTime(0.7, t + 0.375);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        thump.start(t); thump.stop(t + 1.2);
        // 4. Grit layer — hard-clipped bandpass noise, rough static texture
        const gritLen = Math.floor(ac.sampleRate * 1.05);
        const gritBuf = ac.createBuffer(1, gritLen, ac.sampleRate);
        const gd = gritBuf.getChannelData(0);
        for (let i = 0; i < gritLen; i++) gd[i] = Math.random() * 2 - 1;
        const grit = ac.createBufferSource();
        grit.buffer = gritBuf;
        const gritBP = ac.createBiquadFilter();
        gritBP.type = 'bandpass'; gritBP.Q.value = 0.4;
        gritBP.frequency.setValueAtTime(8.5, t);
        gritBP.frequency.exponentialRampToValueAtTime(2.1, t + 0.975);
        const gritShaper = ac.createWaveShaper();
        gritShaper.curve = gritCurve; gritShaper.oversample = '2x';
        const gritGain = ac.createGain();
        grit.connect(gritBP); gritBP.connect(gritShaper); gritShaper.connect(gritGain); gritGain.connect(ac.destination);
        gritGain.gain.setValueAtTime(0.0, t);
        gritGain.gain.linearRampToValueAtTime(1.4, t + 0.375);
        gritGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
        grit.start(t);
        // 5. Body whomp — wide bandpass noise sweep, adds the explosion's body
        const whompLen = Math.floor(ac.sampleRate * 1.2);
        const whompBuf = ac.createBuffer(1, whompLen, ac.sampleRate);
        const wd = whompBuf.getChannelData(0);
        for (let i = 0; i < whompLen; i++) wd[i] = Math.random() * 2 - 1;
        const whomp = ac.createBufferSource();
        whomp.buffer = whompBuf;
        const whompBP = ac.createBiquadFilter();
        whompBP.type = 'bandpass'; whompBP.Q.value = 0.6;
        whompBP.frequency.setValueAtTime(7, t);
        whompBP.frequency.exponentialRampToValueAtTime(1.4, t + 1.125);
        const whompGain = ac.createGain();
        whomp.connect(whompBP); whompBP.connect(whompGain); whompGain.connect(ac.destination);
        whompGain.gain.setValueAtTime(0.0, t);
        whompGain.gain.linearRampToValueAtTime(0.6, t + 0.375);
        whompGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        whomp.start(t);
        // 6. Deep rumble tail — very low lowpass
        const tailDur = 0.075;
        const tailLen = Math.floor(ac.sampleRate * tailDur);
        const tailBuf = ac.createBuffer(1, tailLen, ac.sampleRate);
        const td = tailBuf.getChannelData(0);
        for (let i = 0; i < tailLen; i++) td[i] = Math.random() * 2 - 1;
        const tail = ac.createBufferSource();
        tail.buffer = tailBuf;
        const tailLP = ac.createBiquadFilter();
        tailLP.type = 'lowpass'; tailLP.frequency.value = 3;
        const tailGain = ac.createGain();
        tail.connect(tailLP); tailLP.connect(tailGain); tailGain.connect(ac.destination);
        tailGain.gain.setValueAtTime(0.0, t);
        tailGain.gain.linearRampToValueAtTime(0.18, t + 0.375);
        tailGain.gain.exponentialRampToValueAtTime(0.001, t + 0.068);
        tail.start(t); tail.stop(t + tailDur);
    }

    function playGatlingSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        // Low mechanical thump — body of the round firing
        const thump = ac.createOscillator();
        const tGain = ac.createGain();
        thump.connect(tGain); tGain.connect(ac.destination);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(90, t);
        thump.frequency.exponentialRampToValueAtTime(28, t + 0.042);
        tGain.gain.setValueAtTime(0.55, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        thump.start(t); thump.stop(t + 0.045);
        // Sharp crack — highpass + bandpass noise burst
        const len = Math.floor(ac.sampleRate * 0.028);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 1800;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.2;
        const gain = ac.createGain();
        src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(ac.destination);
        gain.gain.setValueAtTime(0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        src.start(t);
    }

    function playBulletHitSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        // Descending bandpass noise sweep — the "thok" of impact
        const len = Math.floor(ac.sampleRate * 0.055);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 2.0;
        bp.frequency.setValueAtTime(1400, t);
        bp.frequency.exponentialRampToValueAtTime(180, t + 0.045);
        const gain = ac.createGain();
        src.connect(bp); bp.connect(gain); gain.connect(ac.destination);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.start(t);
        // Low sine body — adds punch/weight
        const osc = ac.createOscillator();
        const oGain = ac.createGain();
        osc.connect(oGain); oGain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.05);
        oGain.gain.setValueAtTime(0.28, t);
        oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        osc.start(t); osc.stop(t + 0.055);
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

    const GATLING_BASE = { cooldown: 65, damage: 0.75, spread: 0.18 };

    // Upgrades offered at each level-up — player picks one
    const UPGRADES = [
        { key: 'accuracy',  name: 'ACCURACY',  desc: 'Tighter grouping. Reduces bullet spread.',         apply: s => { s.spread   = Math.max(0.02, s.spread - 0.05); } },
        { key: 'damage',    name: 'DAMAGE',    desc: 'Harder hitting rounds. +0.25 damage per bullet.',  apply: s => { s.bulletDamage += 0.25; } },
        { key: 'firerate',  name: 'FIRE RATE', desc: 'Faster cyclic rate. Reduces cooldown by 8ms.',     apply: s => { s.fireCooldown = Math.max(30, s.fireCooldown - 8); } },
    ];

    // --- Game State ---
    let state = {};
    let enemies     = [];
    let particles   = [];
    let gatlingBullets = [];
    let shellCasings = [];
    let muzzleFlashFrames = 0;
    let muzzleFlashAngle = 0;

    let gameLoopInt = null;
    let spawnInt    = null;
    let moveInt     = null;

    let cursorPosX = centerX;
    let cursorPosY = 0;
    let mouseIsDown = false;

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
    gameCanvas.addEventListener('mousedown', () => { mouseIsDown = true; fireAction(); });
    gameCanvas.addEventListener('mouseup', () => { mouseIsDown = false; });
    gameCanvas.addEventListener('mouseleave', () => { mouseIsDown = false; });



    // --- Level Helpers ---
    function getLevelDef() {
        return LEVELS[Math.min(state.level - 1, LEVELS.length - 1)];
    }

    function getEnemyHp() {
        const def = getLevelDef();
        const r = Math.random();
        if (r < def.eliteChance) return 6;
        if (r < def.eliteChance + def.toughChance) return 4;
        return 3;
    }

    function getEnemyColor(hp) {
        if (hp >= 4) return '#cc44ff'; // elite: purple
        if (hp >= 3) return '#ff3333'; // tough: red
        if (hp === 2) return '#ff8800'; // normal: orange
        return '#1bffc1';              // near-dead: teal
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
            // Full-length tracer: dim yellow line + bright white core near muzzle
            const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
            const mag = Math.hypot(dx, dy) || 1;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.globalAlpha = l.alpha * 0.7;
            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ffdd66'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
            ctx.globalAlpha = l.alpha;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x1 + (dx / mag) * 70, l.y1 + (dy / mag) * 70);
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

    function renderGatlingBullets() {
        const remaining = [];
        gatlingBullets.forEach(b => {
            const prevProgress = b.progress;
            b.progress += 0.05;
            if (b.progress >= 1) return;
            const px = b.x1 + (b.x2 - b.x1) * prevProgress;
            const py = b.y1 + (b.y2 - b.y1) * prevProgress;
            const cx = b.x1 + (b.x2 - b.x1) * b.progress;
            const cy = b.y1 + (b.y2 - b.y1) * b.progress;
            // Segment hit detection
            let hit = false;
            enemies = enemies.filter(e => {
                if (!hit && rayHitsEnemy(e, px, py, cx, cy)) {
                    hit = true; return hitEnemy(e, b.damage);
                }
                return true;
            });
            if (hit) return;
            b.trail.unshift({ x: cx, y: cy });
            if (b.trail.length > 7) b.trail.pop();
            remaining.push(b);
            // Draw: tapered gradient trail — wide+bright at tip, thin+transparent at tail
            ctx.save();
            ctx.lineCap = 'round';
            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
            const n = b.trail.length;
            for (let i = 0; i < n - 1; i++) {
                const t = i / (n - 1); // 0=newest, 1=oldest
                ctx.globalAlpha = (1 - t) * 0.85;
                ctx.lineWidth = Math.max(0.3, (1 - t) * 1.8);
                ctx.strokeStyle = '#ffdd44';
                ctx.beginPath();
                ctx.moveTo(b.trail[i].x, b.trail[i].y);
                ctx.lineTo(b.trail[i + 1].x, b.trail[i + 1].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
        gatlingBullets = remaining;
    }

    function renderShellCasings() {
        shellCasings = shellCasings.filter(s => s.alpha > 0);
        shellCasings.forEach(s => {
            s.x += s.vx; s.y += s.vy;
            s.vx *= 0.84; s.vy *= 0.84;
            s.angle += s.spin;
            s.alpha -= 0.014;
            ctx.save();
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.fillStyle = '#ccaa33';
            ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 3;
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.fillRect(-2, -0.7, 4, 1.4); // small elongated rectangle
            ctx.restore();
        });
    }

    function renderGatlingMuzzleFlash() {
        if (muzzleFlashFrames <= 0) return;
        const alpha = muzzleFlashFrames / 4;
        muzzleFlashFrames--;
        const bx = centerX + Math.cos(muzzleFlashAngle) * 26;
        const by = centerY + Math.sin(muzzleFlashAngle) * 26;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 22;
        ctx.fillStyle = '#ffee88';
        ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const a = muzzleFlashAngle + (Math.PI / 4) + (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.moveTo(bx + Math.cos(a) * 6, by + Math.sin(a) * 6);
            ctx.lineTo(bx + Math.cos(a) * 16, by + Math.sin(a) * 16);
            ctx.stroke();
        }
        ctx.restore();
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
            spawnExplosion(e.x, e.y);
            return false;
        }
        playBulletHitSound();
        e.hitTimer = 6; // flash white for 6 frames
        return true;
    }

    // Extend a ray from (x1,y1) through (tx,ty) to the canvas edge
    function rayToEdge(x1, y1, tx, ty) {
        const dx = tx - x1, dy = ty - y1;
        if (dx === 0 && dy === 0) return { x: tx, y: ty };
        const ts = [];
        if (dx > 0) ts.push((canvasWidth  - x1) / dx);
        else if (dx < 0) ts.push(-x1 / dx);
        if (dy > 0) ts.push((canvasHeight - y1) / dy);
        else if (dy < 0) ts.push(-y1 / dy);
        const t = Math.min(...ts.filter(t => t > 0));
        return { x: x1 + dx * t, y: y1 + dy * t };
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
    function fireAction() {
        if (!state.fireCooldown) return;
        const now = Date.now();
        if (now - state.lastFired < state.fireCooldown) return;
        state.lastFired = now;

        const tx = cursorPosX, ty = cursorPosY;

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

        // Apply spread — random angular offset within ±spread/2
        const baseAngle = Math.atan2(ty - centerY, tx - centerX);
        const spreadOffset = (Math.random() - 0.5) * state.spread;
        const fireAngle = baseAngle + spreadOffset;
        const fireDx = Math.cos(fireAngle), fireDy = Math.sin(fireAngle);
        const edge = rayToEdge(centerX, centerY, centerX + fireDx, centerY + fireDy);

        playGatlingSound();
        muzzleFlashAngle = fireAngle;
        muzzleFlashFrames = 4;
        gatlingBullets.push({ x1: centerX, y1: centerY, x2: edge.x, y2: edge.y, progress: 0, trail: [], damage: state.bulletDamage });
        // Eject shell casing
        const casingAngle = fireAngle - Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const casingSpeed = 2.5 + Math.random() * 2.5;
        shellCasings.push({
            x: centerX + Math.cos(casingAngle) * 8,
            y: centerY + Math.sin(casingAngle) * 8,
            vx: Math.cos(casingAngle) * casingSpeed,
            vy: Math.sin(casingAngle) * casingSpeed,
            angle: casingAngle,
            spin: (Math.random() - 0.5) * 0.3,
            alpha: 1,
        });
    }

    // --- Score / Credits ---
    function addScore(points) {
        state.score += points;
        scoreBoard.textContent = state.score;
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
        populateUpgrades();
        levelMenu.style.display = 'block';
        hideGame();
    }

    function hideLevelUpScreen() {
        levelMenu.style.display = 'none';
    }

    function populateUpgrades() {
        weaponShop.innerHTML = '';
        UPGRADES.forEach(u => {
            const card = document.createElement('div');
            card.className = 'weapon-card';

            const nameEl = document.createElement('div');
            nameEl.className = 'weapon-name';
            nameEl.textContent = u.name;

            const descEl = document.createElement('div');
            descEl.className = 'weapon-desc';
            descEl.textContent = u.desc;

            const actionEl = document.createElement('div');
            actionEl.className = 'weapon-action';

            const btn = document.createElement('button');
            btn.textContent = 'SELECT';
            btn.onclick = () => {
                u.apply(state);
                hideLevelUpScreen();
                startIntervals();
            };
            actionEl.appendChild(btn);

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
        renderGatlingBullets();
        renderShellCasings();
        renderGatlingMuzzleFlash();
        renderParticles();
        if (mouseIsDown) fireAction();
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
            fireCooldown: GATLING_BASE.cooldown,
            bulletDamage: GATLING_BASE.damage,
            spread: GATLING_BASE.spread,
            lastFired: 0,
        };
        enemies = []; particles = []; gatlingBullets = []; shellCasings = [];
        scoreBoard.textContent = '0';
        livesText.textContent = '3';
        weaponDisplay.textContent = 'GATLING';
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
