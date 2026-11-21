/* All drawing: floor, cover, documents, exit, vision cones, guards, player, HUD and screens. */
(function () {
  "use strict";

  var TILE = window.NC.TILE;
  var W = 960;
  var H = 640;

  function drawFloor(ctx, level) {
    var r, c;
    for (r = 0; r < window.NC.ROWS; r++) {
      for (c = 0; c < window.NC.COLS; c++) {
        var t = level.tiles[r][c];
        var x = c * TILE;
        var y = r * TILE;
        if (t === "#") {
          ctx.fillStyle = "#232a3d";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#2e3850";
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillStyle = "#1a2030";
          ctx.fillRect(x, y + TILE - 3, TILE, 3);
        } else {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#181c2a" : "#161a27";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fillRect(x, y, TILE, 1);
        }
      }
    }
  }

  function drawCover(ctx, level) {
    var r, c;
    for (r = 0; r < window.NC.ROWS; r++) {
      for (c = 0; c < window.NC.COLS; c++) {
        if (level.tiles[r][c] !== "C") continue;
        var x = c * TILE;
        var y = r * TILE;
        ctx.fillStyle = "#4a3520";
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = "#5d452a";
        ctx.fillRect(x + 3, y + 3, TILE - 6, 8);
        ctx.strokeStyle = "#2e2113";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }

  function drawDocs(ctx, level, time) {
    var i, d;
    for (i = 0; i < level.docs.length; i++) {
      d = level.docs[i];
      if (d.taken) continue;
      var bob = Math.sin(time * 3 + i * 1.7) * 2;
      ctx.save();
      ctx.translate(d.x, d.y + bob);
      ctx.fillStyle = "rgba(255, 214, 90, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4ecd2";
      ctx.fillRect(-7, -9, 14, 18);
      ctx.strokeStyle = "#8a7a4a";
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -9, 14, 18);
      ctx.strokeStyle = "#5a6a9a";
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, -4);
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(-4, 4);
      ctx.lineTo(2, 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawExit(ctx, level, docsLeft, time) {
    var e = level.exit;
    var open = docsLeft === 0;
    var pulse = open ? 0.55 + 0.35 * Math.sin(time * 4) : 0.18;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = open
      ? "rgba(90, 255, 170, " + pulse + ")"
      : "rgba(120, 140, 180, " + pulse + ")";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = open ? "#5affaa" : "#5a6a8a";
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -16, 26, 32);
    ctx.beginPath();
    ctx.moveTo(-13, -16);
    ctx.lineTo(0, -24);
    ctx.lineTo(13, -16);
    ctx.closePath();
    ctx.fillStyle = open ? "#5affaa" : "#5a6a8a";
    ctx.fill();
    ctx.fillStyle = open ? "#0a2a1a" : "#10141f";
    ctx.font = "bold 11px Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(open ? "EXIT" : "LOCKED", 0, 30);
    ctx.restore();
  }

  function drawCone(ctx, level, guard) {
    var range = window.NC.Guard.VIEW_RANGE;
    var half = window.NC.Guard.VIEW_HALF_ANGLE;
    var steps = 26;
    var i, a, d, px, py;
    var hot = guard.meter >= window.NC.Guard.SUSPICIOUS_AT;
    var warm = guard.meter > 8;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (i = 0; i <= steps; i++) {
      a = guard.facing - half + (2 * half * i) / steps;
      d = window.NC.rayDistance(level, guard.x, guard.y, a, range);
      px = guard.x + Math.cos(a) * d;
      py = guard.y + Math.sin(a) * d;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    if (hot) {
      grad.addColorStop(0, "rgba(255, 70, 60, 0.42)");
      grad.addColorStop(1, "rgba(255, 70, 60, 0.05)");
    } else if (warm) {
      grad.addColorStop(0, "rgba(255, 180, 60, 0.34)");
      grad.addColorStop(1, "rgba(255, 180, 60, 0.04)");
    } else {
      grad.addColorStop(0, "rgba(255, 220, 90, 0.26)");
      grad.addColorStop(1, "rgba(255, 220, 90, 0.03)");
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = hot ? "rgba(255, 90, 70, 0.5)" : "rgba(255, 220, 90, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGuard(ctx, guard, time) {
    var bob = Math.sin(time * 6 + guard.x * 0.05) * 1;
    ctx.save();
    ctx.translate(guard.x, guard.y + bob * 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 9, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: dark uniform with a red sash so guards read clearly on the floor.
    ctx.fillStyle = "#3a3f52";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c23b2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 13, -0.6, 0.9);
    ctx.stroke();
    // Facing tick and helmet lamp.
    ctx.strokeStyle = "#e8e4d8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(guard.facing) * 16, Math.sin(guard.facing) * 16);
    ctx.stroke();
    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.arc(Math.cos(guard.facing) * 15, Math.sin(guard.facing) * 15, 3, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc above the head.
    if (guard.meter > 2) {
      var frac = guard.meter / 100;
      ctx.strokeStyle = frac >= 0.5 ? "#ff5040" : "#ffc84a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer(ctx, player, time) {
    var bob = player.moving ? Math.sin(time * 10) * 1.2 : 0;
    ctx.save();
    ctx.translate(player.x, player.y + bob * 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 9, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded courier: deep teal cloak, pale hood, brass satchel clasp.
    ctx.fillStyle = player.sneaking ? "#1d6a63" : "#2a9d8f";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0d3f3a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#e9e2c8";
    ctx.beginPath();
    ctx.arc(Math.cos(player.facing) * 3, Math.sin(player.facing) * 3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(-Math.cos(player.facing) * 8, -Math.sin(player.facing) * 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Pebble in flight.
    var pp = window.NC.Player.pebblePos(player);
    if (pp) {
      ctx.fillStyle = "#d8d2c0";
      ctx.beginPath();
      ctx.arc(pp.x, pp.y - pp.lift, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNoiseRing(ctx, noise, time) {
    if (!noise) return;
    var age = time - noise.t;
    if (age > 0.8) return;
    ctx.strokeStyle = "rgba(255, 230, 140, " + (0.8 - age) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 12 + age * 160, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHud(ctx, game) {
    ctx.fillStyle = "rgba(8, 10, 18, 0.88)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "#2c3450";
    ctx.fillRect(0, 34, W, 2);
    ctx.font = "bold 14px Verdana, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8e4d8";
    ctx.fillText(game.level.name, 12, 22);
    ctx.fillStyle = "#ffd65a";
    ctx.fillText("Documents  " + game.docsGot + " / " + game.docsTotal, 300, 22);
    ctx.fillStyle = "#7dd8c8";
    ctx.fillText("Pebbles  " + game.player.pebbles, 470, 22);
    ctx.fillStyle = "#ff8a7a";
    var hearts = "";
    var i;
    for (i = 0; i < game.lives; i++) hearts += "♥ ";
    ctx.fillText(hearts, 580, 22);
    ctx.fillStyle = "#c8cdd8";
    ctx.textAlign = "right";
    ctx.fillText("Time  " + formatTime(game.time), W - 12, 22);
    ctx.textAlign = "left";
    // Global alert meter: the highest guard suspicion, right under the bar.
    var m = game.maxMeter;
    if (m > 2) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(12, 42, 220, 12);
      ctx.fillStyle = m >= 50 ? "#ff5040" : "#ffc84a";
      ctx.fillRect(12, 42, 220 * (m / 100), 12);
      ctx.strokeStyle = "#e8e4d8";
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 42, 220, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Verdana, sans-serif";
      ctx.fillText(m >= 50 ? "SPOTTED!" : "SUSPICION", 240, 52);
    }
  }

  function formatTime(t) {
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function panel(ctx, title, lines, accent) {
    ctx.fillStyle = "rgba(6, 8, 14, 0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(16, 20, 34, 0.95)";
    ctx.strokeStyle = accent || "#2c3450";
    ctx.lineWidth = 2;
    var pw = 560;
    var ph = 90 + lines.length * 30;
    var px = (W - pw) / 2;
    var py = (H - ph) / 2;
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = accent || "#e8e4d8";
    ctx.font = "bold 30px Verdana, sans-serif";
    ctx.fillText(title, W / 2, py + 52);
    ctx.font = "15px Verdana, sans-serif";
    ctx.fillStyle = "#c8cdd8";
    var i;
    for (i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, py + 92 + i * 30);
    }
  }

  function drawTitle(ctx, game) {
    panel(ctx, "NIGHT COURIER", [
      "A lone courier slips through a guarded archive after dark.",
      "Collect 3 documents on each floor, then reach the glowing exit — unseen.",
      "",
      "WASD / arrows to move · Shift to sneak · E or click to toss a pebble",
      "Guards patrol, watch, and investigate noises. If one fills your meter, you are caught.",
      "",
      "Press ENTER to begin"
    ], "#2a9d8f");
  }

  function drawCaught(ctx, game) {
    panel(ctx, "CAUGHT!", [
      "A guard spotted you in the " + game.level.name + ".",
      "Lives left: " + game.lives,
      "",
      "Press R to try the floor again"
    ], "#c23b2e");
  }

  function drawLevelComplete(ctx, game) {
    panel(ctx, "FLOOR CLEARED", [
      game.level.name + " — all documents secured, exit reached unseen.",
      "Time: " + formatTime(game.time) + "   ·   Lives left: " + game.lives,
      "",
      "Press ENTER for the next floor"
    ], "#5affaa");
  }

  function drawGameOver(ctx, game) {
    panel(ctx, "THE ARCHIVE KEEPS ITS SECRETS", [
      "Caught three times. The night shift wins this round.",
      "Documents secured across all floors: " + game.totalDocs,
      "",
      "Press ENTER to start over"
    ], "#c23b2e");
  }

  function drawGameComplete(ctx, game) {
    panel(ctx, "GHOST OF THE ARCHIVE", [
      "All three floors cleared — every document out, never once dragged away.",
      "Total time: " + formatTime(game.time) + "   ·   Lives left: " + game.lives,
      "",
      "Press ENTER to play again"
    ], "#ffd65a");
  }

  function draw(ctx, game) {
    ctx.clearRect(0, 0, W, H);
    drawFloor(ctx, game.level);
    drawExit(ctx, game.level, game.docsLeft, game.time);
    drawDocs(ctx, game.level, game.time);
    drawCover(ctx, game.level);
    var i;
    for (i = 0; i < game.guards.length; i++) drawCone(ctx, game.level, game.guards[i]);
    drawNoiseRing(ctx, game.noise, game.time);
    for (i = 0; i < game.guards.length; i++) drawGuard(ctx, game.guards[i], game.time);
    drawPlayer(ctx, game.player, game.time);
    drawHud(ctx, game);
    if (game.state === "title") drawTitle(ctx, game);
    else if (game.state === "caught") drawCaught(ctx, game);
    else if (game.state === "levelComplete") drawLevelComplete(ctx, game);
    else if (game.state === "gameOver") drawGameOver(ctx, game);
    else if (game.state === "gameComplete") drawGameComplete(ctx, game);
  }

  window.NC = window.NC || {};
  window.NC.Render = { draw: draw, formatTime: formatTime };
})();
