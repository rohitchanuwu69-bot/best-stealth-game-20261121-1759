/* Synthesised sound: every cue is built with the WebAudio API, no audio files. */
(function () {
  "use strict";

  var ctx = null;
  var master = null;
  var muted = false;
  var humNodes = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      startHum();
      return true;
    } catch (e) {
      return false;
    }
  }

  function startHum() {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 52;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = 104;
    gain2.gain.value = 0.012;
    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start();
    humNodes = { osc: osc, osc2: osc2 };
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq || 900;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  var AudioSys = {
    unlock: function () { ensure(); },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: function () { return muted; },
    // Soft carpet step; louder when the player walks fast, quiet while sneaking.
    footstep: function (sneaking, running) {
      noiseBurst(0.07, sneaking ? 0.03 : (running ? 0.10 : 0.06), sneaking ? 500 : 900);
    },
    // A guard's heavier boot, panned by how close he is.
    guardStep: function (closeness) {
      noiseBurst(0.09, 0.02 + 0.10 * closeness, 420);
    },
    pickup: function () {
      tone(660, 0.12, "sine", 0.18);
      setTimeout(function () { tone(990, 0.16, "sine", 0.18); }, 70);
    },
    pebble: function () {
      noiseBurst(0.05, 0.10, 2400);
      setTimeout(function () { tone(1400, 0.08, "square", 0.05, 900); }, 120);
    },
    // Rising two-note sting when a guard spots the courier.
    alert: function () {
      tone(220, 0.22, "sawtooth", 0.12, 330);
      setTimeout(function () { tone(330, 0.3, "sawtooth", 0.12, 440); }, 160);
    },
    suspicious: function () {
      tone(392, 0.18, "triangle", 0.12, 330);
    },
    caught: function () {
      tone(180, 0.5, "sawtooth", 0.16, 60);
      setTimeout(function () { tone(90, 0.6, "sawtooth", 0.14, 45); }, 180);
    },
    levelClear: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.22, "sine", 0.16); }, i * 110);
      });
    },
    gameWon: function () {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.3, "sine", 0.16); }, i * 140);
      });
    }
  };

  window.NC = window.NC || {};
  window.NC.AudioSys = AudioSys;
})();
