/* The courier: movement, sneaking, pebble tosses and document pickup. */
(function () {
  "use strict";

  var WALK_SPEED = 150;
  var SNEAK_SPEED = 72;
  var RADIUS = 12;

  function createPlayer(spawn) {
    return {
      x: spawn.x,
      y: spawn.y,
      radius: RADIUS,
      facing: 0,
      moving: false,
      sneaking: false,
      stepTimer: 0,
      pebbles: 0,
      pebbleFlight: null
    };
  }

  function tryMove(level, player, dx, dy) {
    var nx = player.x + dx;
    var ny = player.y + dy;
    if (!window.NC.circleHitsSolid(level, nx, player.y, player.radius)) player.x = nx;
    if (!window.NC.circleHitsSolid(level, player.x, ny, player.radius)) player.y = ny;
  }

  function update(level, player, input, dt, audio) {
    var vec = input.moveVector();
    player.sneaking = input.sneaking();
    var speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    player.moving = vec.x !== 0 || vec.y !== 0;
    if (player.moving) {
      player.facing = Math.atan2(vec.y, vec.x);
      tryMove(level, player, vec.x * speed * dt, vec.y * speed * dt);
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        audio.footstep(player.sneaking, !player.sneaking);
        player.stepTimer = player.sneaking ? 0.55 : 0.34;
      }
    } else {
      player.stepTimer = 0;
    }
    if (player.pebbleFlight) {
      var f = player.pebbleFlight;
      f.t += dt / f.dur;
      if (f.t >= 1) {
        f.t = 1;
        player.pebbleFlight = null;
        return { noise: { x: f.tx, y: f.ty } };
      }
      player.x = player.x; // position stays put while the pebble flies
    }
    return null;
  }

  function tossPebble(player, tx, ty) {
    if (player.pebbles <= 0 || player.pebbleFlight) return false;
    player.pebbles -= 1;
    var dx = tx - player.x;
    var dy = ty - player.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxThrow = 260;
    if (dist > maxThrow) {
      tx = player.x + (dx / dist) * maxThrow;
      ty = player.y + (dy / dist) * maxThrow;
    }
    player.pebbleFlight = { sx: player.x, sy: player.y, tx: tx, ty: ty, t: 0, dur: 0.35 };
    return true;
  }

  function pebblePos(player) {
    var f = player.pebbleFlight;
    if (!f) return null;
    var x = f.sx + (f.tx - f.sx) * f.t;
    var y = f.sy + (f.ty - f.sy) * f.t;
    var lift = Math.sin(f.t * Math.PI) * 26;
    return { x: x, y: y, lift: lift };
  }

  function collectDocs(level, player) {
    var got = [];
    var i, d, dx, dy;
    for (i = 0; i < level.docs.length; i++) {
      d = level.docs[i];
      if (d.taken) continue;
      dx = player.x - d.x;
      dy = player.y - d.y;
      if (dx * dx + dy * dy < 26 * 26) {
        d.taken = true;
        got.push(d);
      }
    }
    return got;
  }

  function docsLeft(level) {
    var n = 0;
    var i;
    for (i = 0; i < level.docs.length; i++) if (!level.docs[i].taken) n++;
    return n;
  }

  function onExit(level, player) {
    if (docsLeft(level) > 0) return false;
    var dx = player.x - level.exit.x;
    var dy = player.y - level.exit.y;
    return dx * dx + dy * dy < 26 * 26;
  }

  window.NC = window.NC || {};
  window.NC.Player = {
    create: createPlayer,
    update: update,
    tossPebble: tossPebble,
    pebblePos: pebblePos,
    collectDocs: collectDocs,
    docsLeft: docsLeft,
    onExit: onExit
  };
})();
