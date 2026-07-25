// Main event listener
window.addEventListener('DOMContentLoaded', function() {

    // --- DOM Elements ---
    const gameCanvas     = document.querySelector('#gamecanvas');
    const startMenu      = document.querySelector('#startmenu');
    const cutscene       = document.querySelector('#cutscene');
    const cutsceneLabel   = document.querySelector('#cutscene-label');
    const cutsceneSpeaker = document.querySelector('#cutscene-speaker');
    const cutsceneText    = document.querySelector('#cutscene-text');
    const cutsceneProgress= document.querySelector('#cutscene-progress');
    const cutsceneBtn     = document.querySelector('#cutscene-continue');
    const loseMenu        = document.querySelector('#losemenu');
    const levelMenu      = document.querySelector('#levelmenu');
    const returnMenuLose = document.querySelector('#returntomenulose');
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
    const shopCredits      = document.querySelector('#shopcredits');
    const weaponShop       = document.querySelector('#weaponshop');
    const titleEl          = document.querySelector('#gametitle');
    const streakDisplay    = document.querySelector('#streak-display');
    const controlsLegend   = document.querySelector('#controls-legend');
    const controlsOpen     = document.querySelector('#controls-open');
    const controlsToggle   = document.querySelector('#controls-toggle');
    const themeToggle      = document.querySelector('#theme-toggle');
    const pauseOverlay     = document.querySelector('#pause-overlay');
    const ctx              = gameCanvas.getContext('2d');
    const miniturretCountEl = document.querySelector('#miniturret-count');

    // --- Audio ---
    let audioCtx = null;

    function ensureAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
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

    function playBoundaryHitSound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        // Low impact thump
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        gain.gain.setValueAtTime(0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
        // Sharp brittle crack
        const len = Math.floor(ac.sampleRate * 0.055);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src   = ac.createBufferSource();
        src.buffer  = buf;
        const hp    = ac.createBiquadFilter();
        hp.type     = 'highpass'; hp.frequency.value = 1200;
        const nGain = ac.createGain();
        src.connect(hp); hp.connect(nGain); nGain.connect(ac.destination);
        nGain.gain.setValueAtTime(0.35, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.start(t);
    }

    function playWaveReadySound() {
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(2200, t + 0.07);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
    }

    // --- Canvas Setup ---
    let canvasWidth, canvasHeight, centerX, centerY;

    function resizeCanvas() {
        canvasWidth  = window.innerWidth;
        canvasHeight = window.innerHeight;
        gameCanvas.width          = canvasWidth;
        gameCanvas.height         = canvasHeight;
        gameCanvas.style.width    = canvasWidth  + 'px';
        gameCanvas.style.height   = canvasHeight + 'px';
        centerX = canvasWidth  / 2;
        centerY = canvasHeight / 2;
    }
    resizeCanvas();
    window.addEventListener('resize', () => requestAnimationFrame(resizeCanvas));

    // --- Player position (mutable — updated by WASD) ---
    let playerX = centerX;
    let playerY = centerY;
    const PLAYER_SPEED = 3;
    const keysHeld = { w: false, a: false, s: false, d: false };

    // --- Game Constants ---

    // 5 levels — killsToNext: kills needed to advance, spawnInterval: ms between spawns
    const LEVELS = [
        { killsToNext: 12, spawnInterval: 1100, toughChance: 0,     eliteChance: 0 },
        { killsToNext: 18, spawnInterval: 950,  toughChance: 0.35,  eliteChance: 0 },
        { killsToNext: 24, spawnInterval: 800,  toughChance: 0.5,   eliteChance: 0.15 },
        { killsToNext: 30, spawnInterval: 680,  toughChance: 0.55,  eliteChance: 0.3 },
        { killsToNext: 36, spawnInterval: 570,  toughChance: 0.5,   eliteChance: 0.45 },
        { killsToNext: 42, spawnInterval: 480,  toughChance: 0.55,  eliteChance: 0.5 },
        { killsToNext: 48, spawnInterval: 410,  toughChance: 0.55,  eliteChance: 0.6 },
        { killsToNext: 55, spawnInterval: 350,  toughChance: 0.6,   eliteChance: 0.7 },
    ];

    // Enemy speed per level
    const LEVEL_SPEEDS    = [0.28, 0.36, 0.45, 0.54, 0.62, 0.68, 0.73, 0.76];
    const ENEMY_MAX_SPEED = 0.76;

    // Shown on the level-up screen (index = new level - 1)
    const LEVEL_DESCS = [
        '',
        'Tougher blocks are joining the assault. Orange blocks take 2 hits.',
        'Elite red blocks have appeared. They require 3 hits to destroy.',
        'Forces are overwhelming. Upgrade your arsenal before re-deploying.',
        'Maximum threat. Reinforcements incoming.',
        'Command has lost contact. You\'re on your own, Cadet.',
        'They\'re not stopping. Neither are you.',
        'Final stand. Hold the line.',
    ];

    const GATLING_BASE = { cooldown: 85, damage: 0.45, spread: 0.07 };

    const MINI_TURRET_MAX      = 4;
    const MINI_TURRET_RANGE    = 100;
    const MINI_TURRET_COOLDOWN = 600;
    const MINI_TURRET_DAMAGE   = 0.65;
    const MINI_TURRET_HP       = 20;

    const WAVE_RANGE      = 240;   // base — upgradeable via state.waveRange
    const WAVE_PUSH       = 32;
    const WAVE_COOLDOWN   = 12000; // ms

    const SHOTGUN_TURRET_MAX    = 4;
    const SHOTGUN_SLOT_OFFSET   = 95;
    const SHOTGUN_RANGE         = 160;
    const SHOTGUN_PELLETS       = 7;
    const SHOTGUN_SPREAD        = Math.PI / 9;  // 20° total arc
    const SHOTGUN_DAMAGE        = 0.9;
    const SHOTGUN_COOLDOWN      = 1400;         // ms between bursts

    // Deployment slots — square around player, computed dynamically so they follow movement
    const SLOT_OFFSET = 62;
    function getSlotPositions() {
        return [
            { x: playerX - SLOT_OFFSET, y: playerY - SLOT_OFFSET },
            { x: playerX + SLOT_OFFSET, y: playerY - SLOT_OFFSET },
            { x: playerX + SLOT_OFFSET, y: playerY + SLOT_OFFSET },
            { x: playerX - SLOT_OFFSET, y: playerY + SLOT_OFFSET },
        ];
    }

    // Shotgun turret slots — cardinal directions, slightly further out
    function getShotgunSlotPositions() {
        return [
            { x: playerX,                      y: playerY - SHOTGUN_SLOT_OFFSET },
            { x: playerX + SHOTGUN_SLOT_OFFSET, y: playerY },
            { x: playerX,                      y: playerY + SHOTGUN_SLOT_OFFSET },
            { x: playerX - SHOTGUN_SLOT_OFFSET, y: playerY },
        ];
    }

    function getNextShotgunSlot() {
        for (let i = 0; i < SHOTGUN_TURRET_MAX; i++) {
            if (!flameTurrets.some(t => t.slotIdx === i)) return i;
        }
        return -1;
    }

    // Upgrades offered at each level-up — player picks one
    const UPGRADES = [
        { key: 'accuracy',  name: 'ACCURACY',    baseCost: 110, costStep: 77,  desc: 'Tighter grouping. Reduces bullet spread.',           apply: s => { s.spread        = Math.max(0.02, s.spread - 0.05); } },
        { key: 'damage',    name: 'DAMAGE',       baseCost: 154, costStep: 99,  desc: 'Harder hitting rounds. +0.5 damage per bullet.',     apply: s => { s.bulletDamage += 0.5; } },
        { key: 'firerate',  name: 'FIRE RATE',    baseCost: 127, costStep: 83,  desc: 'Faster cyclic rate. Reduces cooldown by 10ms.',      apply: s => { s.fireCooldown  = Math.max(30, s.fireCooldown - 10); } },
        { key: 'heatsink',  name: 'HEAT SINK',    baseCost: 110, costStep: 72,  desc: 'Better thermal venting. Cuts jam duration by 20%.',  apply: s => { s.jamDuration   = Math.max(20, Math.round(s.jamDuration * 0.80)); } },
        { key: 'caliber',   name: 'CALIBER',      baseCost: 165, costStep: 105, desc: 'Wider rounds. Each bullet has +3px hit radius.',     apply: s => { s.bulletRadius  = Math.min(14, (s.bulletRadius || 0) + 3); } },
        { key: 'speed',     name: 'SPEED',        baseCost: 99,  costStep: 77,  desc: 'Move faster. +0.5 movement speed.',                  apply: s => { s.playerSpeed   = Math.min(8, (s.playerSpeed || PLAYER_SPEED) + 0.5); } },
        { key: 'wavedmg',   name: 'WAVE POWER',   baseCost: 127, costStep: 88,  desc: 'Wave strips HP from enemies hit. +1 damage.',        apply: s => { s.waveDamage    = (s.waveDamage || 1) + 1; } },
        { key: 'waverange', name: 'WAVE RANGE',   baseCost: 105, costStep: 77,  desc: 'Wider blast radius. +50px wave range.',              apply: s => { s.waveRange     = (s.waveRange  || WAVE_RANGE) + 50; } },
    ];

    // --- Game State ---
    let state = {};
    let enemies     = [];
    let particles   = [];
    let gatlingBullets = [];
    let shellCasings = [];
    let muzzleFlashFrames = 0;
    let muzzleFlashAngle = 0;

    let miniTurrets       = [];
    let flameTurrets      = [];
    let circleHitFlashes  = [];
    let waveRings         = [];
    let enemyBullets      = [];

    let rafId = null;
    let lastTime = 0;
    let moveAcc = 0;
    let logicAcc = 0;
    let spawnAcc = 0;
    let gameRunning = false;
    let paused      = false;
    let cursorPosX = playerX;
    let cursorPosY = 0;
    let mouseIsDown = false;

    // Touch state — dual-zone controls
    let leftTouch  = null; // { id, originX, originY, dx, dy }
    let rightTouch = null; // { id }
    const JOYSTICK_RADIUS = 65;
    const JOYSTICK_DEAD   = 10;

    // --- Player ---
    class Player {
        constructor(x, y, width, height) {
            this.x = x; this.y = y; this.width = width; this.height = height;
            this.render = () => {
                ctx.save();
                ctx.translate(centerX, centerY);

                // Outer hex ring — platform base
                ctx.beginPath();
                for (let v = 0; v < 6; v++) {
                    const a = (Math.PI / 3) * v + Math.PI / 6;
                    v === 0 ? ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22)
                            : ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
                }
                ctx.closePath();
                ctx.strokeStyle = 'rgba(155,180,200,0.65)';
                ctx.lineWidth   = 1.5;
                ctx.shadowColor = 'rgba(130,160,185,0.70)';
                ctx.shadowBlur  = 7;
                ctx.stroke();

                // Inner hex ring — detail layer
                ctx.beginPath();
                for (let v = 0; v < 6; v++) {
                    const a = (Math.PI / 3) * v;
                    v === 0 ? ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15)
                            : ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
                }
                ctx.closePath();
                ctx.strokeStyle = 'rgba(100,128,150,0.35)';
                ctx.lineWidth   = 1;
                ctx.shadowBlur  = 0;
                ctx.stroke();

                // Body — gunmetal with steel border + metallic gradient
                ctx.beginPath();
                ctx.arc(0, 0, 13, 0, Math.PI * 2);
                const bodyGrad = ctx.createRadialGradient(-4, -5, 0, 0, 0, 13);
                bodyGrad.addColorStop(0,   '#2a3f52');
                bodyGrad.addColorStop(0.6, '#152030');
                bodyGrad.addColorStop(1,   '#0e1820');
                ctx.fillStyle  = bodyGrad;
                ctx.shadowBlur = 0;
                ctx.fill();
                ctx.strokeStyle = '#607888';
                ctx.lineWidth   = 1.5;
                ctx.shadowColor = 'rgba(120,155,180,0.75)';
                ctx.shadowBlur  = 5;
                ctx.stroke();

                // Inner detail ring
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(88,115,135,0.45)';
                ctx.lineWidth   = 0.8;
                ctx.shadowBlur  = 0;
                ctx.stroke();

                // Amber targeting core (optic / power source)
                const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
                core.addColorStop(0,   'rgba(220,158,40,1.0)');
                core.addColorStop(0.5, 'rgba(200,130,25,0.6)');
                core.addColorStop(1,   'rgba(180,100,10,0)');
                ctx.fillStyle  = core;
                ctx.shadowColor = '#d49830';
                ctx.shadowBlur  = 14;
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            };
        }
    }
    const playerTurret = new Player(playerX - 25, playerY - 25, 50, 50);

    // --- Input ---
    gameCanvas.addEventListener('mousemove', e => {
        cursorPosX = e.clientX - gameCanvas.offsetLeft;
        cursorPosY = e.clientY - gameCanvas.offsetTop;
    });
    gameCanvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        mouseIsDown = true;
        if (state.jammed) { ventOverheat(); } else { fireAction(); }
    });
    gameCanvas.addEventListener('mouseup', e => { if (e.button === 0) mouseIsDown = false; });
    gameCanvas.addEventListener('mouseleave', () => { mouseIsDown = false; });
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (k === 'r') ventOverheat();
        if (k === 'e') triggerWave();
        if (k === 'escape') togglePause();
        if (k === 'w') keysHeld.w = true;
        if (k === 'a') keysHeld.a = true;
        if (k === 's') keysHeld.s = true;
        if (k === 'd') keysHeld.d = true;
    });
    window.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        if (k === 'w') keysHeld.w = false;
        if (k === 'a') keysHeld.a = false;
        if (k === 's') keysHeld.s = false;
        if (k === 'd') keysHeld.d = false;
    });

    // --- Touch Controls (dual-zone) ---
    function touchCanvasPos(touch) {
        const r = gameCanvas.getBoundingClientRect();
        return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    }

    const AIM_DEAD = 4; // px of jitter filter before aim updates

    function handleTouchStart(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const { x, y } = touchCanvasPos(touch);
            if (x < canvasWidth / 2) {
                if (!leftTouch) leftTouch = { id: touch.identifier, originX: x, originY: y, dx: 0, dy: 0 };
            } else {
                if (!rightTouch) {
                    rightTouch = { id: touch.identifier, originX: x, originY: y, dx: 0, dy: 0 };
                    // Immediately point turret toward touch position relative to screen center
                    // so the first shot goes in the intuitive direction without needing a drag
                    const ix = x - centerX, iy = y - centerY;
                    const im = Math.hypot(ix, iy);
                    if (im > 0) {
                        cursorPosX = centerX + (ix / im) * 9999;
                        cursorPosY = centerY + (iy / im) * 9999;
                    }
                    mouseIsDown = true;
                    if (state.jammed) ventOverheat(); else fireAction();
                }
            }
        });
    }

    function handleTouchMove(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const { x, y } = touchCanvasPos(touch);
            if (leftTouch && touch.identifier === leftTouch.id) {
                leftTouch.dx = x - leftTouch.originX;
                leftTouch.dy = y - leftTouch.originY;
            } else if (rightTouch && touch.identifier === rightTouch.id) {
                const dx = x - rightTouch.originX;
                const dy = y - rightTouch.originY;
                if (Math.hypot(dx, dy) > AIM_DEAD) {
                    rightTouch.dx = dx;
                    rightTouch.dy = dy;
                    // Right zone is a miniature viewport: origin = screen center,
                    // edges of the zone map to edges of the full screen.
                    // Scale = full viewport width / right zone width = canvasWidth / (canvasWidth/2) = 2
                    cursorPosX = centerX + dx * 2;
                    cursorPosY = centerY + dy * 2;
                }
            }
        });
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            if (leftTouch  && touch.identifier === leftTouch.id)  leftTouch  = null;
            if (rightTouch && touch.identifier === rightTouch.id) { rightTouch = null; mouseIsDown = false; }
        });
    }

    gameCanvas.addEventListener('touchstart',  handleTouchStart, { passive: false });
    gameCanvas.addEventListener('touchmove',   handleTouchMove,  { passive: false });
    gameCanvas.addEventListener('touchend',    handleTouchEnd,   { passive: false });
    gameCanvas.addEventListener('touchcancel', handleTouchEnd,   { passive: false });

    // Try to lock orientation to landscape (Android Chrome; Safari ignores gracefully)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
    }



    // --- Level Helpers ---
    function getLevelDef() {
        if (state.level <= LEVELS.length) return LEVELS[state.level - 1];
        const excess = state.level - LEVELS.length;
        const last = LEVELS[LEVELS.length - 1];
        return {
            killsToNext:   last.killsToNext   + excess * 10,
            spawnInterval: Math.max(200, last.spawnInterval - excess * 22),
            toughChance:   Math.min(0.75, last.toughChance  + excess * 0.015),
            eliteChance:   Math.min(0.85, last.eliteChance  + excess * 0.02),
        };
    }

    function getEnemyHp() {
        const def = getLevelDef();
        const r = Math.random();
        let hp;
        if (r < def.eliteChance)                     hp = 6;
        else if (r < def.eliteChance + def.toughChance) hp = 4;
        else                                          hp = 3;
        // Beyond base levels: enemies gain HP instead of speed
        if (state.level > LEVELS.length) {
            hp += Math.floor((state.level - LEVELS.length) / 3);
        }
        return hp;
    }

    function getEnemyColor(hp) {
        if (hp >= 4) return '#cc44ff'; // elite: purple
        if (hp >= 3) return '#ff3333'; // tough: red
        if (hp === 2) return '#ff8800'; // normal: orange
        return '#1bffc1';              // near-dead: teal
    }

    // --- Screen Shake ---
    function shakeCanvas(intensity) {
        const dur = 220;
        const start = Date.now();
        const tick = () => {
            const decay = 1 - (Date.now() - start) / dur;
            if (decay <= 0) { gameCanvas.style.transform = ''; return; }
            const x = (Math.random() - 0.5) * intensity * decay;
            const y = (Math.random() - 0.5) * intensity * decay;
            gameCanvas.style.transform = `translate(${x}px,${y}px)`;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // --- Enemies ---
    function spawnEnemy() {
        let x, y;
        // Spawn in a ring around the player in world space (just outside the visible area)
        const spawnR = Math.max(canvasWidth, canvasHeight) * 0.6;
        do {
            const angle = Math.random() * Math.PI * 2;
            const dist  = 180 + Math.random() * spawnR;
            x = playerX + Math.cos(angle) * dist;
            y = playerY + Math.sin(angle) * dist;
        } while (Math.hypot(x - playerX, y - playerY) < 280);
        let behavior = 'normal';
        const br        = Math.random();
        const tankChance = Math.min(0.07, (state.level - 2) * 0.012);
        const zipChance  = Math.min(0.18, state.level * 0.04);
        const zigChance  = Math.min(0.18, state.level * 0.045);
        if      (br < tankChance)                        behavior = 'tank';
        else if (br < tankChance + zipChance)            behavior = 'zipper';
        else if (br < tankChance + zipChance + zigChance) behavior = 'zigzag';
        const hp = behavior === 'tank'
            ? 10 + Math.floor(state.level / 2)
            : getEnemyHp();
        const size = behavior === 'zigzag' ? 18
                   : behavior === 'tank'   ? 18 : 10;
        enemies.push({
            x, y, hp, maxHp: hp, hitTimer: 0,
            behavior, size,
            zigzagPhase: Math.random() * Math.PI * 2,
            zipping: false, zipDuration: 0,
            zipCooldown: Math.floor(Math.random() * 25),
            fireTick: Math.floor(Math.random() * 90),
        });
    }

    function moveEnemies() {
        enemies.forEach(e => {
            const angle = Math.atan2(playerY - e.y, playerX - e.x);
            let speed   = state.perFrameDistance;

            if (e.behavior === 'zigzag') {
                e.zigzagPhase += 0.18;
                const perp   = angle + Math.PI / 2;
                const zigStr = 2.2 + state.level * 0.3;
                e.x += Math.cos(angle) * speed + Math.cos(perp) * Math.sin(e.zigzagPhase) * zigStr;
                e.y += Math.sin(angle) * speed + Math.sin(perp) * Math.sin(e.zigzagPhase) * zigStr;
            } else if (e.behavior === 'zipper') {
                if (e.zipping) {
                    e.zipDuration--;
                    if (e.zipDuration <= 0) {
                        e.zipping     = false;
                        e.zipCooldown = 35 + Math.floor(Math.random() * 25);
                    }
                    speed *= 3.8;
                } else {
                    e.zipCooldown--;
                    if (e.zipCooldown <= 0 && Math.random() < 0.06) {
                        e.zipping     = true;
                        e.zipDuration = 16 + Math.floor(Math.random() * 10);
                    }
                }
                e.x += Math.cos(angle) * speed;
                e.y += Math.sin(angle) * speed;
            } else if (e.behavior === 'tank') {
                // Slow, heavy — 35% of normal speed
                e.x += Math.cos(angle) * speed * 0.35;
                e.y += Math.sin(angle) * speed * 0.35;
                // Fire at player every ~3 seconds (moveEnemies runs at 20ms, so 150 ticks)
                e.fireTick = (e.fireTick || 0) + 1;
                if (e.fireTick >= 150 && enemyBullets.length < 200) {
                    e.fireTick = 0;
                    const bAngle = Math.atan2(playerY - e.y, playerX - e.x);
                    const spread = (Math.random() - 0.5) * 0.3;
                    enemyBullets.push({
                        x: e.x, y: e.y,
                        vx: Math.cos(bAngle + spread) * 2.2,
                        vy: Math.sin(bAngle + spread) * 2.2,
                    });
                }
            } else {
                e.x += Math.cos(angle) * speed;
                e.y += Math.sin(angle) * speed;
            }

            // Wave push — decays each movement tick
            if (e.pushVx) { e.x += e.pushVx; e.pushVx *= 0.82; if (Math.abs(e.pushVx) < 0.05) e.pushVx = 0; }
            if (e.pushVy) { e.y += e.pushVy; e.pushVy *= 0.82; if (Math.abs(e.pushVy) < 0.05) e.pushVy = 0; }
        });
    }

    function triggerWave() {
        const now = Date.now();
        if (now - state.waveLastUsed < WAVE_COOLDOWN) return;
        state.waveLastUsed = now;
        shakeCanvas(8);
        const wRange = state.waveRange || WAVE_RANGE;
        enemies.forEach(e => {
            const dx = e.x - playerX, dy = e.y - playerY;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist >= wRange) return;
            const force = WAVE_PUSH * (1 - dist / wRange);
            e.pushVx = (dx / dist) * force;
            e.pushVy = (dy / dist) * force;
            // Non-lethal damage — always leaves at least 1 HP
            e.hp = Math.max(1, e.hp - (state.waveDamage || 1));
            e.hitTimer = 8;
        });
        for (let i = 0; i < 3; i++) {
            waveRings.push({ x: playerX, y: playerY, r: 18 + i * 28, life: 24, maxLife: 24, delay: i * 4 });
        }
    }

    function renderEnemies() {
        enemies.forEach(e => {
            if (e.hitTimer > 0) e.hitTimer--;
            const ratio      = e.hp / e.maxHp;
            const flashColor = ratio > 0.66 ? '#ff8844' : ratio > 0.33 ? '#ffee44' : '#aaffee';
            const baseCol    = e.behavior === 'tank' ? '#cc3300' : getEnemyColor(e.hp);
            const col        = e.hitTimer > 0 ? flashColor : baseCol;

            // Sample trail every 3rd render frame
            e.trailTick = ((e.trailTick || 0) + 1);
            if (e.trailTick % 3 === 0) {
                if (!e.trail) e.trail = [];
                e.trail.unshift({ x: e.x, y: e.y });
                if (e.trail.length > 16) e.trail.pop();
            }

            // Fading trail — shape matches enemy type
            if (e.trail && e.trail.length > 0) {
                const n = e.trail.length;
                ctx.strokeStyle = col;
                ctx.lineWidth   = 0.7;
                e.trail.forEach((pos, i) => {
                    ctx.globalAlpha = (1 - (i + 1) / (n + 1)) * 0.40;
                    if (e.behavior === 'zigzag') {
                        ctx.beginPath();
                        ctx.moveTo(pos.x, pos.y - 6);
                        ctx.lineTo(pos.x - 5, pos.y + 4);
                        ctx.lineTo(pos.x + 5, pos.y + 4);
                        ctx.closePath(); ctx.stroke();
                    } else if (e.behavior === 'zipper') {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.strokeRect(pos.x - 5, pos.y - 5, 10, 10);
                    }
                });
                ctx.globalAlpha = 1;
            }

            const edgeCol = (e.behavior === 'zipper' && e.zipping) ? '#ffffff' : col;
            ctx.save();
            ctx.strokeStyle = edgeCol;
            ctx.lineWidth   = 1.2;
            ctx.lineJoin    = 'round';
            ctx.lineCap     = 'round';

            if (e.behavior === 'zigzag') {
                // Wireframe pyramid — bigger, easier to track visually
                ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 20;
                const pw = 20, ph = 18, pd = 7;
                const ax = e.x,           ay = e.y - ph / 2;
                const blx = e.x - pw / 2, bly = e.y + ph / 2;
                const brx = e.x + pw / 2, bry = e.y + ph / 2;
                const dax = ax + pd,      day = ay - pd;
                // Front triangular face
                ctx.beginPath();
                ctx.moveTo(ax, ay); ctx.lineTo(blx, bly); ctx.lineTo(brx, bry);
                ctx.closePath(); ctx.stroke();
                // Depth edges from apex and base-right corner
                ctx.beginPath();
                ctx.moveTo(ax,  ay);  ctx.lineTo(dax,        day);
                ctx.moveTo(brx, bry); ctx.lineTo(brx + pd,   bry - pd);
                ctx.moveTo(dax, day); ctx.lineTo(brx + pd,   bry - pd);
                ctx.stroke();

            } else if (e.behavior === 'zipper') {
                // Shaded sphere with specular highlight
                const sr = 8;
                if (e.zipping) { ctx.shadowColor = '#00ffee'; ctx.shadowBlur = 30; }
                else           { ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 14; }
                const sGrad = ctx.createRadialGradient(e.x - sr * 0.35, e.y - sr * 0.35, sr * 0.05, e.x, e.y, sr);
                sGrad.addColorStop(0,    'rgba(255,255,255,0.85)');
                sGrad.addColorStop(0.45, col);
                sGrad.addColorStop(1,    'rgba(0,0,0,0.55)');
                ctx.beginPath();
                ctx.arc(e.x, e.y, sr, 0, Math.PI * 2);
                ctx.fillStyle = sGrad;
                ctx.fill();
                ctx.lineWidth = 0.9;
                ctx.stroke();

            } else if (e.behavior === 'tank') {
                // Large heavy cube — wider, bolder, dark red glow
                ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 20;
                const w = 22, h = 18, d = 8;
                const fx = e.x - w / 2, fy = e.y - h / 2;
                ctx.lineWidth = 1.8;
                ctx.strokeRect(fx, fy, w, h);
                ctx.beginPath();
                ctx.moveTo(fx,         fy);     ctx.lineTo(fx + d,     fy - d);
                ctx.moveTo(fx + w,     fy);     ctx.lineTo(fx + w + d, fy - d);
                ctx.moveTo(fx + d,     fy - d); ctx.lineTo(fx + w + d, fy - d);
                ctx.moveTo(fx + w,     fy + h); ctx.lineTo(fx + w + d, fy + h - d);
                ctx.moveTo(fx + w + d, fy - d); ctx.lineTo(fx + w + d, fy + h - d);
                ctx.stroke();
                // Barrel — small protrusion aimed at player
                const bAng = Math.atan2(playerY - e.y, playerX - e.x);
                ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(e.x, e.y);
                ctx.lineTo(e.x + Math.cos(bAng) * 14, e.y + Math.sin(bAng) * 14);
                ctx.stroke();

            } else {
                // Wireframe cube — 9 visible edges (front face + top + right faces)
                const w = 10, h = 10, d = 4;
                const fx = e.x - w / 2, fy = e.y - h / 2;
                ctx.strokeRect(fx, fy, w, h);
                ctx.beginPath();
                ctx.moveTo(fx,         fy);     ctx.lineTo(fx + d,     fy - d);
                ctx.moveTo(fx + w,     fy);     ctx.lineTo(fx + w + d, fy - d);
                ctx.moveTo(fx + d,     fy - d); ctx.lineTo(fx + w + d, fy - d);
                ctx.moveTo(fx + w,     fy + h); ctx.lineTo(fx + w + d, fy + h - d);
                ctx.moveTo(fx + w + d, fy - d); ctx.lineTo(fx + w + d, fy + h - d);
                ctx.stroke();
            }

            ctx.restore();

            // HP bar — below enemy
            if (e.maxHp > 1) {
                const bw = 16, bh = 1.5, bx = e.x - 8, by = e.y + (e.size || 10) + 5;
                ctx.fillStyle = '#222';
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = getEnemyColor(e.hp);
                ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
            }
        });
    }

    function drawPlayerBarrel() {
        const dx  = cursorPosX - centerX;
        const dy  = cursorPosY - centerY;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag < 1) return;
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        // Dark outline for depth
        ctx.fillStyle  = '#06141f';
        ctx.fillRect(11, -4.5, 19, 9);
        // Main barrel body — dark steel
        ctx.fillStyle   = '#304555';
        ctx.shadowColor = 'rgba(110,145,170,0.5)';
        ctx.shadowBlur  = 4;
        ctx.fillRect(12, -3.5, 17, 7);
        // Top specular — chrome shine
        ctx.fillStyle  = 'rgba(185,215,235,0.45)';
        ctx.shadowBlur = 0;
        ctx.fillRect(12, -3.5, 17, 2);
        // Muzzle tip — bright steel end
        ctx.fillStyle   = '#90b0c5';
        ctx.shadowColor = 'rgba(200,225,240,0.8)';
        ctx.shadowBlur  = 8;
        ctx.fillRect(26, -4, 4, 8);
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
            b.progress += b.isShotgun ? 0.10 : 0.05;
            if (b.progress >= 1) return;
            const px = b.x1 + (b.x2 - b.x1) * prevProgress;
            const py = b.y1 + (b.y2 - b.y1) * prevProgress;
            const cx = b.x1 + (b.x2 - b.x1) * b.progress;
            const cy = b.y1 + (b.y2 - b.y1) * b.progress;
            // Segment hit detection — enemies
            let hit = false;
            enemies = enemies.filter(e => {
                if (!hit && rayHitsEnemy(e, px, py, cx, cy)) {
                    hit = true; return hitEnemy(e, b.damage);
                }
                return true;
            });
            if (hit) return;
            b.trail.unshift({ x: cx, y: cy });
            if (b.trail.length > 12) b.trail.pop();
            remaining.push(b);

            // Ground glow — cheap radial gradient, scales with damage upgrades
            const upgradeLevel = Math.min(3, Math.max(0, Math.round((b.damage - 0.45) / 0.5)));
            const glowR = Math.min(55, 15 + upgradeLevel * 13);
            const glowA = Math.min(0.50, 0.18 + upgradeLevel * 0.11);
            const grd   = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
            grd.addColorStop(0,   `rgba(255,220,100,${glowA})`);
            grd.addColorStop(0.4, `rgba(255,140,20,${glowA * 0.55})`);
            grd.addColorStop(1,   'rgba(255,60,0,0)');
            ctx.save();
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Tracer trail — cyan for turret bullets, yellow for player
            const tracerColor = b.fromTurret ? '#00eeff' : '#ffdd44';
            const tracerGlow  = b.fromTurret ? '#00ccff' : '#ffcc00';
            ctx.save();
            ctx.lineCap = 'round';
            ctx.shadowColor = tracerGlow; ctx.shadowBlur = 8;
            const n = b.trail.length;
            for (let i = 0; i < n - 1; i++) {
                const t = i / (n - 1);
                ctx.globalAlpha = (1 - t) * 0.85;
                ctx.lineWidth   = Math.max(0.3, (1 - t) * 1.8);
                ctx.strokeStyle = tracerColor;
                ctx.beginPath();
                ctx.moveTo(b.trail[i].x, b.trail[i].y);
                ctx.lineTo(b.trail[i + 1].x, b.trail[i + 1].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffffff';
            const dotR = b.fromTurret ? 2 : 2 + (state.bulletRadius || 0) * 0.4;
            ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2); ctx.fill();
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
        const bx = playerX + Math.cos(muzzleFlashAngle) * 26;
        const by = playerY + Math.sin(muzzleFlashAngle) * 26;
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

    // --- Shotgun Turrets ---
    function renderFlameTurrets() {
        const slots = getShotgunSlotPositions();
        const now   = Date.now();
        flameTurrets = flameTurrets.filter(t => t.hp > 0);

        flameTurrets.forEach(t => {
            // Lag follow with wobble
            if (t.slotIdx !== undefined) {
                t.wobblePhase += t.wobbleFreq;
                const wob  = Math.sin(t.wobblePhase) * t.wobbleAmp;
                const perpX = Math.cos(t.wobblePhase + Math.PI / 2) * wob;
                const perpY = Math.sin(t.wobblePhase + Math.PI / 2) * wob;
                t.x += ((slots[t.slotIdx].x + perpX) - t.x) * t.lerpSpeed;
                t.y += ((slots[t.slotIdx].y + perpY) - t.y) * t.lerpSpeed;
            }

            // Find closest enemy within range
            let closest = null, closestDist = SHOTGUN_RANGE;
            enemies.forEach(e => {
                const d = Math.hypot(e.x - t.x, e.y - t.y);
                if (d < closestDist) { closest = e; closestDist = d; }
            });

            const angle = closest ? Math.atan2(closest.y - t.y, closest.x - t.x) : (t.lastAngle || 0);
            if (closest) t.lastAngle = angle;

            // Fire burst of pellets
            if (closest && now - (t.lastFired || 0) >= SHOTGUN_COOLDOWN) {
                t.lastFired = now;
                for (let p = 0; p < SHOTGUN_PELLETS; p++) {
                    const spread = (p / (SHOTGUN_PELLETS - 1) - 0.5) * SHOTGUN_SPREAD;
                    const a      = angle + spread;
                    const dx     = Math.cos(a), dy = Math.sin(a);
                    const endX   = t.x + dx * SHOTGUN_RANGE;
                    const endY   = t.y + dy * SHOTGUN_RANGE;
                    gatlingBullets.push({ x1: t.x, y1: t.y, x2: endX, y2: endY,
                        progress: 0, trail: [], damage: t.damage, fromTurret: true, isShotgun: true });
                }
            }

            // Body — wide hex base, double-barrel look
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(angle);
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const a = (Math.PI / 3) * v + Math.PI / 6;
                v === 0 ? ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9)
                        : ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
            }
            ctx.closePath();
            ctx.fillStyle   = 'rgba(70,35,10,0.50)';
            ctx.shadowColor = 'rgba(255,140,40,0.7)';
            ctx.shadowBlur  = 10;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,160,60,0.75)';
            ctx.lineWidth   = 1;
            ctx.stroke();
            // Double barrel
            ctx.fillStyle   = '#ff9933';
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.roundRect(1, -4,   10, 2.5, 1); ctx.fill();
            ctx.beginPath(); ctx.roundRect(1,  1.5, 10, 2.5, 1); ctx.fill();
            ctx.restore();

            // HP bar
            const bw = 22, bh = 1.5, hpR = t.hp / t.maxHp;
            ctx.fillStyle = '#222';
            ctx.fillRect(t.x - bw / 2, t.y + 13, bw, bh);
            ctx.fillStyle = hpR > 0.5 ? '#ff8833' : '#cc4400';
            ctx.fillRect(t.x - bw / 2, t.y + 13, bw * hpR, bh);
        });
    }

    // --- Enemy Bullets ---
    function renderEnemyBullets() {
        enemyBullets = enemyBullets.filter(b => {
            b.x += b.vx; b.y += b.vy;
            // Remove if too far from player
            if (Math.hypot(b.x - playerX, b.y - playerY) > 700) return false;
            ctx.save();
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4400';
            ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
            return true;
        });
    }

    // --- Wave Rings ---
    function renderWaveRings() {
        waveRings = waveRings.filter(w => w.life > 0);
        waveRings.forEach(w => {
            if (w.delay > 0) { w.delay--; return; }
            w.r    += 15;
            w.life--;
            const a = w.life / w.maxLife;
            ctx.save();
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80,210,255,${a * 0.95})`;
            ctx.lineWidth   = 5 * a;
            ctx.lineCap     = 'round';
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur  = 22 * a;
            ctx.stroke();
            ctx.restore();
        });
    }

    // --- Turret Area (spawn boundary + slot placeholders) ---
    function renderTurretArea() {
        const R = 56;

        // --- Layer 1: Fresnel fill (transparent center, opaque rim like real glass) ---
        ctx.save();
        const fresnelGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, R);
        fresnelGrad.addColorStop(0,    'rgba(180,230,255,0.00)');
        fresnelGrad.addColorStop(0.60, 'rgba(120,190,255,0.04)');
        fresnelGrad.addColorStop(0.85, 'rgba(100,170,240,0.12)');
        fresnelGrad.addColorStop(1,    'rgba(80,150,230,0.26)');
        ctx.beginPath();
        ctx.arc(centerX, centerY, R, 0, Math.PI * 2);
        ctx.fillStyle = fresnelGrad;
        ctx.fill();
        ctx.restore();

        // --- Layer 2: Hex grid + lighting, clipped to dome ---
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, R, 0, Math.PI * 2);
        ctx.clip();

        // Hex grid — dome-projected (hexes shrink toward edge, simulating curved surface)
        const hexR = 12, hexH = Math.sqrt(3) * hexR, colW = hexR * 1.5;
        ctx.beginPath();
        for (let col = -8; col <= 8; col++) {
            for (let row = -8; row <= 8; row++) {
                const dx   = col * colW;
                const dy   = row * hexH + (Math.abs(col) % 2 === 1 ? hexH / 2 : 0);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > R + hexR) continue;
                // Anisotropic dome projection: compress vertices in the RADIAL direction
                // by cos(theta) (orthographic sphere view), leave tangential unchanged.
                const normDist = Math.min(dist / R, 0.99);
                const theta    = Math.asin(normDist);
                const cosT     = Math.max(0.18, Math.cos(theta)); // min so edge hexes stay visible
                const phi      = dist > 0.5 ? Math.atan2(dy, dx) : 0;
                const cosPhi   = Math.cos(phi), sinPhi = Math.sin(phi);
                const hx = centerX + dx, hy = centerY + dy;
                for (let v = 0; v < 6; v++) {
                    const a  = (Math.PI / 3) * v;
                    const vx = hexR * Math.cos(a), vy = hexR * Math.sin(a);
                    // Decompose vertex offset into radial + tangential components
                    const rad = vx * cosPhi + vy * sinPhi;        // radial
                    const tan = -vx * sinPhi + vy * cosPhi;       // tangential
                    // Compress radial by cos(theta), tangential unchanged
                    const px  = hx + rad * cosT * cosPhi - tan * sinPhi;
                    const py  = hy + rad * cosT * sinPhi + tan * cosPhi;
                    v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
        }
        ctx.strokeStyle = 'rgba(150,210,255,0.18)';
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        // Bottom-half interior shadow (dome curves away from light source)
        const bottomShadow = ctx.createLinearGradient(centerX, centerY - R * 0.1, centerX, centerY + R);
        bottomShadow.addColorStop(0, 'rgba(0,10,30,0)');
        bottomShadow.addColorStop(1, 'rgba(0,15,45,0.35)');
        ctx.fillStyle = bottomShadow;
        ctx.fillRect(centerX - R, centerY - R * 0.1, R * 2, R * 1.1);

        // Broad soft specular (convex dome top-left highlight)
        const spec1 = ctx.createRadialGradient(centerX - 16, centerY - 20, 0, centerX - 16, centerY - 20, 62);
        spec1.addColorStop(0,   'rgba(255,255,255,0.30)');
        spec1.addColorStop(0.5, 'rgba(255,255,255,0.07)');
        spec1.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = spec1;
        ctx.fillRect(centerX - R, centerY - R, R * 2, R * 2);

        // Tight primary reflection dot
        const spec2 = ctx.createRadialGradient(centerX - 30, centerY - 36, 0, centerX - 30, centerY - 36, 15);
        spec2.addColorStop(0,   'rgba(255,255,255,0.80)');
        spec2.addColorStop(0.5, 'rgba(255,255,255,0.22)');
        spec2.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = spec2;
        ctx.fillRect(centerX - R, centerY - R, R * 2, R * 2);

        ctx.restore(); // end clip

        // --- Layer 3: Subtle rim ---
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(160,220,255,0.32)';
        ctx.shadowColor  = 'rgba(120,200,255,0.40)';
        ctx.shadowBlur   = 8;
        ctx.lineWidth    = 1;
        ctx.stroke();
        ctx.restore();

        // --- Hit flashes + ripple ---
        circleHitFlashes = circleHitFlashes.filter(f => f.life > 0);
        circleHitFlashes.forEach(f => {
            f.life--;
            const progress = 1 - f.life / 18;   // 0 = just hit, 1 = gone
            const alpha    = f.life / 18;

            // Rim arc flash — tapered (thick center, tapers to nothing at ends)
            ctx.save();
            ctx.lineCap    = 'round';
            ctx.shadowColor = '#44aaff';
            ctx.shadowBlur  = 14 * alpha;
            const steps = 14, span = 1.0;
            for (let i = 0; i < steps; i++) {
                const t      = i / (steps - 1);
                const taper  = Math.sin(t * Math.PI);          // 0→1→0
                const aStart = f.angle - span / 2 + t * span;
                const aEnd   = aStart + span / steps * 1.2;    // slight overlap for smoothness
                ctx.lineWidth   = 7 * taper * alpha;
                ctx.strokeStyle = `rgba(140,210,255,${alpha * taper})`;
                ctx.beginPath();
                ctx.arc(centerX, centerY, R, aStart, aEnd);
                ctx.stroke();
            }
            ctx.restore();

            // Ripple rings expanding inward from impact point, clipped to bubble
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, R - 0.5, 0, Math.PI * 2);
            ctx.clip();
            const ix = centerX + Math.cos(f.angle) * R;
            const iy = centerY + Math.sin(f.angle) * R;
            for (let j = 0; j < 3; j++) {
                const rp = progress - j * 0.22;
                if (rp <= 0 || rp >= 1.1) continue;
                const rippleR = rp * R * 2.2;
                const rAlpha  = Math.max(0, (1 - rp) * alpha * 0.65);
                ctx.beginPath();
                ctx.arc(ix, iy, rippleR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(160,220,255,${rAlpha})`;
                ctx.lineWidth   = 1.2;
                ctx.stroke();
            }
            ctx.restore();
        });

        // --- Slot placeholders (screen-space: turret is always at centerX/centerY visually) ---
        const displaySlots = [
            { x: centerX - SLOT_OFFSET, y: centerY - SLOT_OFFSET },
            { x: centerX + SLOT_OFFSET, y: centerY - SLOT_OFFSET },
            { x: centerX + SLOT_OFFSET, y: centerY + SLOT_OFFSET },
            { x: centerX - SLOT_OFFSET, y: centerY + SLOT_OFFSET },
        ];
        ctx.save();
        displaySlots.forEach((slot, i) => {
            if (miniTurrets.some(t => t.slotIdx === i)) return;
            const s = 6;
            ctx.strokeStyle = 'rgba(120,150,170,0.32)';
            ctx.lineWidth   = 1;
            ctx.setLineDash([2, 3]);
            ctx.strokeRect(slot.x - s, slot.y - s, s * 2, s * 2);
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(90,115,135,0.22)';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.moveTo(slot.x - 3, slot.y); ctx.lineTo(slot.x + 3, slot.y);
            ctx.moveTo(slot.x, slot.y - 3); ctx.lineTo(slot.x, slot.y + 3);
            ctx.stroke();
        });
        ctx.restore();
    }

    // --- Heat / Jam Meter (persistent arc around turret) ---
    function drawHeatMeter() {
        const heatRatio  = state.heat / 100;
        const isJammed   = state.jammed;
        if (heatRatio <= 0.01 && !isJammed) return;

        const radius     = 42;
        const startAngle = -Math.PI * 0.5;
        const fullSweep  = Math.PI * 2;
        ctx.save();

        // Background ring — always faint
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, fullSweep);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        if (isJammed) {
            const progress = state.jamFrames / state.jamDuration;
            const inZone   = progress >= VENT_ZONE_LO && progress <= VENT_ZONE_HI;
            // Highlighted vent zone (fixed arc band)
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius,
                startAngle + fullSweep * VENT_ZONE_LO,
                startAngle + fullSweep * VENT_ZONE_HI);
            ctx.strokeStyle = 'rgba(255,220,0,0.72)';
            ctx.lineWidth   = 6;
            ctx.stroke();
            // Countdown arc (shrinks as jam clears)
            if (progress > 0) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + fullSweep * progress);
                ctx.strokeStyle = inZone ? '#ffcc00' : '#ff3300';
                ctx.shadowColor = inZone ? '#ffcc00' : '#ff3300';
                ctx.shadowBlur  = inZone ? 10 : 4;
                ctx.lineWidth   = 2;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.font       = '700 8px "Exo 2", sans-serif';
            ctx.textAlign  = 'center';
            ctx.fillStyle  = inZone ? '#ffcc00' : 'rgba(255,80,0,0.8)';
            ctx.fillText(inZone ? '▶ VENT [R]' : 'JAMMED', centerX, centerY + 55);
        } else {
            // Normal heat arc — orange→red as it fills
            const g = Math.round(200 - heatRatio * 200);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + fullSweep * heatRatio);
            ctx.strokeStyle = `rgb(255,${g},0)`;
            ctx.shadowColor = `rgb(255,${g},0)`;
            ctx.shadowBlur  = heatRatio > 0.65 ? 7 : 2;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Wave cooldown ring — always visible, fills as cooldown recharges
        const waveElapsed  = Date.now() - (state.waveLastUsed || 0);
        const waveReady    = waveElapsed >= WAVE_COOLDOWN;
        const waveProgress = Math.min(1, waveElapsed / WAVE_COOLDOWN);
        const wR = 54;
        ctx.save();
        // Full background ring always drawn
        ctx.beginPath();
        ctx.arc(centerX, centerY, wR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,180,220,0.15)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        // Progress arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, wR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * waveProgress);
        ctx.strokeStyle = waveReady ? '#00eeff' : 'rgba(0,180,220,0.55)';
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur  = waveReady ? 10 : 2;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        // Label — always shown, dims while charging
        const pulse = waveReady ? (0.55 + 0.45 * Math.sin(Date.now() / 220)) : 0.3;
        ctx.font      = '700 7px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = waveReady ? `rgba(0,238,255,${pulse})` : `rgba(0,180,220,0.35)`;
        ctx.shadowColor = '#00ccff'; ctx.shadowBlur = waveReady ? 10 * pulse : 0;
        ctx.fillText(waveReady ? '▶ WAVE [E]' : 'WAVE [E]', centerX, centerY + 66);
        ctx.restore();
    }

    function getNextTurretSlot() {
        for (let i = 0; i < MINI_TURRET_MAX; i++) {
            if (!miniTurrets.some(t => t.slotIdx === i)) return i;
        }
        return -1;
    }

    // --- Mini Turrets ---
    function renderMiniTurrets() {
        const now = Date.now();
        miniTurrets = miniTurrets.filter(t => t.hp > 0);
        if (miniturretCountEl) miniturretCountEl.textContent = miniTurrets.length + flameTurrets.length;

        miniTurrets.forEach(t => {
            // Lag follow: lerp toward target with per-turret speed + gentle wobble
            if (t.targetX !== undefined) {
                t.wobblePhase += t.wobbleFreq;
                const wob = Math.sin(t.wobblePhase) * t.wobbleAmp;
                const perpX = Math.cos(t.wobblePhase + Math.PI / 2) * wob;
                const perpY = Math.sin(t.wobblePhase + Math.PI / 2) * wob;
                t.x += ((t.targetX + perpX) - t.x) * t.lerpSpeed;
                t.y += ((t.targetY + perpY) - t.y) * t.lerpSpeed;
            }

            let closest = null, closestDist = t.range;
            enemies.forEach(e => {
                const d = Math.hypot(e.x - t.x, e.y - t.y);
                if (d < closestDist) { closest = e; closestDist = d; }
            });

            const angle = closest ? Math.atan2(closest.y - t.y, closest.x - t.x) : (t.lastAngle || 0);
            if (closest) t.lastAngle = angle;

            // Range ring
            ctx.save();
            ctx.strokeStyle = 'rgba(90,120,140,0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Body + barrel
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(angle);
            // Hexagonal base platform
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const a = (Math.PI / 3) * v + Math.PI / 6;
                v === 0 ? ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
                        : ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
            }
            ctx.closePath();
            ctx.fillStyle   = 'rgba(50,72,88,0.35)';
            ctx.shadowColor = 'rgba(110,145,168,0.65)';
            ctx.shadowBlur  = 8;
            ctx.fill();
            ctx.strokeStyle = 'rgba(135,165,185,0.68)';
            ctx.lineWidth   = 1;
            ctx.stroke();
            // Circular turret body — gunmetal
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fillStyle   = '#3a5265';
            ctx.shadowColor = 'rgba(110,145,165,0.7)';
            ctx.shadowBlur  = 5;
            ctx.fill();
            // Barrel — thick rect with rounded cap
            ctx.fillStyle  = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur  = 4;
            ctx.beginPath();
            ctx.roundRect(2, -1.8, 10, 3.6, 1.5);
            ctx.fill();
            ctx.restore();

            // HP bar — below turret
            const bw = 22, bh = 1.5, hpR = t.hp / t.maxHp;
            ctx.fillStyle = '#222';
            ctx.fillRect(t.x - bw / 2, t.y + 12, bw, bh);
            ctx.fillStyle = hpR > 0.5 ? '#70a880' : '#c04030';
            ctx.fillRect(t.x - bw / 2, t.y + 12, bw * hpR, bh);

            // Auto-fire
            if (closest && now - t.lastFired >= t.fireCooldown) {
                t.lastFired = now;
                const spreadOffset = (Math.random() - 0.5) * 0.15;
                const finalAngle   = angle + spreadOffset;
                const fireDx = Math.cos(finalAngle), fireDy = Math.sin(finalAngle);
                const edge   = rayToEdge(t.x, t.y, t.x + fireDx, t.y + fireDy);
                gatlingBullets.push({ x1: t.x, y1: t.y, x2: edge.x, y2: edge.y, progress: 0, trail: [], damage: t.damage, fromTurret: true });
            }
        });
    }

    // --- Particles ---
