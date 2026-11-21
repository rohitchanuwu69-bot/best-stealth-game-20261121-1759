/* Keyboard and mouse state, plus canvas-relative pointer position. */
(function () {
  "use strict";

  var keys = {};
  var mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  var pressed = {};

  var MOVE_KEYS = {
    KeyW: "up", ArrowUp: "up",
    KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left",
    KeyD: "right", ArrowRight: "right"
  };

  function install(canvas) {
    window.addEventListener("keydown", function (e) {
      if (MOVE_KEYS[e.code] || e.code === "Space") e.preventDefault();
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      if (e.code === "KeyM") window.NC.AudioSys.toggleMute();
    });
    window.addEventListener("keyup", function (e) {
      keys[e.code] = false;
    });
    window.addEventListener("blur", function () {
      keys = {};
    });
    canvas.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener("mousedown", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
      mouse.clicked = true;
      window.NC.AudioSys.unlock();
    });
    canvas.addEventListener("click", function () {
      window.NC.AudioSys.unlock();
    });
  }

  function moveVector() {
    var x = 0;
    var y = 0;
    if (keys.KeyW || keys.ArrowUp) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x: x, y: y };
  }

  function sneaking() {
    return !!(keys.ShiftLeft || keys.ShiftRight);
  }

  function wasPressed(code) {
    return !!pressed[code];
  }

  function endFrame() {
    pressed = {};
    mouse.clicked = false;
  }

  window.NC = window.NC || {};
  window.NC.Input = {
    install: install,
    moveVector: moveVector,
    sneaking: sneaking,
    wasPressed: wasPressed,
    endFrame: endFrame,
    mouse: mouse,
    keys: keys
  };
})();
