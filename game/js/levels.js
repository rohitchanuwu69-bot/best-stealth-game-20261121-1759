/* Level data, tile lookup, collision and line-of-sight helpers. */
(function () {
  "use strict";

  var TILE = 40;
  var COLS = 24;
  var ROWS = 16;

  // Legend: # wall, . floor, C cover crate, D document, E exit, P player start.
  // Guard patrol routes are listed per level as tile coordinates.
  var LEVELS = [
    {
      name: "Level 1 — The Quiet Archive",
      map: [
        "########################",
        "#P......CC......D......#",
        "#......................#",
        "#..####....####....##..#",
        "#......................#",
        "#..C......D......C.....#",
        "#......................#",
        "#....####......####....#",
        "#......................#",
        "#..C......C......D.....#",
        "#......................#",
        "#..####....####....##..#",
        "#......................#",
        "#......C........C......#",
        "#.....................E#",
        "########################"
      ],
      guards: [
        { waypoints: [[4, 1], [19, 1]], speed: 52, pause: 1.2 },
        { waypoints: [[19, 13], [4, 13]], speed: 52, pause: 1.2 }
      ],
      pebbles: 3
    },
    {
      name: "Level 2 — The Long Gallery",
      map: [
        "########################",
        "#P...C......##......D..#",
        "#..........##..........#",
        "#..####....##....####..#",
        "#..........##..........#",
        "#....D...........C.....#",
        "#..####....##....####..#",
        "#..........##..........#",
        "#....C...........D.....#",
        "#..####....##....####..#",
        "#..........##..........#",
        "#......C....##....C....#",
        "#..........##..........#",
        "#..####....##....####..#",
        "#.....................E#",
        "########################"
      ],
      guards: [
        { waypoints: [[3, 1], [20, 1]], speed: 66, pause: 0.8 },
        { waypoints: [[20, 7], [3, 7]], speed: 66, pause: 0.8 },
        { waypoints: [[3, 13], [20, 13]], speed: 60, pause: 1.0 }
      ],
      pebbles: 3
    },
    {
      name: "Level 3 — The Vault Wing",
      map: [
        "########################",
        "#P.....##.......D......#",
        "#......##..............#",
        "#..##..##..####...##...#",
        "#......##..............#",
        "#...D......C.......C...#",
        "#......##..............#",
        "#..##..##..####...##...#",
        "#......##......D.......#",
        "#......##..............#",
        "#..##..##..####...##...#",
        "#...C......##......C...#",
        "#......##..............#",
        "#..##..##..####...##...#",
        "#.....................E#",
        "########################"
      ],
      guards: [
        { waypoints: [[2, 1], [21, 1]], speed: 82, pause: 0.5 },
        { waypoints: [[21, 5], [2, 5]], speed: 82, pause: 0.5 },
        { waypoints: [[2, 9], [21, 9]], speed: 76, pause: 0.6 },
        { waypoints: [[21, 13], [2, 13]], speed: 82, pause: 0.5 }
      ],
      pebbles: 2
    }
  ];

  function normalize(map) {
    var rows = [];
    var r, c, line;
    for (r = 0; r < ROWS; r++) {
      line = (map[r] || "").split("");
      while (line.length < COLS) line.push("#");
      if (line.length > COLS) line.length = COLS;
      rows.push(line);
    }
    return rows;
  }

  function buildLevel(index) {
    var def = LEVELS[index];
    var tiles = normalize(def.map);
    var docs = [];
    var exit = null;
    var spawn = { x: TILE * 1.5, y: TILE * 1.5 };
    var r, c, ch;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        ch = tiles[r][c];
        if (ch === "D") {
          docs.push({ col: c, row: r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, taken: false });
          tiles[r][c] = ".";
        } else if (ch === "E") {
          exit = { col: c, row: r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
          tiles[r][c] = ".";
        } else if (ch === "P") {
          spawn = { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
          tiles[r][c] = ".";
        }
      }
    }
    return {
      index: index,
      name: def.name,
      tiles: tiles,
      docs: docs,
      exit: exit,
      spawn: spawn,
      guardDefs: def.guards,
      pebbles: def.pebbles
    };
  }

  function tileAt(level, col, row) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return "#";
    return level.tiles[row][col];
  }

  function blocksMove(level, col, row) {
    var t = tileAt(level, col, row);
    return t === "#" || t === "C";
  }

  function blocksSight(level, col, row) {
    var t = tileAt(level, col, row);
    return t === "#" || t === "C";
  }

  // Circle vs solid tiles: true when the circle overlaps a blocking tile.
  function circleHitsSolid(level, x, y, radius) {
    var c0 = Math.floor((x - radius) / TILE);
    var c1 = Math.floor((x + radius) / TILE);
    var r0 = Math.floor((y - radius) / TILE);
    var r1 = Math.floor((y + radius) / TILE);
    var c, r;
    for (r = r0; r <= r1; r++) {
      for (c = c0; c <= c1; c++) {
        if (!blocksMove(level, c, r)) continue;
        var nx = Math.max(c * TILE, Math.min(x, c * TILE + TILE));
        var ny = Math.max(r * TILE, Math.min(y, r * TILE + TILE));
        var dx = x - nx;
        var dy = y - ny;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    return false;
  }

  // Sampled line of sight: true when nothing blocks the view between two points.
  function hasLineOfSight(level, x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(dist / 8));
    var i, t, px, py;
    for (i = 1; i < steps; i++) {
      t = i / steps;
      px = x0 + dx * t;
      py = y0 + dy * t;
      if (blocksSight(level, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
    }
    return true;
  }

  // Ray march from a point until a sight-blocking tile; returns the distance.
  function rayDistance(level, x, y, angle, maxDist) {
    var step = 6;
    var d = 0;
    var px, py;
    while (d < maxDist) {
      d += step;
      px = x + Math.cos(angle) * d;
      py = y + Math.sin(angle) * d;
      if (blocksSight(level, Math.floor(px / TILE), Math.floor(py / TILE))) return d;
    }
    return maxDist;
  }

  window.NC = window.NC || {};
  window.NC.TILE = TILE;
  window.NC.COLS = COLS;
  window.NC.ROWS = ROWS;
  window.NC.LEVELS = LEVELS;
  window.NC.buildLevel = buildLevel;
  window.NC.tileAt = tileAt;
  window.NC.circleHitsSolid = circleHitsSolid;
  window.NC.hasLineOfSight = hasLineOfSight;
  window.NC.rayDistance = rayDistance;
})();