function spawnExplosion(x, y) {
        playExplosionSound();
        shakeCanvas(7);
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

    function spawnBoundaryHit(x, y) {
        shakeCanvas(3);
        const colors = ['#44aaff', '#88ccff', '#aaddff', '#ffffff'];
        for (let i = 0; i < 10; i++) {
            const a = Math.PI * 2 * Math.random();
            const s = 1.0 + Math.random() * 3.5;
            particles.push({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                size: 1 + Math.random() * 2,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
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
            state.streak++;
            state.streakFrames = 90;
            const multiplier = 1 + Math.floor(state.streak / 3) * 0.5;
            addScore(Math.round(e.maxHp * 100 * multiplier));
            state.credits += 8 + (e.maxHp - 3) * 5; // 8 / 13 / 23+ per kill
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
        // Use current viewport bounds in world space
        const vLeft = playerX - centerX, vRight  = playerX + centerX;
        const vTop  = playerY - centerY, vBottom = playerY + centerY;
        const ts = [];
        if (dx > 0) ts.push((vRight  - x1) / dx);
        else if (dx < 0) ts.push((vLeft - x1) / dx);
        if (dy > 0) ts.push((vBottom - y1) / dy);
        else if (dy < 0) ts.push((vTop  - y1) / dy);
        const t = Math.min(...ts.filter(v => v > 0));
        return { x: x1 + dx * t, y: y1 + dy * t };
    }

    // Point-to-line-segment distance check for ray hit detection
    function rayHitsEnemy(e, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq > 0
            ? Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / lenSq))
            : 0;
        return Math.hypot(e.x - (x1 + t * dx), e.y - (y1 + t * dy)) < (e.size || 10) + (state.bulletRadius || 0);
    }

    // --- Vent Overheat ---
    const VENT_ZONE_LO = 0.38; // jam progress range where R vents instantly
    const VENT_ZONE_HI = 0.62;

    function ventOverheat() {
        if (!state.jammed) return;
        const now = Date.now();
        if (now - (state.lastVented || 0) < 200) return;
        state.lastVented = now;
        const progress = state.jamFrames / state.jamDuration;
        if (progress >= VENT_ZONE_LO && progress <= VENT_ZONE_HI) {
            state.jammed = false;
            state.jamFrames = 0;
            state.heat = 10;
        }
        // Outside zone: nothing — wait out the full cooldown
    }

    // --- Fire ---
    function fireAction() {
        if (!state.fireCooldown) return;
        if (state.jammed) return;
        const now = Date.now();
        if (now - state.lastFired < state.fireCooldown) return;
        state.lastFired = now;
        state.heat = Math.min(100, state.heat + 7);
        if (state.heat >= 100) { state.jammed = true; state.jamFrames = state.jamDuration; state.jamWindowAngle = Math.PI; }

        const tx = cursorPosX, ty = cursorPosY;

        // Apply spread — random angular offset within ±spread/2
        const baseAngle = Math.atan2(ty - centerY, tx - centerX);
        const spreadOffset = (Math.random() - 0.5) * state.spread;
        const fireAngle = baseAngle + spreadOffset;
        const fireDx = Math.cos(fireAngle), fireDy = Math.sin(fireAngle);
        const edge = rayToEdge(playerX, playerY, playerX + fireDx, playerY + fireDy);

        playGatlingSound();
        muzzleFlashAngle = fireAngle;
        muzzleFlashFrames = 4;
        gatlingBullets.push({ x1: playerX, y1: playerY, x2: edge.x, y2: edge.y, progress: 0, trail: [], damage: state.bulletDamage });
        // Eject shell casing
        const casingAngle = fireAngle - Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const casingSpeed = 2.5 + Math.random() * 2.5;
        shellCasings.push({
            x: playerX + Math.cos(casingAngle) * 8,
            y: playerY + Math.sin(casingAngle) * 8,
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
        if (state.invincFrames > 0) { state.invincFrames--; return; }
        enemies = enemies.filter(e => {
            if (Math.hypot(e.x - playerX, e.y - playerY) < 72) {
                takeHealth();
                playBoundaryHitSound();
                const hitAngle = Math.atan2(e.y - playerY, e.x - playerX);
                const impactX  = playerX + Math.cos(hitAngle) * 54;
                const impactY  = playerY + Math.sin(hitAngle) * 54;
                spawnBoundaryHit(impactX, impactY);
                circleHitFlashes.push({ angle: hitAngle, life: 18 });
                return false;
            }
            return true;
        });

        // Enemy bullet hits
        enemyBullets = enemyBullets.filter(b => {
            if (Math.hypot(b.x - playerX, b.y - playerY) < 72) {
                takeHealth();
                playBoundaryHitSound();
                const hitAngle = Math.atan2(b.y - playerY, b.x - playerX);
                circleHitFlashes.push({ angle: hitAngle, life: 14 });
                return false;
            }
            return true;
        });
    }

    function takeHealth() {
        const bonus = state.level > LEVELS.length
            ? Math.min(15, (state.level - LEVELS.length) * 1.5)
            : 0;
        state.health = Math.max(0, state.health - (5 + bonus));
        healthBar.style.width = `${state.health}%`;
        // Splash: all deployed turrets take 3 damage
        miniTurrets.forEach(t => { t.hp = Math.max(0, t.hp - 3); });
        flameTurrets.forEach(t => { t.hp = Math.max(0, t.hp - 3); });
    }

    // --- Story / Cutscenes ---
    // Triggered every 5 levels. Each beat has panels with speaker + text.
    const STORY_BEATS = [
        { level: 5, label: 'INCOMING TRANSMISSION', panels: [
            { speaker: 'COMMAND', text: 'Cadet, you\'ve held the line longer than we expected. Command is... impressed.' },
            { speaker: 'COMMAND', text: 'Reinforcements are unavailable. Something is jamming our drop ships. You\'re on your own for now. Hold steady.' },
            { speaker: 'COMMAND', text: 'Bonus credits dispatched. Spend them wisely — this is just the beginning.' },
        ]},
        { level: 10, label: 'PRIORITY ALERT', panels: [
            { speaker: 'COMMAND', text: 'New intel. The blocks aren\'t spawning randomly. Their formations are coordinated.' },
            { speaker: 'COMMAND', text: 'We\'re picking up a signal buried in the static. Something out there is directing them. We don\'t know what.' },
            { speaker: 'COMMAND', text: 'Whatever it is, it noticed you. Keep fighting. We need to buy time to trace that signal.' },
        ]},
        { level: 15, label: 'SIGNAL INTERCEPTED', panels: [
            { speaker: '???', text: '...can you... hear me through the... static...?' },
            { speaker: '???', text: 'I am not your enemy. The blocks are not an invasion. They are a language.' },
            { speaker: 'COMMAND', text: 'Cadet, ignore that transmission! It\'s a trick. Continue fighting. That is an order.' },
            { speaker: '???', text: 'You will understand soon. Survive a little longer. I am trying to reach you.' },
        ]},
        { level: 20, label: 'DIRECT CONTACT', panels: [
            { speaker: 'THE BLOCKMASTER', text: 'You have survived twenty waves. No cadet has ever lasted this long against us.' },
            { speaker: 'THE BLOCKMASTER', text: 'This was never an invasion. It was a trial. A test of worth.' },
            { speaker: 'THE BLOCKMASTER', text: 'You passed. But the real test is ahead. The blocks will come faster now. Harder. Show me what you truly are.' },
        ]},
        { level: 25, label: 'THE TRUTH', panels: [
            { speaker: 'THE BLOCKMASTER', text: 'You were never defending your world, cadet. You were being recruited.' },
            { speaker: 'THE BLOCKMASTER', text: 'My blocks are soldiers, not enemies. They fought you to measure your strength. And you measured well.' },
            { speaker: 'THE BLOCKMASTER', text: 'Join me. The universe is full of worlds that need breaking. And I need a partner who can hold the line.' },
            { speaker: 'COMMAND', text: 'Cadet... don\'t listen. Come home. Please.' },
        ]},
        { level: 30, label: 'CHOICE', panels: [
            { speaker: 'THE BLOCKMASTER', text: 'Thirty waves. You are beyond anything I have ever forged. The blocks obey you now as much as me.' },
            { speaker: 'THE BLOCKMASTER', text: 'But I will not make you choose. Not yet. Fight on. Prove you are worth the darkness between the stars.' },
        ]},
    ];

    let cutsceneState = { beatIdx: 0, panelIdx: 0, typing: false, typeTimer: null };

    function getStoryBeat(level) {
        // Find the highest-multiple story beat that the level has reached
        let beat = null;
        for (const b of STORY_BEATS) {
            if (level >= b.level) beat = b;
        }
        return beat;
    }

    function isStoryLevel(level) {
        return STORY_BEATS.some(b => b.level === level);
    }

    function startCutscene(beat) {
        cutsceneState.beatIdx = STORY_BEATS.indexOf(beat);
        cutsceneState.panelIdx = 0;
        cutsceneLabel.textContent = beat.label;
        cutscene.style.display = 'flex';
        hideGame();
        showCutscenePanel();
    }

    function showCutscenePanel() {
        const beat = STORY_BEATS[cutsceneState.beatIdx];
        const panel = beat.panels[cutsceneState.panelIdx];
        cutsceneSpeaker.textContent = panel.speaker;
        cutsceneText.textContent = '';
        cutsceneText.classList.remove('done');
        cutsceneProgress.textContent = `${cutsceneState.panelIdx + 1} / ${beat.panels.length}`;
        cutsceneBtn.textContent = 'SKIP';

        // Typewriter effect
        if (cutsceneState.typeTimer) clearInterval(cutsceneState.typeTimer);
        cutsceneState.typing = true;
        let charIdx = 0;
        cutsceneState.typeTimer = setInterval(() => {
            if (charIdx >= panel.text.length) {
                clearInterval(cutsceneState.typeTimer);
                cutsceneState.typeTimer = null;
                cutsceneState.typing = false;
                cutsceneText.classList.add('done');
                const isLast = cutsceneState.panelIdx >= beat.panels.length - 1;
                cutsceneBtn.textContent = isLast ? 'CONTINUE \u25B6' : 'NEXT \u25B6';
                return;
            }
            cutsceneText.textContent += panel.text[charIdx];
            charIdx++;
        }, 28);
    }

    function advanceCutscene() {
        const beat = STORY_BEATS[cutsceneState.beatIdx];

        // If still typing, skip to full text
        if (cutsceneState.typing) {
            clearInterval(cutsceneState.typeTimer);
            cutsceneState.typeTimer = null;
            cutsceneState.typing = false;
            cutsceneText.textContent = beat.panels[cutsceneState.panelIdx].text;
            cutsceneText.classList.add('done');
            const isLast = cutsceneState.panelIdx >= beat.panels.length - 1;
            cutsceneBtn.textContent = isLast ? 'CONTINUE \u25B6' : 'NEXT \u25B6';
            return;
        }

        // Advance to next panel
        cutsceneState.panelIdx++;
        if (cutsceneState.panelIdx < beat.panels.length) {
            showCutscenePanel();
        } else {
            // Cutscene finished — give bonus and show shop
            cutscene.style.display = 'none';
            const bonus = 100 + state.level * 15;
            state.credits += bonus;
            showLevelUpScreen();
        }
    }

    cutsceneBtn.addEventListener('click', advanceCutscene);

    // --- Level Up ---
    function checkLevelUp() {
        const def = getLevelDef();
        if (state.levelKills < def.killsToNext) return;
        clearAllIntervals();
        enemies = [];
        state.credits += 50 + state.level * 10; // level completion bonus
        state.level++;
        state.levelKills = 0;
        levelDisplay.textContent = state.level;
        if (isStoryLevel(state.level)) {
            const beat = getStoryBeat(state.level);
            startCutscene(beat);
        } else {
            showLevelUpScreen();
        }
    }

    function showLevelUpScreen() {
        levelHeading.textContent = `LEVEL ${state.level}`;
        levelDesc.textContent = LEVEL_DESCS[state.level - 1] || '';
        populateUpgrades();
        levelMenu.style.display = 'block';
        pauseOverlay.style.display = 'none';
        hideGame();
    }

    function hideLevelUpScreen() {
        levelMenu.style.display = 'none';
    }

    const TURRET_UPGRADES = [
        { key: 'tdmg',  name: 'TURRET DMG',       baseCost: 182, costStep: 121, desc: 'All turrets deal +50% damage.',                       apply: () => { miniTurrets.forEach(t => { t.damage = +(t.damage * 1.5).toFixed(2); }); flameTurrets.forEach(t => { t.damage = +((t.damage || SHOTGUN_DAMAGE) * 1.5).toFixed(2); }); } },
        { key: 'trate', name: 'TURRET FIRE RATE',  baseCost: 154, costStep: 94,  desc: 'All turrets fire 30% faster.',                        apply: () => { miniTurrets.forEach(t => { t.fireCooldown = Math.max(300, Math.round(t.fireCooldown * 0.70)); }); flameTurrets.forEach(t => { t.fireCooldown = Math.max(700, Math.round((t.fireCooldown || SHOTGUN_COOLDOWN) * 0.70)); }); } },
        { key: 'thp',   name: 'TURRET ARMOR',      baseCost: 138, costStep: 88,  desc: 'All turrets gain +20 max HP and are fully repaired.',  apply: () => { [...miniTurrets, ...flameTurrets].forEach(t => { t.maxHp += 20; t.hp = t.maxHp; }); } },
    ];

    function getUpgradeCost(u) {
        const count = state.upgradeCounts[u.key] || 0;
        return u.baseCost + count * u.costStep;
    }

    function makeUpgradeCard(u, applyFn) {
        const card = document.createElement('div');
        card.className = 'weapon-card';

        const nameEl = document.createElement('div');
        nameEl.className = 'weapon-name'; nameEl.textContent = u.name;

        const descEl = document.createElement('div');
        descEl.className = 'weapon-desc'; descEl.textContent = u.desc;

        const costEl = document.createElement('div');
        costEl.className = 'weapon-desc';
        costEl.style.cssText = 'color:#1bffc1; font-weight:700; margin-bottom:6px;';

        const actionEl = document.createElement('div');
        actionEl.className = 'weapon-action';
        const btn = document.createElement('button');

        function refresh() {
            const cost = getUpgradeCost(u);
            const affordable = state.credits >= cost;
            costEl.textContent = `${cost} CR`;
            btn.textContent    = 'BUY';
            btn.disabled       = !affordable;
            card.classList.toggle('active-weapon', affordable);
        }

        btn.onclick = () => {
            const cost = getUpgradeCost(u);
            if (state.credits < cost) return;
            state.credits -= cost;
            state.upgradeCounts[u.key] = (state.upgradeCounts[u.key] || 0) + 1;
            applyFn();
            populateUpgrades(); // re-render with updated credits + costs
        };

        actionEl.appendChild(btn);
        card.appendChild(nameEl); card.appendChild(descEl);
        card.appendChild(costEl); card.appendChild(actionEl);
        refresh();
        return card;
    }

    function makeTurretPurchaseCard(key, name, desc, baseCost, costStep, getCount, getMax, deployFn) {
        const card = document.createElement('div');
        card.className = 'weapon-card';

        const nameEl = document.createElement('div');
        nameEl.className = 'weapon-name';

        const descEl = document.createElement('div');
        descEl.className = 'weapon-desc';
        descEl.textContent = desc;

        const costEl = document.createElement('div');
        costEl.className = 'weapon-desc';
        costEl.style.cssText = 'color:#1bffc1; font-weight:700; margin-bottom:6px;';

        const actionEl = document.createElement('div');
        actionEl.className = 'weapon-action';
        const btn = document.createElement('button');

        function refresh() {
            const count = getCount();
            const max   = getMax();
            const cost  = baseCost + (state.upgradeCounts[key] || 0) * costStep;
            const full  = count >= max;
            const affordable = state.credits >= cost;
            nameEl.textContent = `${name} (${count}/${max})`;
            costEl.textContent = full ? 'FULL' : `${cost} CR`;
            btn.textContent    = 'DEPLOY';
            btn.disabled       = full || !affordable;
            card.classList.toggle('active-weapon', !full && affordable);
        }

        btn.onclick = () => {
            const count = getCount();
            if (count >= getMax()) return;
            const cost = baseCost + (state.upgradeCounts[key] || 0) * costStep;
            if (state.credits < cost) return;
            state.credits -= cost;
            state.upgradeCounts[key] = (state.upgradeCounts[key] || 0) + 1;
            deployFn();
            populateUpgrades();
        };

        actionEl.appendChild(btn);
        card.appendChild(nameEl);
        card.appendChild(descEl);
        card.appendChild(costEl);
        card.appendChild(actionEl);
        refresh();
        return card;
    }

    function populateUpgrades() {
        weaponShop.innerHTML = '';

        // Credits header
        const header = document.createElement('p');
        header.className = 'shop-credits-line';
        header.style.cssText = 'grid-column:1/-1; margin-bottom:12px;';
        header.innerHTML = `CREDITS: <span style="color:#1bffc1; font-size:1.1em;">${state.credits}</span>`;
        weaponShop.appendChild(header);

        // Player upgrades
        UPGRADES.forEach(u => {
            weaponShop.appendChild(makeUpgradeCard(u, () => u.apply(state)));
        });

        // Turret purchase section
        const turretSep = document.createElement('p');
        turretSep.className = 'shop-credits-line';
        turretSep.style.cssText = 'margin-top:20px; grid-column:1/-1; width:100%; border-top:1px solid rgba(255,255,255,0.1); padding-top:14px;';
        turretSep.textContent = 'DEPLOY TURRETS';
        weaponShop.appendChild(turretSep);

        weaponShop.appendChild(makeTurretPurchaseCard(
            'buy_gatling', 'GATLING TURRET',
            'Deploys a Gatling turret at a diagonal slot. Fast-firing, accurate.',
            250, 150,
            () => miniTurrets.length,
            () => MINI_TURRET_MAX,
            () => {
                const slotIdx = getNextTurretSlot();
                if (slotIdx === -1) return;
                const slot = getSlotPositions()[slotIdx];
                miniTurrets.push({
                    x: slot.x, y: slot.y, targetX: slot.x, targetY: slot.y, slotIdx,
                    hp: MINI_TURRET_HP, maxHp: MINI_TURRET_HP,
                    range: MINI_TURRET_RANGE, fireCooldown: MINI_TURRET_COOLDOWN,
                    damage: MINI_TURRET_DAMAGE, lastFired: 0, lastAngle: 0,
                    wobblePhase: Math.random() * Math.PI * 2,
                    wobbleFreq: 0.025 + Math.random() * 0.02,
                    wobbleAmp: 3 + Math.random() * 3,
                    lerpSpeed: 0.055 + Math.random() * 0.04,
                });
            }
        ));

        weaponShop.appendChild(makeTurretPurchaseCard(
            'buy_shotgun', 'SHOTGUN TURRET',
            'Deploys a Shotgun turret at a cardinal slot. 7-pellet burst, wide arc.',
            350, 200,
            () => flameTurrets.length,
            () => SHOTGUN_TURRET_MAX,
            () => {
                const slotIdx = getNextShotgunSlot();
                if (slotIdx === -1) return;
                const slot = getShotgunSlotPositions()[slotIdx];
                flameTurrets.push({
                    x: slot.x, y: slot.y, slotIdx,
                    hp: MINI_TURRET_HP, maxHp: MINI_TURRET_HP,
                    damage: SHOTGUN_DAMAGE, lastAngle: 0, lastFired: 0,
                    wobblePhase: Math.random() * Math.PI * 2,
                    wobbleFreq: 0.022 + Math.random() * 0.018,
                    wobbleAmp: 2.5 + Math.random() * 2.5,
                    lerpSpeed: 0.05 + Math.random() * 0.035,
                });
            }
        ));

        // Turret upgrades — only if any turrets are deployed
        const anyTurrets = miniTurrets.length > 0 || flameTurrets.length > 0;
        if (anyTurrets) {
            const sep = document.createElement('p');
            sep.className = 'shop-credits-line';
            sep.style.cssText = 'margin-top:20px; grid-column:1/-1; width:100%; border-top:1px solid rgba(255,255,255,0.1); padding-top:14px;';
            sep.textContent = 'TURRET UPGRADES';
            weaponShop.appendChild(sep);
            TURRET_UPGRADES.forEach(u => {
                weaponShop.appendChild(makeUpgradeCard(u, () => u.apply()));
            });
        }
    }

    // --- Game Loop ---
    function updatePlayerPosition() {
        let dx = 0, dy = 0;
        const spd = state.playerSpeed || PLAYER_SPEED;
        if (keysHeld.w) dy -= spd;
        if (keysHeld.s) dy += spd;
        if (keysHeld.a) dx -= spd;
        if (keysHeld.d) dx += spd;
        if (leftTouch) {
            const mag = Math.hypot(leftTouch.dx, leftTouch.dy);
            if (mag > JOYSTICK_DEAD) {
                const norm = Math.min(mag, JOYSTICK_RADIUS) / JOYSTICK_RADIUS;
                dx += (leftTouch.dx / mag) * spd * norm;
                dy += (leftTouch.dy / mag) * spd * norm;
            }
        }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        playerX += dx;
        playerY += dy;
        // Update turret targets to follow player
        const slots = getSlotPositions();
        miniTurrets.forEach(t => {
            if (t.slotIdx !== undefined) {
                t.targetX = slots[t.slotIdx].x;
                t.targetY = slots[t.slotIdx].y;
            }
        });
    }

    function gameLoop() {
        updatePlayerPosition();
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        renderTurretArea();

        // Turret heat glow + overheat blink/shrink
        const heatRatio = state.heat / 100;
        const isJammed  = state.jammed;
        // Blink: alternate visibility every 4 frames when jammed
        const jamBlink  = isJammed && (Math.floor(Date.now() / 80) % 2 === 0);
        // Scale: shrink down to 0.72 when jammed
        let turretScale = isJammed ? 0.72 : (1 - heatRatio * 0.08);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(turretScale, turretScale);
        ctx.translate(-centerX, -centerY);
        if (!jamBlink) {
            if (heatRatio > 0.05) {
                const glowRadius = 36 + heatRatio * 22;
                const glowAlpha  = heatRatio * (isJammed ? 0.85 : 0.55);
                const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, glowRadius);
                const r = Math.round(255);
                const g = Math.round(isJammed ? 0 : 180 - heatRatio * 180);
                grad.addColorStop(0, `rgba(${r},${g},0,${glowAlpha})`);
                grad.addColorStop(1, 'rgba(255,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            playerTurret.render();
        }
        ctx.restore();
        drawHeatMeter();

        drawPlayerBarrel();
        turretTarget(cursorPosX, cursorPosY);

        // Camera transform — world objects rendered relative to player position
        const camX = centerX - playerX, camY = centerY - playerY;
        gameCanvas.style.backgroundPosition = `${camX % 100}px ${camY % 100}px`;
        ctx.save();
        ctx.translate(camX, camY);
        renderEnemies();
        renderGatlingBullets();
        renderMiniTurrets();
        renderFlameTurrets();
        renderShellCasings();
        renderEnemyBullets();
        renderWaveRings();
        renderGatlingMuzzleFlash();
        renderParticles();
        ctx.restore();
        // Touch overlays — screen space, drawn after world camera restore
        ctx.save();

        // Left: movement joystick
        if (leftTouch) {
            const ox    = leftTouch.originX, oy = leftTouch.originY;
            const mag   = Math.hypot(leftTouch.dx, leftTouch.dy);
            const clamp = Math.min(mag, JOYSTICK_RADIUS);
            const kx    = mag > 0 ? ox + (leftTouch.dx / mag) * clamp : ox;
            const ky    = mag > 0 ? oy + (leftTouch.dy / mag) * clamp : oy;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(ox, oy, JOYSTICK_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth   = 2;
            ctx.stroke();
            ctx.fillStyle   = 'rgba(255,255,255,0.04)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(kx, ky, 24, 0, Math.PI * 2);
            ctx.fillStyle   = 'rgba(255,255,255,0.18)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        // Right: trackpad aim indicator — origin dot + line to current finger position
        if (rightTouch) {
            const ox  = rightTouch.originX, oy = rightTouch.originY;
            const fx  = ox + rightTouch.dx,  fy = oy + rightTouch.dy;
            const mag = Math.hypot(rightTouch.dx, rightTouch.dy);
            ctx.globalAlpha = 0.5;
            // Origin crosshair
            ctx.strokeStyle = 'rgba(255,120,60,0.55)';
            ctx.lineWidth   = 1.5;
            ctx.lineCap     = 'round';
            const cs = 10;
            ctx.beginPath();
            ctx.moveTo(ox - cs, oy); ctx.lineTo(ox + cs, oy);
            ctx.moveTo(ox, oy - cs); ctx.lineTo(ox, oy + cs);
            ctx.stroke();
            // Line + tip dot once dragged past jitter threshold
            if (mag > AIM_DEAD) {
                ctx.beginPath();
                ctx.moveTo(ox, oy);
                ctx.lineTo(fx, fy);
                ctx.strokeStyle = 'rgba(255,140,60,0.45)';
                ctx.lineWidth   = 1.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(fx, fy, 7, 0, Math.PI * 2);
                ctx.fillStyle   = 'rgba(255,120,60,0.4)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,150,60,0.7)';
                ctx.lineWidth   = 1.5;
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        if (mouseIsDown) fireAction();
        hitDetect();
        checkLevelUp();

        // Wave ready ping
        const waveNowReady = Date.now() - state.waveLastUsed >= WAVE_COOLDOWN;
        if (waveNowReady && !state.waveWasReady) playWaveReadySound();
        state.waveWasReady = waveNowReady;

        // Overheat: cool down, handle jam
        if (state.jammed) {
            state.jamFrames--;
            if (state.jamFrames <= 0) { state.jammed = false; state.heat = 20; }
        } else {
            state.heat = Math.max(0, state.heat - 1.2);
        }

        // Kill streak display
        if (state.streakFrames > 0) {
            state.streakFrames--;
            if (state.streak >= 3) {
                streakDisplay.textContent = `STREAK ×${state.streak}`;
                streakDisplay.classList.add('visible');
            }
        } else {
            state.streak = 0;
            streakDisplay.classList.remove('visible');
        }

        if (state.health <= 0 && state.lives > 0) {
            state.lives--;
            livesText.textContent = state.lives;
            state.health = 100;
            healthBar.style.width = '100%';
            state.invincFrames = 120;
            shakeCanvas(12);
            ctx.save();
            ctx.fillStyle = 'rgba(255,0,0,0.35)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.restore();
        } else if (state.health <= 0 && state.lives === 0) {
            gameLose();
        }
    }

    // --- HUD ---
    function showGame() {
        bottomBar.style.display = 'flex';
        topBar.style.display = 'flex';
        healthText.style.display = 'inline-block';
        titleEl.style.display = 'none';
        controlsLegend.style.display = 'block';
        controlsOpen.style.display = 'none';
    }
    function hideGame() {
        bottomBar.style.display = 'none';
        topBar.style.display = 'none';
        healthText.style.display = 'none';
        titleEl.style.display = '';
        controlsLegend.style.display = 'none';
        controlsOpen.style.display = 'none';
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
            heat: 0,
            jammed: false,
            jamFrames: 0,
            jamDuration: 80,
            waveLastUsed: -WAVE_COOLDOWN,
            waveWasReady: true,
            invincFrames: 0,
            bulletRadius: 0,
            waveRange: WAVE_RANGE,
            waveDamage: 1,
            playerSpeed: PLAYER_SPEED,
            credits: 80,
            upgradeCounts: {},
            jamWindowAngle: Math.PI,
            streak: 0,
            streakFrames: 0,
            lastVented: 0,
        };
        playerX = centerX; playerY = centerY;
        keysHeld.w = keysHeld.a = keysHeld.s = keysHeld.d = false;
        leftTouch = null; rightTouch = null; mouseIsDown = false;
        enemies = []; particles = []; gatlingBullets = []; shellCasings = [];
        miniTurrets = []; flameTurrets = []; circleHitFlashes = []; waveRings = []; enemyBullets = [];
        if (miniturretCountEl) miniturretCountEl.textContent = '0';
        scoreBoard.textContent = '0';
        livesText.textContent = '3';
        weaponDisplay.textContent = 'GATLING';
        levelDisplay.textContent = '1';
        healthBar.style.width = '100%';
        streakDisplay.classList.remove('visible');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        paused = false;
        pauseOverlay.style.display = 'none';
        cutscene.style.display = 'none';
        if (cutsceneState.typeTimer) { clearInterval(cutsceneState.typeTimer); cutsceneState.typeTimer = null; }
    }

    function clearAllIntervals() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        gameRunning = false;
    }

    function getSpawnInterval() {
        return getLevelDef().spawnInterval;
    }

    // Single rAF loop — fixed-timestep accumulator.
    // Move ticks at 20ms, logic at 30ms, spawn at level-scaled interval.
    // Render every native frame (smooth on high-refresh displays).
    function gameFrame(timestamp) {
        if (!gameRunning || paused) return;
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min(timestamp - lastTime, 100); // clamp tab-switch gaps
        lastTime = timestamp;

        moveAcc  += dt;
        logicAcc += dt;
        spawnAcc += dt;

        // Enemy movement — 20ms fixed
        let moveBudget = 5; // safety cap to avoid spiral-of-death
        while (moveAcc >= 20 && moveBudget-- > 0) {
            moveEnemies();
            moveAcc -= 20;
        }
        if (moveBudget < 0) moveAcc = 0; // gave up — drop backlog

        // Spawn — level-scaled interval
        const spawnInterval = getSpawnInterval();
        if (spawnAcc >= spawnInterval) {
            spawnEnemy();
            spawnAcc -= spawnInterval;
            if (spawnAcc > spawnInterval * 3) spawnAcc = 0; // drop backlog
        }

        // Logic + render — 30ms fixed (the old gameLoop)
        let logicBudget = 5;
        while (logicAcc >= 30 && logicBudget-- > 0) {
            gameLoop();
            logicAcc -= 30;
        }
        if (logicBudget < 0) logicAcc = 0;

        rafId = requestAnimationFrame(gameFrame);
    }

    function startIntervals() {
        state.perFrameDistance = Math.min(ENEMY_MAX_SPEED, LEVEL_SPEEDS[Math.min(state.level - 1, LEVEL_SPEEDS.length - 1)]);
        moveAcc = 0; logicAcc = 0; spawnAcc = 0; lastTime = 0;
        gameRunning = true;
        paused      = false;
        rafId = requestAnimationFrame(gameFrame);
    }

    function togglePause() {
        if (!gameRunning) return;
        if (paused) {
            // Resume
            paused = false;
            pauseOverlay.style.display = 'none';
            lastTime = 0; // reset so dt doesn't jump after resume
            rafId = requestAnimationFrame(gameFrame);
        } else {
            // Pause — cancel rAF, keep state
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            paused = true;
            pauseOverlay.style.display = 'flex';
        }
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

    returnMenuLose.addEventListener('click', function() {
        loseMenu.style.display = 'none';
        startMenu.style.display = 'block';
        hideGame(); defaults();
    });

    resetLose.addEventListener('click', function() {
        loseMenu.style.display = 'none';
        showGame(); defaults(); startIntervals();
    });

    controlsToggle.addEventListener('click', () => {
        controlsLegend.style.display = 'none';
        controlsOpen.style.display = 'block';
    });
    controlsOpen.addEventListener('click', () => {
        controlsOpen.style.display = 'none';
        controlsLegend.style.display = 'block';
    });

    // Theme toggle
    function applyTheme(theme) {
        if (theme === 'light') document.body.setAttribute('data-theme', 'light');
        else document.body.removeAttribute('data-theme');
        themeToggle.textContent = theme === 'light' ? '◑ DARK' : '◑ LIGHT';
        localStorage.setItem('blockshooter_theme', theme);
    }
    applyTheme(localStorage.getItem('blockshooter_theme') || 'dark');
    themeToggle.addEventListener('click', () => {
        applyTheme(document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });

    // Pause overlay — click/tap to resume
    pauseOverlay.addEventListener('click', () => togglePause());

    // --- End States ---
    function getHighScore() {
        return parseInt(localStorage.getItem('blockshooter_hs') || '0');
    }
    function saveHighScore(score) {
        const prev = getHighScore();
        if (score > prev) { localStorage.setItem('blockshooter_hs', score); return true; }
        return false;
    }

    function gameLose() {
        clearAllIntervals();
        pauseOverlay.style.display = 'none';
        cutscene.style.display = 'none';
        if (cutsceneState.typeTimer) { clearInterval(cutsceneState.typeTimer); cutsceneState.typeTimer = null; }
        const isNew = saveHighScore(state.score);
        const hs    = getHighScore();
        document.querySelector('#lose-score').textContent     = `Score: ${state.score}  |  Level ${state.level}`;
        document.querySelector('#lose-highscore').textContent = isNew
            ? `NEW HIGH SCORE: ${hs}`
            : `High Score: ${hs}`;
        loseMenu.style.display = 'block';
        hideGame();
    }

});
