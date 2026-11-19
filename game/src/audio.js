// Neon Palms — all sound is synthesized with WebAudio: an engine hum that
// follows the driven car's speed, a two-tone police siren, and short
// envelope blips for punches, shots, pickups, crashes and UI. No audio files.
window.NP = window.NP || {};

NP.audio = (function () {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (err) {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq, delay) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(1, (dur * ctx.sampleRate) | 0);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
  }

  function engine(speedRatio, dt) {
    if (!ensure()) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter).connect(engineGain).connect(master);
      engineOsc.start();
    }
    const target = speedRatio > 0.01 ? 0.05 + speedRatio * 0.05 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    engineOsc.frequency.setTargetAtTime(55 + speedRatio * 165, ctx.currentTime, 0.06);
  }

  function engineStop() {
    if (engineGain && ctx) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  function siren(active) {
    if (!ensure()) return;
    if (active && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenLfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 830;
      sirenLfo.frequency.value = 0.7;
      lfoGain.gain.value = 190;
      sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
      sirenGain.gain.value = 0.028;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
      sirenLfo.start();
    } else if (!active && sirenOsc) {
      try { sirenOsc.stop(); sirenLfo.stop(); } catch (err) { /* already stopped */ }
      sirenOsc = null;
      sirenLfo = null;
      sirenGain = null;
    }
  }

  return {
    unlock: ensure,
    toggleMute() {
      muted = !muted;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
      return muted;
    },
    isMuted: () => muted,
    engine,
    engineStop,
    siren,
    click() { tone(660, 0.06, 'square', 0.08); },
    punch() { noise(0.09, 0.25, 500); tone(120, 0.08, 'sine', 0.2, 60); },
    shot() { noise(0.14, 0.4, 2600); tone(190, 0.1, 'square', 0.12, 50); },
    dryFire() { tone(1200, 0.03, 'square', 0.05); },
    crash(big) { noise(big ? 0.3 : 0.16, big ? 0.4 : 0.22, 700); tone(90, 0.2, 'sine', 0.2, 40); },
    pickup() { tone(880, 0.09, 'sine', 0.14); tone(1318, 0.14, 'sine', 0.14, null, 0.08); },
    cash() { tone(1046, 0.07, 'square', 0.07); tone(1568, 0.1, 'square', 0.07, null, 0.06); },
    jingle() {
      const notes = [523, 659, 784, 1046];
      for (let i = 0; i < notes.length; i++) tone(notes[i], 0.22, 'triangle', 0.16, null, i * 0.11);
    },
    busted() {
      tone(392, 0.25, 'triangle', 0.16);
      tone(330, 0.25, 'triangle', 0.16, null, 0.22);
      tone(262, 0.45, 'triangle', 0.16, null, 0.44);
    },
    hurt() { tone(220, 0.12, 'sawtooth', 0.1, 110); },
  };
})();
