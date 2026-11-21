/* Game loop, state machine, level flow and the shared game object. */
(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var Input = window.NC.Input;
  var AudioSys = window.NC.AudioSys;
  Input.install(canvas);

  var game = {
    state: "title",
    levelIndex: 0,
    level: null,
    guards: [],
    player: null,
    lives: 3,
    time: 0,
    docsGot: 0,
    docsTotal: 3,
    docsLeft: 3,
    maxMeter: 0,
    noise: null,
    caughtBy: null,
    totalDocs: 0,
    staged: false
  };

  function loadLevel(index) {
    var level = window.NC.buildLevel(index);
    game.levelIndex = index;
    game.level = level;
    game.guards = level.guardDefs.map(function (d) { return window.NC.Guard.create(d); });
    game.player = window.NC.Player.create(level.spawn);
    game.player.pebbles = level.pebbles;
    game.docsTotal = level.docs.length;
    game.docsGot = 0;
    game.docsLeft = level.docs.length;
    game.maxMeter = 0;
    game.noise = null;
    game.caughtBy = null;
  }

  game["loadLevel"] = loadLevel;

  function startRun() {
    game.lives = 3;
    game.totalDocs = 0;
    game.time = 0;
    loadLevel(0);
    game.state = "playing";
    AudioSys.unlock();
  }

  function retryLevel() {
    loadLevel(game.levelIndex);
    game.state = "playing";
  }

  function nextLevel() {
    game.totalDocs += game.docsGot;
    if (game.levelIndex + 1 >= window.NC.LEVELS.length) {
      game.state = "gameComplete";
      AudioSys.gameWon();
    } else {
      loadLevel(game.levelIndex + 1);
      game.state = "playing";
    }
  }

  function refreshCounts() {
    game.docsLeft = window.NC.Player.docsLeft(game.level);
    game.docsGot = game.docsTotal - game.docsLeft;
    var m = 0;
    var i;
    for (i = 0; i < game.guards.length; i++) m = Math.max(m, game.guards[i].meter);
    game.maxMeter = m;
  }

  function updatePlaying(dt) {
    game.time += dt;
    var player = game.player;
    var result = window.NC.Player.update(game.level, player, Input, dt, AudioSys);
    if (result && result.noise) {
      game.noise = { x: result.noise.x, y: result.noise.y, t: game.time };
      AudioSys.pebble();
      var i;
      for (i = 0; i < game.guards.length; i++) {
        window.NC.Guard.hearNoise(game.guards[i], result.noise.x, result.noise.y);
      }
    }
    if (Input.wasPressed("KeyE")) {
      var m = Input.mouse;
      var tx = (m.x || player.x + Math.cos(player.facing) * 120);
      var ty = (m.y || player.y + Math.sin(player.facing) * 120);
      if (window.NC.Player.tossPebble(player, tx, ty)) AudioSys.pebble();
    }
    if (Input.mouse.clicked) {
      if (window.NC.Player.tossPebble(player, Input.mouse.clickX, Input.mouse.clickY)) {
        AudioSys.pebble();
      }
    }
    var i, outcome;
    for (i = 0; i < game.guards.length; i++) {
      outcome = window.NC.Guard.update(game.level, game.guards[i], player, dt, AudioSys, game);
      if (outcome === "caught") {
        game.lives -= 1;
        AudioSys.caught();
        if (game.lives <= 0) {
          game.state = "gameOver";
        } else {
          game.state = "caught";
        }
        refreshCounts();
        return;
      }
    }
    var got = window.NC.Player.collectDocs(game.level, player);
    if (got.length > 0) AudioSys.pickup();
    if (window.NC.Player.onExit(game.level, player)) {
      game.state = "levelComplete";
      AudioSys.levelClear();
    }
    refreshCounts();
  }

  function update(dt) {
    if (game.state === "playing") {
      if (!game.staged) updatePlaying(dt);
      else game.time += dt;
      return;
    }
    if (game.state === "title") {
      if (Input.wasPressed("Enter") || Input.wasPressed("Space")) startRun();
    } else if (game.state === "caught") {
      if (Input.wasPressed("KeyR")) retryLevel();
    } else if (game.state === "levelComplete") {
      if (Input.wasPressed("Enter")) nextLevel();
    } else if (game.state === "gameOver" || game.state === "gameComplete") {
      if (Input.wasPressed("Enter")) {
        game.state = "title";
        loadLevel(0);
      }
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    window.NC.Render.draw(ctx, game);
    Input.endFrame();
    requestAnimationFrame(frame);
  }

  loadLevel(0);
  var shot = window.NC.Shots.shotFromUrl();
  if (shot) {
    window.NC.Shots.applyShot(game, shot);
  }
  requestAnimationFrame(frame);

  window.NC.Game = game;
})();
