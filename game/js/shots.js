/* Screenshot staging: ?shot=start | play | end builds a fixed, deterministic scene.
   Staged scenes freeze the simulation so the frame is identical every time. */
(function () {
  "use strict";

  function tileCenter(col, row) {
    return { x: col * 40 + 20, y: row * 40 + 20 };
  }

  function applyShot(game, shot) {
    if (!shot) return false;
    if (shot === "start") {
      // Fresh floor one: courier at the door, both guards on patrol, cones visible.
      game.loadLevel(0);
      game.state = "playing";
      game.staged = true;
      var g1 = game.guards[0];
      var p1 = tileCenter(4, 1);
      g1.x = p1.x; g1.y = p1.y; g1.facing = 0;
      var g2 = game.guards[1];
      var p2 = tileCenter(19, 13);
      g2.x = p2.x; g2.y = p2.y; g2.facing = Math.PI;
      return true;
    }
    if (shot === "play") {
      // Mid-play: one document taken, courier crouched behind a crate,
      // the nearest guard suspicious with a high meter, cone sweeping past.
      game.loadLevel(0);
      game.state = "playing";
      game.staged = true;
      game.level.docs[0].taken = true;
      game.docsGot = 1;
      game.docsLeft = 2;
      var pp = tileCenter(2, 6);
      game.player.x = pp.x; game.player.y = pp.y;
      game.player.sneaking = true;
      game.player.facing = Math.PI / 2;
      var g = game.guards[0];
      var gp = tileCenter(2, 1);
      g.x = gp.x; g.y = gp.y;
      g.facing = Math.PI / 2;
      g.state = "suspicious";
      g.meter = 68;
      g.seenX = game.player.x;
      g.seenY = game.player.y;
      game.maxMeter = 68;
      var g2b = game.guards[1];
      var gp2 = tileCenter(12, 13);
      g2b.x = gp2.x; g2b.y = gp2.y;
      g2b.facing = Math.PI;
      g2b.state = "patrol";
      return true;
    }
    if (shot === "end") {
      // All documents taken, exit reached: the floor-cleared screen.
      game.loadLevel(0);
      game.state = "playing";
      game.staged = true;
      game.level.docs.forEach(function (d) { d.taken = true; });
      game.docsGot = 3;
      game.docsLeft = 0;
      game.player.x = game.level.exit.x;
      game.player.y = game.level.exit.y;
      game.state = "levelComplete";
      return true;
    }
    return false;
  }

  function shotFromUrl() {
    var m = window.location.search.match(/[?&]shot=([a-z]+)/);
    return m ? m[1] : null;
  }

  window.NC = window.NC || {};
  window.NC.Shots = { applyShot: applyShot, shotFromUrl: shotFromUrl };
})();
