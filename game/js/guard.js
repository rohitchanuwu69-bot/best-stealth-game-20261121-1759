/* Guard patrol, vision cones, detection meter and noise investigation. */
(function () {
  "use strict";

  var TILE = window.NC.TILE;
  var VIEW_RANGE = 210;
  var VIEW_HALF_ANGLE = 0.61; // about 35 degrees each side
  var HEAR_RADIUS = 250;
  var SUSPICIOUS_AT = 50;
  var CAUGHT_AT = 100;

  function createGuard(def) {
    var wp = def.waypoints.map(function (p) {
      return { x: p[0] * TILE + TILE / 2, y: p[1] * TILE + TILE / 2 };
    });
    var g = {
      x: wp[0].x,
      y: wp[0].y,
      radius: 13,
      waypoints: wp,
      wpIndex: 1 % wp.length,
      speed: def.speed,
      pause: def.pause || 1,
      pauseTimer: 0,
      facing: 0,
      state: "patrol", // patrol | pause | suspicious | investigate | look
      meter: 0,
      seenX: 0,
      seenY: 0,
      lookTimer: 0,
      investigateX: 0,
      investigateY: 0,
      stepTimer: 0,
      alerted: false
    };
    if (wp.length > 1) {
      g.facing = Math.atan2(wp[1].y - wp[0].y, wp[1].x - wp[0].x);
    }
    return g;
  }

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function canSee(level, guard, player) {
    var dx = player.x - guard.x;
    var dy = player.y - guard.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > VIEW_RANGE) return { seen: false, dist: dist };
    var ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, guard.facing)) > VIEW_HALF_ANGLE) return { seen: false, dist: dist };
    if (!window.NC.hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
      return { seen: false, dist: dist };
    }
    return { seen: true, dist: dist };
  }

  function moveToward(guard, tx, ty, dt) {
    var dx = tx - guard.x;
    var dy = ty - guard.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return true;
    var step = Math.min(dist, guard.speed * dt);
    guard.facing = Math.atan2(dy, dx);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    return dist - step < 2;
  }

  function update(level, guard, player, dt, audio, game) {
    var view = canSee(level, guard, player);
    var wasSuspicious = guard.meter >= SUSPICIOUS_AT;

    if (view.seen) {
      var closeness = 1 - view.dist / VIEW_RANGE;
      var rate = 26 + 46 * closeness;
      if (player.sneaking) rate *= 0.45;
      if (player.moving && !player.sneaking) rate *= 1.25;
      guard.meter += rate * dt;
      guard.seenX = player.x;
      guard.seenY = player.y;
      if (guard.meter >= SUSPICIOUS_AT && guard.state !== "investigate") {
        guard.state = "suspicious";
      }
      if (guard.meter >= CAUGHT_AT) {
        game.caughtBy = guard;
        return "caught";
      }
    } else {
      guard.meter = Math.max(0, guard.meter - 24 * dt);
      if (guard.meter < SUSPICIOUS_AT && guard.state === "suspicious") {
        guard.state = "patrol";
      }
    }

    if (!wasSuspicious && guard.meter >= SUSPICIOUS_AT && guard.meter < CAUGHT_AT) {
      audio.suspicious();
    }
    if (guard.meter >= SUSPICIOUS_AT && !guard.alerted) {
      guard.alerted = true;
      audio.alert();
    }
    if (guard.meter < SUSPICIOUS_AT) guard.alerted = false;

    // Footsteps the player can hear: louder the closer the guard.
    var pdx = player.x - guard.x;
    var pdy = player.y - guard.y;
    var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    guard.stepTimer -= dt;
    if (guard.state === "patrol" || guard.state === "investigate") {
      if (guard.stepTimer <= 0 && pdist < 320) {
        audio.guardStep(1 - pdist / 320);
        guard.stepTimer = 0.42;
      }
    }

    if (guard.state === "patrol") {
      var target = guard.waypoints[guard.wpIndex];
      if (moveToward(guard, target.x, target.y, dt)) {
        guard.state = "pause";
        guard.pauseTimer = guard.pause;
      }
    } else if (guard.state === "pause") {
      guard.pauseTimer -= dt;
      guard.facing += dt * 0.9; // slow scan while waiting
      if (guard.pauseTimer <= 0) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.state = "patrol";
      }
    } else if (guard.state === "suspicious") {
      // Turn toward the last seen spot and hold, giving the player a beat.
      var want = Math.atan2(guard.seenY - guard.y, guard.seenX - guard.x);
      guard.facing += angleDiff(want, guard.facing) * Math.min(1, dt * 6);
    } else if (guard.state === "investigate") {
      if (moveToward(guard, guard.investigateX, guard.investigateY, dt * 1.25)) {
        guard.state = "look";
        guard.lookTimer = 2.2;
      }
    } else if (guard.state === "look") {
      guard.lookTimer -= dt;
      guard.facing += dt * 1.6;
      if (guard.lookTimer <= 0) {
        guard.state = "patrol";
        // Head back to the nearest waypoint so the route stays learned.
        var best = 0;
        var bestD = Infinity;
        var i, ddx, ddy, dd;
        for (i = 0; i < guard.waypoints.length; i++) {
          ddx = guard.waypoints[i].x - guard.x;
          ddy = guard.waypoints[i].y - guard.y;
          dd = ddx * ddx + ddy * ddy;
          if (dd < bestD) { bestD = dd; best = i; }
        }
        guard.wpIndex = best;
      }
    }
    return null;
  }

  function hearNoise(guard, x, y) {
    var dx = x - guard.x;
    var dy = y - guard.y;
    if (dx * dx + dy * dy > HEAR_RADIUS * HEAR_RADIUS) return false;
    if (guard.state === "investigate" || guard.state === "look") return false;
    guard.investigateX = x;
    guard.investigateY = y;
    guard.state = "investigate";
    guard.meter = Math.max(guard.meter, 30);
    return true;
  }

  window.NC = window.NC || {};
  window.NC.Guard = {
    create: createGuard,
    update: update,
    canSee: canSee,
    hearNoise: hearNoise,
    VIEW_RANGE: VIEW_RANGE,
    VIEW_HALF_ANGLE: VIEW_HALF_ANGLE,
    SUSPICIOUS_AT: SUSPICIOUS_AT,
    CAUGHT_AT: CAUGHT_AT
  };
})();
