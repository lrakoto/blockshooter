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
    const introCutscene       = document.querySelector('#intro-cutscene');
    const introLabel          = document.querySelector('#intro-label');
    const introSpeaker        = document.querySelector('#intro-speaker');
    const introText           = document.querySelector('#intro-text');
    const introProgress       = document.querySelector('#intro-progress');
    const introBtn            = document.querySelector('#intro-continue');
    const deployOverlay       = document.querySelector('#deploy-overlay');
    const deployLabel         = document.querySelector('#deploy-label');
    const deploySpeaker       = document.querySelector('#deploy-speaker');
    const deployText          = document.querySelector('#deploy-text');
    const titleCard           = document.querySelector('#title-card');
    const titleCardLabel      = document.querySelector('#title-card-label');
    const titleCardLevel      = document.querySelector('#title-card-level');
    const titleCardSub        = document.querySelector('#title-card-sub');
    const extractionOverlay   = document.querySelector('#extraction-overlay');
    const extractionLabel     = document.querySelector('#extraction-label');
    const extractionSub       = document.querySelector('#extraction-sub');
    const radioChatter        = document.querySelector('#radio-chatter');
    const radioSpeaker        = document.querySelector('#radio-speaker');
    const radioText           = document.querySelector('#radio-text');
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
    const muteToggle       = document.querySelector('#mute-toggle');
    const pauseOverlay     = document.querySelector('#pause-overlay');
    const ctx              = gameCanvas.getContext('2d');
    const miniturretCountEl = document.querySelector('#miniturret-count');

    // --- Audio ---
    let audioCtx = null;
    let soundEnabled = true;
    let masterGain = null;
    let droneNodes = null;

    function ensureAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 1;
            masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function getMasterGain() {
        ensureAudioCtx();
        return masterGain;
    }

    function shouldPlaySound() {
        return soundEnabled && audioCtx;
    }

    // Spatial panning: x,y in world space relative to player
    function createPanner(x, y) {
        ensureAudioCtx();
        const panner = audioCtx.createStereoPanner();
        const dx = x - playerX, dy = y - playerY;
        const dist = Math.hypot(dx, dy) || 1;
        // Normalize to -1..1 based on horizontal position, fall off with distance
        const pan = Math.max(-1, Math.min(1, (dx / dist) * (1 - Math.min(1, dist / 900))));
        panner.pan.value = pan;
        return panner;
    }

    function connectToMaster(node, x, y) {
        ensureAudioCtx();
        if (x !== undefined && y !== undefined) {
            const panner = createPanner(x, y);
            node.connect(panner);
            panner.connect(masterGain || audioCtx.destination);
        } else {
            node.connect(masterGain || audioCtx.destination);
        }
    }

    function createNoiseBuffer(duration, sampleRate) {
        const len = Math.floor(sampleRate * duration);
        const buf = audioCtx.createBuffer(1, len, sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    // Ambient drone that intensifies with level
    function startDrone() {
        if (!soundEnabled) return;
        ensureAudioCtx();
        if (!audioCtx) return;
        if (droneNodes) stopDrone();
        const ac = audioCtx, t = ac.currentTime;
        const baseFreq = 55;
        const osc1 = ac.createOscillator(), osc2 = ac.createOscillator(), osc3 = ac.createOscillator();
        const gain1 = ac.createGain(), gain2 = ac.createGain(), gain3 = ac.createGain();
        osc1.type = 'sine'; osc2.type = 'sine'; osc3.type = 'triangle';
        osc1.frequency.value = baseFreq;
        osc2.frequency.value = baseFreq * 1.5;
        osc3.frequency.value = baseFreq * 2;
        gain1.gain.value = 0; gain2.gain.value = 0; gain3.gain.value = 0;
        osc1.connect(gain1); osc2.connect(gain2); osc3.connect(gain3);
        gain1.connect(masterGain); gain2.connect(masterGain); gain3.connect(masterGain);
        osc1.start(t); osc2.start(t); osc3.start(t);
        droneNodes = { osc1, osc2, osc3, gain1, gain2, gain3 };
        updateDroneIntensity();
    }

    function stopDrone() {
        if (!droneNodes) return;
        const t = audioCtx.currentTime;
        try { droneNodes.osc1.stop(t); } catch(e){}
        try { droneNodes.osc2.stop(t); } catch(e){}
        try { droneNodes.osc3.stop(t); } catch(e){}
        droneNodes = null;
    }

    function updateDroneIntensity() {
        if (!droneNodes || !audioCtx) return;
        const level = state.level || 1;
        const tension = Math.min(1, (level - 1) / 20);
        const t = audioCtx.currentTime;
        const base = 0.018 + tension * 0.045;
        droneNodes.gain1.gain.linearRampToValueAtTime(base, t + 0.5);
        droneNodes.gain2.gain.linearRampToValueAtTime(base * 0.5, t + 0.5);
        droneNodes.gain3.gain.linearRampToValueAtTime(base * 0.25 * tension, t + 0.5);
    }

    function playExplosionSound(x, y) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(x, y);
        // Soft-clip waveshaper
        const clipCurve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const v = (i * 2) / 255 - 1;
            clipCurve[i] = (Math.PI + 300) * v / (Math.PI + 300 * Math.abs(v));
        }
        const gritCurve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const v = (i * 2) / 255 - 1;
            gritCurve[i] = Math.max(-0.55, Math.min(0.55, v * 2.2)) / 0.55;
        }

        const busGain = ac.createGain();
        busGain.gain.value = 0.85;
        busGain.connect(panner); panner.connect(masterGain);

        // Kick
        const kick = ac.createOscillator(), kickGain = ac.createGain();
        kick.connect(kickGain); kickGain.connect(busGain);
        kick.type = 'sine';
        kick.frequency.setValueAtTime(80, t);
        kick.frequency.exponentialRampToValueAtTime(28, t + 0.06);
        kickGain.gain.setValueAtTime(1.2, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.135);
        kick.start(t); kick.stop(t + 0.135);

        // Pressure wave
        const pressure = ac.createOscillator(), pressureShaper = ac.createWaveShaper(), pressureGain = ac.createGain();
        pressureShaper.curve = clipCurve; pressureShaper.oversample = '4x';
        pressure.connect(pressureShaper); pressureShaper.connect(pressureGain); pressureGain.connect(busGain);
        pressure.type = 'sine';
        pressure.frequency.setValueAtTime(1.1, t);
        pressure.frequency.exponentialRampToValueAtTime(0.22, t + 1.2);
        pressureGain.gain.setValueAtTime(0.0, t);
        pressureGain.gain.linearRampToValueAtTime(0.85, t + 0.375);
        pressureGain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
        pressure.start(t); pressure.stop(t + 1.35);

        // Main thump
        const thump = ac.createOscillator(), thumpShaper = ac.createWaveShaper(), thumpGain = ac.createGain();
        thumpShaper.curve = clipCurve; thumpShaper.oversample = '4x';
        thump.connect(thumpShaper); thumpShaper.connect(thumpGain); thumpGain.connect(busGain);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(2.1, t);
        thump.frequency.exponentialRampToValueAtTime(0.35, t + 1.125);
        thumpGain.gain.setValueAtTime(0.0, t);
        thumpGain.gain.linearRampToValueAtTime(0.7, t + 0.375);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        thump.start(t); thump.stop(t + 1.2);

        // Grit layer
        const grit = ac.createBufferSource(), gritBuf = createNoiseBuffer(1.05, ac.sampleRate);
        grit.buffer = gritBuf;
        const gritBP = ac.createBiquadFilter(), gritShaper = ac.createWaveShaper(), gritGain = ac.createGain();
        gritBP.type = 'bandpass'; gritBP.Q.value = 0.4;
        gritBP.frequency.setValueAtTime(8.5, t);
        gritBP.frequency.exponentialRampToValueAtTime(2.1, t + 0.975);
        gritShaper.curve = gritCurve; gritShaper.oversample = '2x';
        grit.connect(gritBP); gritBP.connect(gritShaper); gritShaper.connect(gritGain); gritGain.connect(busGain);
        gritGain.gain.setValueAtTime(0.0, t);
        gritGain.gain.linearRampToValueAtTime(1.4, t + 0.375);
        gritGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
        grit.start(t);
    }

    function playGatlingSound(x, y, isTurret = false) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(x || playerX, y || playerY);
        const bus = ac.createGain();
        bus.gain.value = isTurret ? 0.55 : 0.75;
        bus.connect(panner); panner.connect(masterGain);

        // Pitch/variation based on heat/level feel
        const pitchVar = 1 + (Math.random() - 0.5) * 0.06;
        const thump = ac.createOscillator(), tGain = ac.createGain();
        thump.connect(tGain); tGain.connect(bus);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(90 * pitchVar, t);
        thump.frequency.exponentialRampToValueAtTime(28 * pitchVar, t + 0.042);
        tGain.gain.setValueAtTime(isTurret ? 0.35 : 0.55, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        thump.start(t); thump.stop(t + 0.045);

        const len = Math.floor(ac.sampleRate * 0.028);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 1800;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 3200 * pitchVar; bp.Q.value = 1.2;
        const gain = ac.createGain();
        src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(bus);
        gain.gain.setValueAtTime(isTurret ? 0.22 : 0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        src.start(t);
    }

    function playBulletHitSound(x, y) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(x, y);
        const len = Math.floor(ac.sampleRate * 0.055);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 2.0;
        bp.frequency.setValueAtTime(1400 + (Math.random() - 0.5) * 300, t);
        bp.frequency.exponentialRampToValueAtTime(180, t + 0.045);
        const gain = ac.createGain();
        src.connect(bp); bp.connect(gain); gain.connect(panner); panner.connect(masterGain);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.start(t);

        const osc = ac.createOscillator(), oGain = ac.createGain();
        osc.connect(oGain); oGain.connect(panner);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.05);
        oGain.gain.setValueAtTime(0.28, t);
        oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        osc.start(t); osc.stop(t + 0.055);
    }

    function playShotgunSound(x, y) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(x, y);
        const bus = ac.createGain();
        bus.gain.value = 0.85;
        bus.connect(panner); panner.connect(masterGain);

        const thump = ac.createOscillator(), tGain = ac.createGain();
        thump.connect(tGain); tGain.connect(bus);
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
        src.connect(lp); lp.connect(gain); gain.connect(bus);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        src.start(t);
    }

    function playRailgunSound(x, y) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(x, y);
        const bus = ac.createGain();
        bus.gain.value = 0.7;
        bus.connect(panner); panner.connect(masterGain);
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(bus);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.07);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.start(t); osc.stop(t + 0.09);
        const ring = ac.createOscillator(), rGain = ac.createGain();
        ring.connect(rGain); rGain.connect(bus);
        ring.type = 'sine';
        ring.frequency.setValueAtTime(3400, t);
        ring.frequency.linearRampToValueAtTime(2900, t + 0.35);
        rGain.gain.setValueAtTime(0.18, t);
        rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        ring.start(t); ring.stop(t + 0.35);
    }

    function playBoundaryHitSound() {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const bus = ac.createGain();
        bus.gain.value = 0.9;
        bus.connect(masterGain);
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(bus);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        gain.gain.setValueAtTime(0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
        const len = Math.floor(ac.sampleRate * 0.055);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 1200;
        const nGain = ac.createGain();
        src.connect(hp); hp.connect(nGain); nGain.connect(bus);
        nGain.gain.setValueAtTime(0.35, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.start(t);
    }

    function playWaveReadySound() {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(masterGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(2200, t + 0.07);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
    }

    function playWaveBlastSound() {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const bus = ac.createGain();
        bus.gain.value = 0.85;
        bus.connect(masterGain);
        // Reverse-sweep whoosh
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(bus);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.55);
        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.8, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.start(t); osc.stop(t + 0.55);
        // Noise sweep
        const src = ac.createBufferSource();
        src.buffer = createNoiseBuffer(0.55, ac.sampleRate);
        const bp = ac.createBiquadFilter(), nGain = ac.createGain();
        bp.type = 'bandpass'; bp.Q.value = 0.6;
        bp.frequency.setValueAtTime(900, t);
        bp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
        src.connect(bp); bp.connect(nGain); nGain.connect(bus);
        nGain.gain.setValueAtTime(0.0, t);
        nGain.gain.linearRampToValueAtTime(0.55, t + 0.08);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        src.start(t);
    }

    function playEnemyDeathSound(e) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(e.x, e.y);
        const bus = ac.createGain();
        bus.gain.value = 0.6;
        bus.connect(panner); panner.connect(masterGain);
        const isTank = e.behavior === 'tank';
        const baseFreq = isTank ? 90 : (e.maxHp >= 4 ? 220 : e.maxHp >= 3 ? 320 : 420);
        const dur = isTank ? 0.28 : 0.14;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(bus);
        osc.type = isTank ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.2, t + dur);
        gain.gain.setValueAtTime(isTank ? 0.5 : 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur);
        if (isTank) {
            const src = ac.createBufferSource();
            src.buffer = createNoiseBuffer(0.28, ac.sampleRate);
            const lp = ac.createBiquadFilter(), nGain = ac.createGain();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(600, t);
            lp.frequency.exponentialRampToValueAtTime(120, t + 0.28);
            src.connect(lp); lp.connect(nGain); nGain.connect(bus);
            nGain.gain.setValueAtTime(0.5, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            src.start(t);
        }
    }

    function playEnemyHurtSound(e) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const panner = createPanner(e.x, e.y);
        const len = Math.floor(ac.sampleRate * 0.05);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter(), gain = ac.createGain();
        bp.type = 'bandpass'; bp.Q.value = 1.8;
        const base = e.behavior === 'tank' ? 350 : e.maxHp >= 4 ? 500 : e.maxHp >= 3 ? 700 : 950;
        bp.frequency.setValueAtTime(base + (Math.random() - 0.5) * 150, t);
        bp.frequency.exponentialRampToValueAtTime(base * 0.4, t + 0.05);
        src.connect(bp); bp.connect(gain); gain.connect(panner); panner.connect(masterGain);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.start(t);
    }

    function playUiSound(type) {
        if (!shouldPlaySound()) return;
        ensureAudioCtx();
        const ac = audioCtx, t = ac.currentTime;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(masterGain);
        if (type === 'buy') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        } else if (type === 'levelup') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.12);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        } else if (type === 'advance') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        } else if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            gain.gain.setValueAtTime(0.04, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        }
        osc.start(t); osc.stop(t + 0.4);
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

    const STAR_COUNT = 220;
    const STAR_FIELD = 8000;

    const NEBULA_COUNT = 5;
    const NEBULA_FIELD = 6000;

    const RADIO_COOLDOWN = 4000; // ms between chatter messages
    const TITLE_CARD_DURATION = 1800; // ms
    const EXTRACTION_DURATION = 2200; // ms

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
    let damageNumbers     = [];
    let stars             = [];
    let nebulaClouds      = [];
    let radioQueue        = [];

    let rafId = null;
    let lastTime = 0;
    let moveAcc = 0;
    let logicAcc = 0;
    let spawnAcc = 0;
    let gameRunning = false;
    let paused      = false;
    let damageFlash = 0;
    let chromaticSplit = 0;
    let hitStop     = 0;
    let timeScale   = 1;
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

    const AIM_DEAD = 8; // px of jitter filter before aim updates

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
        // Spawn just outside the visible area — close enough to reach the player
        // in reasonable time but far enough to appear from off-screen
        const spawnR = Math.min(canvasWidth, canvasHeight) * 0.35;
        do {
            const angle = Math.random() * Math.PI * 2;
            const dist  = 120 + Math.random() * spawnR;
            x = playerX + Math.cos(angle) * dist;
            y = playerY + Math.sin(angle) * dist;
        } while (Math.hypot(x - playerX, y - playerY) < 160);
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
            telegraph: 0,
        });

        // Narrative warnings on first encounter
        if (behavior === 'tank') maybeRadio('tankFirst');
        if (behavior === 'zipper') maybeRadio('zipperFirst');
        if (behavior === 'zigzag') maybeRadio('zigzagFirst');
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
                if (e.fireTick >= 90 && e.telegraph <= 0) e.telegraph = 60;
                if (e.fireTick >= 150 && enemyBullets.length < 200) {
                    e.fireTick = 0;
                    e.telegraph = 0;
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
        playWaveBlastSound();
        spawnWaveParticles();
        maybeRadio('waveUsed');
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
                // Telegraph glow before firing
                if (e.telegraph > 0) {
                    e.telegraph--;
                    const pulse = e.telegraph / 60;
                    const tg = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 28 + (1 - pulse) * 14);
                    tg.addColorStop(0, `rgba(255,40,0,${0.55 + 0.25 * Math.sin(e.telegraph * 0.4)})`);
                    tg.addColorStop(1, 'rgba(255,20,0,0)');
                    ctx.fillStyle = tg;
                    ctx.beginPath(); ctx.arc(e.x, e.y, 42, 0, Math.PI * 2); ctx.fill();
                }
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
                // Barrel tip glow during telegraph
                if (e.telegraph > 0) {
                    const tipX = e.x + Math.cos(bAng) * 14;
                    const tipY = e.y + Math.sin(bAng) * 14;
                    ctx.fillStyle = `rgba(255,60,0,${0.6 + 0.3 * Math.sin(e.telegraph * 0.5)})`;
                    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 16;
                    ctx.beginPath(); ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                }

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
                playShotgunSound(t.x, t.y);
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

        // Charge glow — subtle cyan radial that intensifies as wave recharges
        if (waveProgress > 0.1) {
            const glowR = 30 + waveProgress * 12;
            const glowA = waveReady ? 0.12 + 0.06 * Math.sin(Date.now() / 220) : waveProgress * 0.08;
            const wgrad = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, glowR);
            wgrad.addColorStop(0, `rgba(0,200,255,${glowA})`);
            wgrad.addColorStop(1, 'rgba(0,200,255,0)');
            ctx.fillStyle = wgrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

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
                playGatlingSound(t.x, t.y, true);
            }
        });
    }

    // --- Particles ---
function spawnExplosion(x, y) {
        playExplosionSound(x, y);
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
            p.x += p.vx; p.y += p.vy;
            p.vy += p.gravity || 0.15;
            if (p.grow) p.size *= p.grow; else p.size *= 0.90;
            p.alpha -= p.decay || 0.05;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.globalAlpha = 1;
    }

    // --- Starfield ---
    function renderStars() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        const baseColor = isLight ? '#1e2030' : '#ffffff';
        ctx.save();

        // Nebula / dust clouds behind stars
        nebulaClouds.forEach(n => {
            const half = NEBULA_FIELD / 2;
            while (n.x < playerX - half) n.x += NEBULA_FIELD;
            while (n.x > playerX + half) n.x -= NEBULA_FIELD;
            while (n.y < playerY - half) n.y += NEBULA_FIELD;
            while (n.y > playerY + half) n.y -= NEBULA_FIELD;
            n.driftAngle += n.drift * 0.01;
            n.x += Math.cos(n.driftAngle) * n.drift;
            n.y += Math.sin(n.driftAngle) * n.drift;

            const sx = centerX + (n.x - playerX) * n.z;
            const sy = centerY + (n.y - playerY) * n.z;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, n.radius);
            grad.addColorStop(0, n.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, n.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        stars.forEach(s => {
            // Keep stars within a moving field around the player
            const half = STAR_FIELD / 2;
            while (s.x < playerX - half) s.x += STAR_FIELD;
            while (s.x > playerX + half) s.x -= STAR_FIELD;
            while (s.y < playerY - half) s.y += STAR_FIELD;
            while (s.y > playerY + half) s.y -= STAR_FIELD;

            // Parallax camera offset scaled by star depth
            const sx = centerX + (s.x - playerX) * s.z;
            const sy = centerY + (s.y - playerY) * s.z;

            s.twinkle += s.twinkleSpeed;
            const tw = 0.85 + 0.15 * Math.sin(s.twinkle);
            ctx.globalAlpha = s.alpha * tw * (isLight ? 0.28 : 0.9);
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size * s.z, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function renderGrid() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        const gridSize = 180;
        const baseAlpha = isLight ? 0.09 : 0.14;
        const col = isLight ? `rgba(30,32,48,${baseAlpha})` : `rgba(80,110,140,${baseAlpha})`;
        const majorCol = isLight ? `rgba(30,32,48,${baseAlpha * 2.2})` : `rgba(100,140,175,${baseAlpha * 2.2})`;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        const vLeft   = playerX - centerX;
        const vRight  = playerX + centerX;
        const vTop    = playerY - centerY;
        const vBottom = playerY + centerY;

        const startX = Math.floor(vLeft / gridSize) * gridSize;
        const endX   = Math.ceil(vRight / gridSize) * gridSize;
        const startY = Math.floor(vTop / gridSize) * gridSize;
        const endY   = Math.ceil(vBottom / gridSize) * gridSize;

        for (let x = startX; x <= endX; x += gridSize) {
            const isMajor = (Math.round(x / gridSize) % 5 === 0);
            ctx.strokeStyle = isMajor ? majorCol : col;
            ctx.beginPath();
            ctx.moveTo(x, vTop);
            ctx.lineTo(x, vBottom);
            ctx.stroke();
        }
        for (let y = startY; y <= endY; y += gridSize) {
            const isMajor = (Math.round(y / gridSize) % 5 === 0);
            ctx.strokeStyle = isMajor ? majorCol : col;
            ctx.beginPath();
            ctx.moveTo(vLeft, y);
            ctx.lineTo(vRight, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- Damage Numbers ---
    function spawnDamageNumber(x, y, amount, isKill) {
        const color = isKill ? '#ffcc00' : '#ffffff';
        damageNumbers.push({
            x, y,
            text: isKill ? `-${amount}` : `-${amount}`,
            life: 40,
            maxLife: 40,
            vy: -0.8 - Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 1.2,
            color,
            isKill,
        });
    }

    // --- Radio Chatter ---
    const RADIO_LINES = {
        command: [
            { id: 'firstKill', text: 'First contact confirmed. Keep it tight, Cadet.' },
            { id: 'firstTurret', text: 'Turret online. Let the machines share the load.' },
            { id: 'halfway', text: 'Wave halfway cleared. Do not get comfortable.' },
            { id: 'lowHealth', text: 'Your shielding is critical. Move, Cadet!' },
            { id: 'firstDeath', text: 'Turret lost! Fall back and regroup.' },
            { id: 'waveUsed', text: 'Wave discharged. Good crowd control.' },
            { id: 'overheat', text: 'Your gun is jammed! Vent heat now!' },
            { id: 'streak3', text: 'Kill streak confirmed. Precision pays off.' },
            { id: 'streak5', text: 'They are falling back. Press the advantage!' },
            { id: 'streak8', text: 'Command is watching. That is textbook.' },
            { id: 'tankFirst', text: 'Heavy armor inbound. Focus fire on the cube.' },
            { id: 'zipperFirst', text: 'Fast movers detected. Track the spheres.' },
            { id: 'zigzagFirst', text: 'Evasive pyramids spotted. Lead your shots.' },
            { id: 'levelUp', text: 'Wave suppressed. Stand by for extraction.' },
        ],
        blockmaster: [
            { id: 'bm1', text: '...the static is not empty. Listen closely, cadet.' },
            { id: 'bm2', text: 'Your Command lies. They know what these shapes are.' },
            { id: 'bm3', text: 'Every block you break is a word. You are learning our language.' },
            { id: 'bm4', text: 'I am closer now. Can you feel the signal in your bones?' },
            { id: 'bm5', text: 'They do not want to kill you. They want to know you.' },
            { id: 'bm6', text: 'Fight on. I will be waiting at the edge of the noise.' },
        ]
    };

    let radioState = { shown: new Set(), lastTime: 0, typeTimer: null, current: null, queue: [] };

    function queueRadio(speaker, text, priority = false) {
        if (!radioChatter) return;
        const item = { speaker, text, time: Date.now(), priority };
        if (priority) radioQueue.unshift(item);
        else radioQueue.push(item);
    }

    function showRadio(speaker, text) {
        if (!radioChatter) return;
        radioChatter.style.display = 'block';
        radioChatter.classList.remove('fadeout');
        radioSpeaker.textContent = speaker;
        radioText.textContent = '';
        radioText.classList.remove('done');
        radioState.current = { speaker, text };
        if (radioState.typeTimer) { clearInterval(radioState.typeTimer); radioState.typeTimer = null; }
        let i = 0;
        radioState.typeTimer = setInterval(() => {
            if (i >= text.length) {
                clearInterval(radioState.typeTimer);
                radioState.typeTimer = null;
                radioText.classList.add('done');
                return;
            }
            radioText.textContent += text[i];
            i++;
        }, 20);
        radioState.lastTime = Date.now();
    }

    function updateRadio() {
        if (!radioChatter) return;
        // Process queue
        const now = Date.now();
        if (radioQueue.length > 0 && !radioState.current) {
            const item = radioQueue.shift();
            showRadio(item.speaker, item.text);
            return;
        }
        if (radioQueue.length > 0 && radioQueue[0].priority && now - radioState.lastTime > 600) {
            const item = radioQueue.shift();
            showRadio(item.speaker, item.text);
            return;
        }
        // Auto-dismiss after cooldown
        if (radioState.current && now - radioState.lastTime > RADIO_COOLDOWN) {
            radioChatter.classList.add('fadeout');
            setTimeout(() => {
                if (radioChatter.classList.contains('fadeout')) {
                    radioChatter.style.display = 'none';
                    radioChatter.classList.remove('fadeout');
                    radioState.current = null;
                }
            }, 520);
        }
    }

    function maybeRadio(trigger, speaker = 'COMMAND') {
        if (radioState.shown.has(trigger)) return;
        radioState.shown.add(trigger);
        const pool = speaker === 'BLOCKMASTER' ? RADIO_LINES.blockmaster : RADIO_LINES.command;
        const line = pool.find(l => l.id === trigger);
        if (line) queueRadio(speaker, line.text);
    }

    function triggerLevelForeshadow() {
        const bm = RADIO_LINES.blockmaster[(state.level - 1) % RADIO_LINES.blockmaster.length];
        if (bm) queueRadio('???', bm.text, true);
    }

    function renderDamageNumbers() {
        damageNumbers = damageNumbers.filter(dn => dn.life > 0);
        ctx.save();
        ctx.font = '700 11px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        damageNumbers.forEach(dn => {
            dn.life--;
            dn.x += dn.vx;
            dn.y += dn.vy;
            const a = dn.life / dn.maxLife;
            ctx.globalAlpha = a;
            ctx.fillStyle = dn.color;
            ctx.shadowColor = dn.isKill ? '#ff8800' : '#ffffff';
            ctx.shadowBlur = dn.isKill ? 8 : 3;
            ctx.fillText(dn.text, dn.x, dn.y);
        });
        ctx.restore();
    }

    function spawnImpactSparks(x, y, baseColor) {
        const colors = [baseColor, '#ffffff', '#ffdd44'];
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 3.5;
            particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 1.8,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                decay: 0.04 + Math.random() * 0.03,
                gravity: 0.12
            });
        }
    }

    function spawnWaveParticles() {
        const colors = ['#00eeff', '#44aaff', '#88ddff', '#ffffff'];
        for (let i = 0; i < 32; i++) {
            const angle = (Math.PI * 2 / 32) * i + (Math.random() - 0.5) * 0.25;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x: playerX, y: playerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1.5 + Math.random() * 2,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                decay: 0.025 + Math.random() * 0.02,
                gravity: 0
            });
        }
    }

    function spawnJamSteam() {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 18;
            particles.push({
                x: playerX + Math.cos(angle) * dist,
                y: playerY + Math.sin(angle) * dist,
                vx: Math.cos(angle) * (0.5 + Math.random()),
                vy: Math.sin(angle) * (0.5 + Math.random()) - 0.5,
                size: 2 + Math.random() * 3,
                alpha: 0.7,
                color: 'rgba(200,210,220,0.65)',
                decay: 0.015 + Math.random() * 0.01,
                gravity: -0.03,
                grow: 1.03
            });
        }
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
            // Hit-stop / slow-mo scales with streak and enemy threat
            const threat = e.behavior === 'tank' ? 2 : e.maxHp >= 4 ? 1.2 : 1;
            hitStop = Math.min(8, Math.floor(2 + state.streak * 0.35 * threat));
            if (state.streak >= 3) {
                timeScale = 0.55;
            } else {
                timeScale = Math.max(0.75, 1 - state.streak * 0.05);
            }
            const multiplier = 1 + Math.floor(state.streak / 3) * 0.5;
            addScore(Math.round(e.maxHp * 100 * multiplier));
            state.credits += 8 + (e.maxHp - 3) * 5; // 8 / 13 / 23+ per kill
            playEnemyDeathSound(e);
            spawnExplosion(e.x, e.y);
            spawnDamageNumber(e.x, e.y, Math.round(damage), true);
            if (state.kills === 1) maybeRadio('firstKill');
            if (state.streak === 3) maybeRadio('streak3');
            if (state.streak === 5) maybeRadio('streak5');
            if (state.streak === 8) maybeRadio('streak8');
            return false;
        }
        playBulletHitSound(e.x, e.y);
        playEnemyHurtSound(e);
        e.hitTimer = 6; // flash white for 6 frames
        spawnDamageNumber(e.x, e.y, Math.round(damage), false);
        spawnImpactSparks(e.x, e.y, getEnemyColor(e.hp));
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
        if (state.heat >= 100) {
            state.jammed = true;
            state.jamFrames = state.jamDuration;
            state.jamWindowAngle = Math.PI;
            maybeRadio('overheat');
        }

        const tx = cursorPosX, ty = cursorPosY;

        // Apply spread — random angular offset within ±spread/2
        let baseAngle = Math.atan2(ty - centerY, tx - centerX);

        // Mobile auto-aim: if firing via touch, nudge aim toward nearest enemy
        // within a narrow cone (15px at screen distance)
        if (rightTouch) {
            let bestDot = Math.cos(0.15); // ~8.6° cone
            let bestEnemy = null;
            for (const e of enemies) {
                const ex = e.x - playerX, ey = e.y - playerY;
                const ed = Math.hypot(ex, ey);
                if (ed < 1 || ed > 500) continue;
                const eAngle = Math.atan2(ey, ex);
                const dot = Math.cos(eAngle - baseAngle);
                if (dot > bestDot) { bestDot = dot; bestEnemy = e; }
            }
            if (bestEnemy) {
                const ex = bestEnemy.x - playerX, ey = bestEnemy.y - playerY;
                baseAngle = Math.atan2(ey, ex);
            }
        }

        const spreadOffset = (Math.random() - 0.5) * state.spread;
        const fireAngle = baseAngle + spreadOffset;
        const fireDx = Math.cos(fireAngle), fireDy = Math.sin(fireAngle);
        const edge = rayToEdge(playerX, playerY, playerX + fireDx, playerY + fireDy);

        playGatlingSound(playerX, playerY, false);
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
        damageFlash = 12;
        chromaticSplit = 6;
        shakeCanvas(5);
        if (state.health <= 30) maybeRadio('lowHealth');
        // Splash: all deployed turrets take 3 damage
        let turretDied = false;
        [...miniTurrets, ...flameTurrets].forEach(t => {
            if (t.hp > 0 && t.hp - 3 <= 0) turretDied = true;
            t.hp = Math.max(0, t.hp - 3);
        });
        if (turretDied) maybeRadio('firstDeath');
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
        playUiSound('advance');
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
        playUiSound('advance');
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
            const bonus = 50 + state.level * 10;
            state.credits += bonus;
            showLevelUpScreen();
        }
    }

    cutsceneBtn.addEventListener('click', advanceCutscene);

    // --- Intro Prologue ---
    const INTRO_PANELS = [
        { label: 'INCOMING TRANSMISSION', speaker: 'COMMAND', text: 'Cadet, this is Command. The block incursion is spreading faster than we can track.' },
        { label: 'INCOMING TRANSMISSION', speaker: 'COMMAND', text: 'Forward bases are silent. Reinforcements are not coming. You are the last turret operator in this sector.' },
        { label: 'PRIORITY ALERT',       speaker: 'COMMAND', text: 'Your orders are simple: hold the line. Survive. Make them pay for every meter.' },
        { label: 'DEPLOYMENT READY',     speaker: 'COMMAND', text: 'The drop ship is in position. When you are ready, deploy and show those shapes what a cadet can do.' },
    ];

    let introState = { panelIdx: 0, typing: false, typeTimer: null };

    function startIntro() {
        introState.panelIdx = 0;
        introCutscene.style.display = 'flex';
        introCutscene.classList.remove('fadeout');
        startMenu.style.display = 'block';
        showIntroPanel();
    }

    function showIntroPanel() {
        const panel = INTRO_PANELS[introState.panelIdx];
        introLabel.textContent = panel.label;
        introSpeaker.textContent = panel.speaker;
        introText.textContent = '';
        introText.classList.remove('done');
        introProgress.textContent = `${introState.panelIdx + 1} / ${INTRO_PANELS.length}`;
        introBtn.textContent = 'SKIP';
        playUiSound('advance');

        if (introState.typeTimer) clearInterval(introState.typeTimer);
        introState.typing = true;
        let charIdx = 0;
        introState.typeTimer = setInterval(() => {
            if (charIdx >= panel.text.length) {
                clearInterval(introState.typeTimer);
                introState.typeTimer = null;
                introState.typing = false;
                introText.classList.add('done');
                const isLast = introState.panelIdx >= INTRO_PANELS.length - 1;
                introBtn.textContent = isLast ? 'DEPLOY \u25B6' : 'NEXT \u25B6';
                return;
            }
            introText.textContent += panel.text[charIdx];
            charIdx++;
        }, 28);
    }

    function advanceIntro() {
        if (introState.typing) {
            clearInterval(introState.typeTimer);
            introState.typeTimer = null;
            introState.typing = false;
            introText.textContent = INTRO_PANELS[introState.panelIdx].text;
            introText.classList.add('done');
            const isLast = introState.panelIdx >= INTRO_PANELS.length - 1;
            introBtn.textContent = isLast ? 'DEPLOY \u25B6' : 'NEXT \u25B6';
            return;
        }

        introState.panelIdx++;
        if (introState.panelIdx < INTRO_PANELS.length) {
            showIntroPanel();
        } else {
            finishIntro();
        }
    }

    function finishIntro() {
        if (introState.typeTimer) { clearInterval(introState.typeTimer); introState.typeTimer = null; }
        introCutscene.classList.add('fadeout');
        setTimeout(() => {
            introCutscene.style.display = 'none';
            introCutscene.classList.remove('fadeout');
        }, 650);
    }

    introBtn.addEventListener('click', advanceIntro);

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
        updateDroneIntensity();
        maybeRadio('levelUp');
        if (state.level > 1 && state.level % 3 === 0) triggerLevelForeshadow();
        startExtraction(() => {
            if (isStoryLevel(state.level)) {
                const beat = getStoryBeat(state.level);
                startCutscene(beat);
            } else {
                showLevelUpScreen();
            }
        });
    }

    function showLevelUpScreen() {
        playUiSound('levelup');
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
            playUiSound('buy');
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
            playUiSound('buy');
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
                maybeRadio('firstTurret');
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

        // Damage vignette — red radial gradient fading from edges
        if (damageFlash > 0) {
            const a = (damageFlash / 12) * 0.45;
            const grad = ctx.createRadialGradient(centerX, centerY, Math.min(canvasWidth, canvasHeight) * 0.25, centerX, centerY, Math.max(canvasWidth, canvasHeight) * 0.7);
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${a})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            damageFlash--;
        }

        // Chromatic aberration on heavy impacts
        if (chromaticSplit > 0) {
            applyChromaticSplit();
            chromaticSplit *= 0.88;
            if (chromaticSplit < 0.3) chromaticSplit = 0;
        }

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

        // Parallax starfield behind everything
        renderStars();

        ctx.save();
        ctx.translate(camX, camY);
        renderGrid();
        renderEnemies();
        renderDamageNumbers();
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
            if (Math.random() < 0.25) spawnJamSteam();
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

        // Narrative radio chatter ticker
        updateRadio();

        // Mid-wave progress chatter
        if (state.levelKills > 0) {
            const def = getLevelDef();
            if (state.levelKills >= def.killsToNext * 0.5 && state.levelKills < def.killsToNext * 0.6) {
                maybeRadio('halfway');
            }
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
            startDeathSequence();
            return;
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

    // --- Deploy drop-in sequence ---
    function deployLoop() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const camX = centerX - playerX, camY = centerY - playerY;
        renderStars();
        ctx.save();
        ctx.translate(camX, camY);
        renderGrid();
        ctx.restore();

        renderTurretArea();

        const dur = 85;
        state.deployFrames++;
        const p = Math.min(1, state.deployFrames / dur);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - p, 3);
        const scale = 0.2 + ease * 0.8;
        const alpha = Math.min(1, p * 1.4);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        ctx.globalAlpha = alpha;
        playerTurret.render();
        ctx.restore();
        ctx.globalAlpha = 1;

        // Comms text progression
        if (state.deployFrames === 1) {
            deployLabel.textContent = 'DROP SHIP INBOUND';
            deploySpeaker.textContent = 'COMMAND';
            deployText.textContent = '';
            typeDeployText('Stand by for combat drop. Turret systems initializing.');
        } else if (state.deployFrames === Math.floor(dur * 0.55)) {
            deployLabel.textContent = 'WEAPONS HOT';
            typeDeployText('Hostile signatures detected. You are cleared to engage all targets.');
        }

        // Muzzle flash as turret comes online near the end
        if (state.deployFrames === dur - 20) {
            muzzleFlashAngle = Math.random() * Math.PI * 2;
            muzzleFlashFrames = 4;
            playGatlingSound(playerX, playerY, false);
        }
        if (muzzleFlashFrames > 0) renderGatlingMuzzleFlash();

        if (state.deployFrames >= dur) {
            finishDeploy();
        }
    }

    let deployTypeTimer = null;
    function typeDeployText(text) {
        if (deployTypeTimer) { clearInterval(deployTypeTimer); deployTypeTimer = null; }
        deployText.textContent = '';
        deployText.classList.remove('done');
        let i = 0;
        deployTypeTimer = setInterval(() => {
            if (i >= text.length) {
                clearInterval(deployTypeTimer);
                deployTypeTimer = null;
                deployText.classList.add('done');
                return;
            }
            deployText.textContent += text[i];
            i++;
        }, 22);
    }

    function finishDeploy() {
        if (deployTypeTimer) { clearInterval(deployTypeTimer); deployTypeTimer = null; }
        deployOverlay.classList.add('fadeout');
        setTimeout(() => {
            deployOverlay.style.display = 'none';
            deployOverlay.classList.remove('fadeout');
        }, 520);
        state.deploying = false;
        state.deployFrames = 0;
        showGame();
        startIntervals();
    }

    function deployFrame(timestamp) {
        if (paused) return;
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min(timestamp - lastTime, 100);
        lastTime = timestamp;
        logicAcc += dt;
        let logicBudget = 5;
        while (logicAcc >= 30 && logicBudget-- > 0) {
            deployLoop();
            logicAcc -= 30;
        }
        if (logicBudget < 0) logicAcc = 0;
        if (state.deploying) rafId = requestAnimationFrame(deployFrame);
    }

    // --- Cinematic overlays ---
    function showTitleCard(onDone) {
        if (!titleCard) { if (onDone) onDone(); return; }
        titleCard.style.display = 'flex';
        titleCard.classList.remove('fadeout');
        titleCardLabel.textContent = state.level === 1 ? 'WAVE INCOMING' : 'HOLD THE LINE';
        titleCardLevel.textContent = `LEVEL ${state.level}`;
        titleCardSub.textContent = state.level === 1 ? 'HOSTILES DETECTED' : (LEVEL_DESCS[state.level - 1] || 'REINFORCEMENTS INCOMING');
        playUiSound('levelup');
        setTimeout(() => {
            titleCard.classList.add('fadeout');
            setTimeout(() => {
                titleCard.style.display = 'none';
                titleCard.classList.remove('fadeout');
                if (onDone) onDone();
            }, 420);
        }, TITLE_CARD_DURATION);
    }

    let extractionCallback = null;
    let extractionTimer = null;
    function startExtraction(onDone) {
        if (!extractionOverlay) { if (onDone) onDone(); return; }
        extractionCallback = onDone;
        extractionOverlay.style.display = 'flex';
        extractionOverlay.classList.remove('fadeout');
        extractionLabel.textContent = 'HOLDING PATTERN';
        extractionSub.textContent = 'Extraction in progress...';
        playUiSound('advance');
        if (extractionTimer) clearTimeout(extractionTimer);
        extractionTimer = setTimeout(() => {
            extractionLabel.textContent = 'EXTRACTION COMPLETE';
            extractionSub.textContent = 'Preparing upgrade bay...';
            extractionOverlay.classList.add('fadeout');
            setTimeout(() => {
                extractionOverlay.style.display = 'none';
                extractionOverlay.classList.remove('fadeout');
                if (extractionCallback) extractionCallback();
            }, 420);
        }, EXTRACTION_DURATION);
    }

    // --- Cinematic death sequence ---
    let deathAnim = { active: false, frames: 0 };
    function startDeathSequence() {
        if (deathAnim.active) return;
        clearAllIntervals();
        stopDrone();
        deathAnim.active = true;
        deathAnim.frames = 0;
        rafId = requestAnimationFrame(deathFrame);
    }

    function deathLoop() {
        deathAnim.frames++;
        const p = Math.min(1, deathAnim.frames / 90);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Slow-mo background
        const camX = centerX - playerX, camY = centerY - playerY;
        renderStars();
        ctx.save();
        ctx.translate(camX, camY);
        renderGrid();
        renderEnemies();
        renderDamageNumbers();
        renderGatlingBullets();
        renderMiniTurrets();
        renderFlameTurrets();
        renderShellCasings();
        renderEnemyBullets();
        renderWaveRings();
        renderParticles();
        ctx.restore();

        renderTurretArea();
        playerTurret.render();
        drawPlayerBarrel();

        // CRT glitch scanlines
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.15})`;
        for (let y = 0; y < canvasHeight; y += 4) {
            if (Math.random() < 0.3) ctx.fillRect(0, y, canvasWidth, 2);
        }
        ctx.restore();

        // Red vignette fade
        const vig = ctx.createRadialGradient(centerX, centerY, Math.min(canvasWidth, canvasHeight) * 0.2,
                                             centerX, centerY, Math.max(canvasWidth, canvasHeight) * 0.85);
        vig.addColorStop(0, 'rgba(255,0,0,0)');
        vig.addColorStop(1, `rgba(120,0,0,${p * 0.85})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Chromatic split intensifies
        if (p > 0.4) {
            chromaticSplit = 8 + (p - 0.4) * 20;
            applyChromaticSplit();
        }

        if (deathAnim.frames >= 90) {
            deathAnim.active = false;
            deathAnim.frames = 0;
            gameLose();
        }
    }

    function deathFrame(timestamp) {
        if (!deathAnim.active) return;
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min(timestamp - lastTime, 100);
        lastTime = timestamp;
        logicAcc += dt;
        let logicBudget = 5;
        while (logicAcc >= 30 && logicBudget-- > 0) {
            deathLoop();
            logicAcc -= 30;
        }
        if (logicBudget < 0) logicAcc = 0;
        if (deathAnim.active) rafId = requestAnimationFrame(deathFrame);
    }

    function applyChromaticSplit() {
        if (chromaticSplit <= 0) return;
        const s = chromaticSplit;
        // Cheap chromatic aberration: draw red and cyan channels offset horizontally
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5;
        ctx.filter = 'none';
        // We can't easily re-render everything, so we draw a blurred red/cyan overlay
        // using the existing canvas content. Simpler: just tint the whole screen red/cyan edges.
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
        grad.addColorStop(0, `rgba(255,0,0,${Math.min(0.35, s * 0.03)})`);
        grad.addColorStop(0.5, 'rgba(255,0,0,0)');
        grad.addColorStop(1, `rgba(0,255,255,${Math.min(0.35, s * 0.03)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }

    // --- Reset ---
    function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            const z = 0.25 + Math.random() * 0.75;
            stars.push({
                x: (Math.random() - 0.5) * STAR_FIELD,
                y: (Math.random() - 0.5) * STAR_FIELD,
                z,
                size: 0.6 + Math.random() * 1.4,
                alpha: 0.35 + Math.random() * 0.65,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.03 + Math.random() * 0.08
            });
        }
    }

    function initNebula() {
        nebulaClouds = [];
        const palette = document.body.getAttribute('data-theme') === 'light'
            ? ['rgba(60,80,120,0.08)', 'rgba(80,120,160,0.06)', 'rgba(100,90,140,0.05)', 'rgba(50,70,100,0.07)']
            : ['rgba(40,60,120,0.14)', 'rgba(60,40,100,0.11)', 'rgba(20,80,120,0.12)', 'rgba(80,30,90,0.09)'];
        for (let i = 0; i < NEBULA_COUNT; i++) {
            nebulaClouds.push({
                x: (Math.random() - 0.5) * NEBULA_FIELD,
                y: (Math.random() - 0.5) * NEBULA_FIELD,
                z: 0.08 + Math.random() * 0.12,
                radius: 350 + Math.random() * 500,
                color: palette[i % palette.length],
                drift: 0.02 + Math.random() * 0.04,
                driftAngle: Math.random() * Math.PI * 2
            });
        }
    }

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
        damageNumbers = [];
        initStars();
        initNebula();
        radioState.shown.clear();
        radioState.current = null;
        radioQueue.length = 0;
        if (radioChatter) radioChatter.style.display = 'none';
        if (miniturretCountEl) miniturretCountEl.textContent = '0';
        scoreBoard.textContent = '0';
        livesText.textContent = '3';
        weaponDisplay.textContent = 'GATLING';
        levelDisplay.textContent = '1';
        healthBar.style.width = '100%';
        streakDisplay.classList.remove('visible');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        paused = false;
        damageFlash = 0;
        hitStop = 0;
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

        const scaledDt = dt * timeScale;
        // Decay timeScale back to normal gradually (slow-mo recovery)
        if (timeScale < 1) timeScale = Math.min(1, timeScale + 0.04);

        moveAcc  += scaledDt;
        logicAcc += scaledDt;
        spawnAcc += scaledDt;

        // Hit-stop: freeze movement and spawns briefly on kill, keep rendering
        const frozen = hitStop > 0;
        if (frozen) hitStop--;

        // Enemy movement — 20ms fixed
        let moveBudget = 5; // safety cap to avoid spiral-of-death
        while (moveAcc >= 20 && moveBudget-- > 0) {
            if (!frozen) moveEnemies();
            moveAcc -= 20;
        }
        if (moveBudget < 0) moveAcc = 0; // gave up — drop backlog

        // Spawn — level-scaled interval
        const spawnInterval = getSpawnInterval();
        if (spawnAcc >= spawnInterval && !frozen) {
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
        timeScale = 1;
        startDrone();
        showTitleCard(() => {
            rafId = requestAnimationFrame(gameFrame);
        });
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
        deployOverlay.style.display = 'flex';
        defaults();
        state.deploying = true;
        state.deployFrames = 0;
        gameRunning = true;
        paused = false;
        moveAcc = 0; logicAcc = 0; spawnAcc = 0; lastTime = 0;
        rafId = requestAnimationFrame(deployFrame);
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

    // Mute toggle
    function applyMute(muted) {
        soundEnabled = !muted;
        if (masterGain) masterGain.gain.value = soundEnabled ? 1 : 0;
        if (muted) {
            muteToggle.textContent = '🔇 MUTED';
            muteToggle.classList.add('muted');
            stopDrone();
        } else {
            muteToggle.textContent = '🔊 SOUND';
            muteToggle.classList.remove('muted');
            if (gameRunning && !paused) startDrone();
        }
        localStorage.setItem('blockshooter_muted', muted ? '1' : '0');
    }
    applyMute(localStorage.getItem('blockshooter_muted') === '1');
    muteToggle.addEventListener('click', () => {
        applyMute(soundEnabled);
    });

    // Subtle hover click on all buttons
    let lastHoverSound = 0;
    document.addEventListener('mouseover', e => {
        if (e.target.tagName === 'BUTTON') {
            const now = Date.now();
            if (now - lastHoverSound > 80) { playUiSound('hover'); lastHoverSound = now; }
        }
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
        stopDrone();
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

    // Start the experience with the intro prologue
    startIntro();

});
