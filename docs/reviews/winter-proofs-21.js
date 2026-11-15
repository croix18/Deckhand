/* Winter 2.1 drawings (Croix, Nov 14: "Colored bulbs. I want better more realistic looking frost. Smaller
   snowflakes. Occasional flurries. Have the ocean freeze and the coldest part of the year. The serpent is still
   funky as hell not smooth. I want that thing to slither in and out of the water.")
   Loaded before the sheet's main script; the functions here replace 2.0's topBulb() and frost(). */

/* ===== 1 · colored bulbs: five classic C9 colors, tuned to the board =====
   red, amber, green, ice blue (winter's own) and yellow; lit = saturated glass, a pale hot core, a halo of its
   own color; dark = the same hue gone to a dull smoke, with the glint (plainly a bulb, plainly off) */
var BULBS = [
  { name: "red",    glass: "#E0483E", core: "#FFB3A8", dark: "#7A4542", halo: "#FF6A5C" },
  { name: "amber",  glass: "#EE8F22", core: "#FFDCA0", dark: "#7C5E3E", halo: "#FFA640" },
  { name: "green",  glass: "#2FA85A", core: "#B4F2C2", dark: "#3F6650", halo: "#4FD47E" },
  { name: "blue",   glass: "#4C7BD9", core: "#C9DBFF", dark: "#46587E", halo: "#6E9BFF" },
  { name: "yellow", glass: "#F2C82E", core: "#FFF4BE", dark: "#7A7046", halo: "#FFE45C" }];
(function(){ var d = document.querySelector("svg defs"), h = "";
  BULBS.forEach(function(b, i){ h += '<radialGradient id="liHalo' + i + '"><stop offset="0" stop-color="' + b.halo + '" stop-opacity=".62"/><stop offset=".45" stop-color="' + b.halo + '" stop-opacity=".24"/><stop offset="1" stop-color="' + b.halo + '" stop-opacity="0"/></radialGradient>'; });
  d.insertAdjacentHTML("beforeend", h); })();
var BULB_IDX = 0;
function topBulb(x, y, lit, k, rot, ci){
  var c = ci == null ? (BULB_IDX++ % 5) : ci, B = BULBS[c];
  var tear = function(cx, top, w, h){ return "M" + r1(cx - w * .32) + "," + r1(top) + " C" + r1(cx - w * .62) + "," + r1(top + h * .35) + " " + r1(cx - w * .5) + "," + r1(top + h * .78) + " " + r1(cx) + "," + r1(top + h) +
    " C" + r1(cx + w * .5) + "," + r1(top + h * .78) + " " + r1(cx + w * .62) + "," + r1(top + h * .35) + " " + r1(cx + w * .32) + "," + r1(top) + " Z"; };
  var g = '<g transform="rotate(' + r1(rot) + ' ' + r1(x) + ' ' + r1(y) + ')">';
  if (lit) g += '<circle cx="' + r1(x) + '" cy="' + r1(y + 20 * k) + '" r="' + r1(30 * k) + '" fill="url(#liHalo' + c + ')"/>';
  g += '<rect class="liSocket" x="' + r1(x - 4 * k) + '" y="' + r1(y) + '" width="' + r1(8 * k) + '" height="' + r1(8 * k) + '" rx="' + r1(1.4 * k) + '"/>';
  g += '<path fill="' + (lit ? B.glass : B.dark) + '"' + (lit ? '' : ' opacity=".8"') + ' d="' + tear(x, y + 7.4 * k, 17 * k, 26 * k) + '"/>';
  if (lit) g += '<path fill="' + B.core + '" d="' + tear(x, y + 11 * k, 9 * k, 15 * k) + '"/>';
  g += '<path class="liGlint" style="stroke-width:' + r1(1.8 * k) + '" d="M' + r1(x - 4 * k) + ',' + r1(y + 13 * k) + ' q' + r1(-1.4 * k) + ',' + r1(5 * k) + ' ' + r1(.4 * k) + ',' + r1(9 * k) + '"/>';
  return g + '</g>';
}

/* ===== 2 · frost, grown like real window frost and painted once into a bitmap =====
   Real frost on glass (the reference): ice nucleates on scratches and dirt along the frame, where the glass is
   coldest; from each nucleation point a dendrite grows inward as a fine straight needle that throws side
   branches at 60° (ice is hexagonal), the branches throw their own, and the plume looks like a feather or a
   fern of NEEDLES, not of leaves. Near the frame the plumes crowd into a dense white crust (rime) over a
   translucent haze; inward they thin to single needles and delicate tips; the light catches a few tips as
   sparkle points. Here: nucleation points every 7–16 px along the card's top and right edges, a seeded
   recursive dendrite from each (needles of 2–4 px steps, ±60° side branches three levels deep, widths from
   1.5 down to 0.45 px), drawn in two strokes (a faint ice-blue shadow 0.7 px down-right, then white) over a
   rime haze that is densest at the frame, plus fine edge crystals and sparkles. All of it is drawn into one
   canvas once per stage: the board then shows a single still image. */
var FROST_CACHE = {}, FROST_STATS = {};
function frostEnvelope(G, s){
  var C = G.clock, f = G.free, Rx = C.x + C.w, T = C.y;
  var u = Math.min(520, .92 * f.uMax) * s, strip = .64 * C.h * s, v = f.vTop >= 20 ? Math.min(130, .92 * f.vTop) * s : 0, band = v ? .42 * C.w * s : 0;
  return { Rx: Rx, T: T, u: u, strip: strip, v: v, band: band, x0: Rx - Math.max(u, band) - 4, w: Math.max(u, band) + 4, h: strip + 4 };
}
function frostPaint(G, s, o){
  o = o || {};
  var E = frostEnvelope(G, s), ctl = (G.controls || [])[0], dpr = o.dpr || 1, t0 = performance.now();
  var cv = document.createElement("canvas"); cv.width = Math.ceil(E.w * dpr); cv.height = Math.ceil(E.h * dpr);
  var x = cv.getContext("2d"); x.scale(dpr, dpr); x.translate(-E.x0, -E.T);
  var Rn = rng(o.seed || 7), segs = 0;
  function inside(px, py){
    if (px > E.Rx - 1 || py < E.T + 1) return false;
    var inStrip = px >= E.Rx - E.u && py <= E.T + E.strip, inBand = py <= E.T + E.v && px >= E.Rx - E.band;
    if (!inStrip && !inBand) return false;
    if (ctl){ var dx = px - (ctl.x + ctl.w / 2), dy = py - (ctl.y + ctl.h / 2); if (dx * dx + dy * dy < Math.pow(ctl.w / 2 + 12, 2)) return false; }
    return true;
  }
  /* the soft envelope: how far in from the frame this point is, 0 at the frame, 1 at the envelope's far edge */
  function depthAt(px, py){
    var a = E.u ? (E.Rx - px) / E.u : 9, b = E.v ? (py - E.T) / E.v : 9, c = (py - E.T) / E.strip;
    var inStrip = E.u ? Math.max(a, c * .55) : 9, inBand = E.v ? Math.max(b, (E.Rx - px) / E.band * .5) : 9;
    return Math.min(inStrip, inBand);
  }
  /* 1. the rime haze: a translucent pane, whitest at the frame */
  var hz = x.createLinearGradient(E.Rx, 0, E.Rx - E.u, 0);
  hz.addColorStop(0, "rgba(206,221,247,.78)"); hz.addColorStop(.35, "rgba(218,230,250,.5)"); hz.addColorStop(1, "rgba(232,240,252,0)");
  x.save(); x.beginPath(); x.rect(E.Rx - E.u, E.T, E.u, E.strip); x.clip();
  x.fillStyle = hz; x.fillRect(E.Rx - E.u, E.T, E.u, E.strip);
  var hzV = x.createLinearGradient(0, E.T + E.strip * .55, 0, E.T + E.strip); hzV.addColorStop(0, "rgba(255,255,255,0)"); hzV.addColorStop(1, "rgba(255,255,255,1)");
  x.fillStyle = hzV; x.fillRect(E.Rx - E.u, E.T + E.strip * .55, E.u, E.strip * .45); x.restore();
  if (E.v){ var hb = x.createLinearGradient(0, E.T, 0, E.T + E.v); hb.addColorStop(0, "rgba(206,221,247,.78)"); hb.addColorStop(1, "rgba(232,240,252,0)");
    x.save(); x.beginPath(); x.rect(E.Rx - E.band, E.T, E.band - E.u * .5, E.v); x.clip(); x.fillStyle = hb; x.fillRect(E.Rx - E.band, E.T, E.band, E.v);
    var hbH = x.createLinearGradient(E.Rx - E.band, 0, E.Rx - E.band * .7, 0); hbH.addColorStop(0, "rgba(255,255,255,1)"); hbH.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = hbH; x.fillRect(E.Rx - E.band, E.T, E.band * .3, E.v); x.restore(); }
  /* 2. the dendrites: feather plumes of needles. A stem grows from its nucleus in 4 px steps with a slight curl;
     every 5–7 px it throws a pair of side needles at 60° (longest a quarter of the way out, a feather's taper);
     needles over 9 px throw their own short sub-needles at 60°. Collected per width, stroked twice. */
  var W = [1.3, .8, .5], P = W.map(function(){ return []; }), tips = [];
  function line(x1, y1, a, len, lvl){ var x2 = x1 + Math.cos(a) * len, y2 = y1 + Math.sin(a) * len; if (!inside(x2, y2)) return null; P[lvl].push([[x1, y1], [x2, y2]]); segs++; return [x2, y2]; }
  function plume(px, py, ang, L, curl){
    var a = ang, stem = [[px, py]], Bw = Math.max(6, Math.min(26, L * .17)), next = 3 + Rn() * 3, n = Math.round(L / 4);
    for (var i = 1; i <= n; i++){
      a += curl + (Rn() - .5) * .04;
      var nx = px + Math.cos(a) * 4, ny = py + Math.sin(a) * 4; if (!inside(nx, ny)) break;
      px = nx; py = ny; stem.push([px, py]); segs++;
      var t = i / n;
      if (i * 4 >= next){
        next += 5 + Rn() * 2;
        var shape = t < .25 ? .35 + .65 * t / .25 : (1 - t) / .75, b = Bw * shape * (.7 + .5 * Rn());
        [-1, 1].forEach(function(sd){
          if (b < 2.5) return;
          var ba = a + sd * (Math.PI / 3 + (Rn() - .5) * .12), e = line(px, py, ba, b, 1);
          if (e && b > 9){ [.35, .65].forEach(function(f){ var sx = px + Math.cos(ba) * b * f, sy = py + Math.sin(ba) * b * f, sb = b * .3 * (.7 + .5 * Rn());
            line(sx, sy, ba + sd * Math.PI / 3, sb, 2); if (Rn() < .5) line(sx, sy, ba - sd * Math.PI / 3, sb * .8, 2); }); }
          if (e && Rn() < .05) tips.push(e);
        });
      }
    }
    if (stem.length > 1){ var cut = Math.max(2, Math.round(stem.length * .6)); P[0].push(stem.slice(0, cut)); P[1].push(stem.slice(cut - 1)); tips.push(stem[stem.length - 1]); }
  }
  var gap = 15 + 8 * (1 - s), y, xx;
  for (y = E.T + 6; y < E.T + E.strip; y += gap * (.7 + .6 * Rn())){
    var q = (y - E.T) / E.strip, L = E.u * (1 - .7 * Math.pow(q, 1.15)) * (.5 + .5 * Rn());
    if (L > 6) plume(E.Rx - 1, y, Math.PI + (Rn() - .3) * .6, L, (Rn() - .5) * .012);
  }
  if (E.v) for (xx = E.Rx - 8; xx > E.Rx - E.band; xx -= gap * (.7 + .6 * Rn())){
    var qx = (E.Rx - xx) / E.band, Lt = E.v * 1.3 * (1 - .55 * qx) * (.5 + .5 * Rn());
    if (Lt > 5) plume(xx, E.T + 1, Math.PI / 2 + (Rn() - .35) * .7, Lt, (Rn() - .5) * .014);
  }
  /* fine crystals crowding the frame: a crust of tiny needle stars */
  var crust = [];
  for (var i = 0; i < 420 * s + 60; i++){
    var onRight = !E.v || Rn() < E.strip / (E.strip + E.band), cx, cy, dd = Math.pow(Rn(), 2.2) * (14 + 10 * s);
    if (onRight){ cx = E.Rx - 1 - dd; cy = E.T + Rn() * E.strip * (1 - .4 * Rn()); } else { cx = E.Rx - Rn() * E.band * (1 - .3 * Rn()); cy = E.T + 1 + dd; }
    if (!inside(cx, cy)) continue;
    var r = 1.2 + Rn() * 2.4, a0 = Rn() * Math.PI;
    for (var k = 0; k < 3; k++){ var aa = a0 + k * Math.PI / 3; crust.push([[cx - Math.cos(aa) * r, cy - Math.sin(aa) * r], [cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]]); segs++; }
  }
  function strokeAll(list, w, style, dx, dy){ x.beginPath(); list.forEach(function(p){ x.moveTo(p[0][0] + dx, p[0][1] + dy); for (var j = 1; j < p.length; j++) x.lineTo(p[j][0] + dx, p[j][1] + dy); }); x.lineWidth = w; x.strokeStyle = style; x.stroke(); }
  x.lineCap = "round"; x.lineJoin = "round";
  strokeAll(crust, .7, "rgba(70,110,185,.32)", .6, .6); strokeAll(crust, .55, "rgba(255,255,255,.95)", 0, 0);
  for (var lv = 2; lv >= 0; lv--){ strokeAll(P[lv], W[lv] + .5, "rgba(62,102,178," + (lv === 0 ? .45 : .34) + ")", .7, .8); }
  for (lv = 2; lv >= 0; lv--){ strokeAll(P[lv], W[lv], "rgba(255,255,255,.97)", 0, 0); }
  /* 3. sparkle points where the light catches a tip */
  tips.forEach(function(p, i){ if (i % 3) return; var r = 2.6 + Rn() * 2.4;
    x.strokeStyle = "rgba(255,255,255,1)"; x.lineWidth = 1; x.beginPath(); x.moveTo(p[0] - r, p[1]); x.lineTo(p[0] + r, p[1]); x.moveTo(p[0], p[1] - r); x.lineTo(p[0], p[1] + r); x.stroke();
    x.fillStyle = "rgba(160,190,240,.55)"; x.beginPath(); x.arc(p[0], p[1], 1.5, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(p[0], p[1], .9, 0, 7); x.fill(); });
  /* 4. a thin snow lip and clear icicles along the top edge, longest toward the corner */
  var iceL = Math.max(E.band, E.u), xi;
  x.fillStyle = "rgba(255,255,255,.96)"; x.strokeStyle = "rgba(76,123,217,.45)"; x.lineWidth = 1;
  for (xi = E.Rx - iceL; xi < E.Rx - 22; xi += 9 + Rn() * 16){
    var qi = (E.Rx - xi) / iceL, len = (5 + Rn() * 30 * (1 - .65 * qi)) * Math.min(1, .3 + s), w2 = 2 + len * .13;
    if (ctl && Math.abs(xi - (ctl.x + ctl.w / 2)) < ctl.w / 2 + 16) len = Math.min(len, ctl.y - 14 - E.T);
    if (len < 5) continue;
    var g = x.createLinearGradient(xi - w2, 0, xi + w2, 0); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.6, "rgba(225,236,252,.9)"); g.addColorStop(1, "rgba(185,206,244,.9)");
    x.fillStyle = g; x.beginPath(); x.moveTo(xi - w2, E.T + 2); x.quadraticCurveTo(xi - w2 * .4, E.T + len * .6, xi + .4, E.T + len); x.quadraticCurveTo(xi + w2 * .5, E.T + len * .5, xi + w2, E.T + 2); x.closePath(); x.fill(); x.stroke();
    if (o.drip && Rn() < .35){ x.fillStyle = "rgba(225,236,252,.95)"; x.beginPath(); x.ellipse(xi + .4, E.T + len + 5, 1.8, 2.6, 0, 0, 7); x.fill(); x.stroke(); }
  }
  x.fillStyle = "#fff"; x.beginPath(); x.moveTo(E.Rx - iceL - 4, E.T); for (xi = E.Rx - iceL - 4; xi < E.Rx; xi += 8) x.quadraticCurveTo(xi + 4, E.T + 4.5 + Rn() * 2.5, xi + 8, E.T + 2); x.lineTo(E.Rx, E.T); x.closePath(); x.fill();
  if (ctl){ x.save(); x.globalCompositeOperation = "destination-out"; x.beginPath(); x.arc(ctl.x + ctl.w / 2, ctl.y + ctl.h / 2, ctl.w / 2 + 12, 0, 7); x.fill(); x.restore(); }
  var ms = performance.now() - t0;
  FROST_STATS[(G.W + "x" + G.H) + "@" + s] = { segments: segs, ms: Math.round(ms * 10) / 10, px: cv.width + "×" + cv.height };
  return { canvas: cv, E: E, segs: segs, ms: ms };
}
function frost(G, s, o){
  o = o || {};
  var key = G.W + "x" + G.H + "@" + s + (o.drip ? "d" : "") + (o.seed || "");
  if (!FROST_CACHE[key]){ var r = frostPaint(G, s, o); FROST_CACHE[key] = { url: r.canvas.toDataURL("image/png"), E: r.E }; }
  var F = FROST_CACHE[key], E = F.E, f = G.free, out = '<image href="' + F.url + '" x="' + r1(E.x0) + '" y="' + r1(E.T) + '" width="' + r1(E.w) + '" height="' + r1(E.h) + '"/>';
  if (o.breath) out += '<ellipse cx="' + r1(o.breath[0]) + '" cy="' + r1(o.breath[1]) + '" rx="54" ry="46" fill="#fff" fill-opacity=".9" stroke="#D6E2F8" stroke-width="10" stroke-opacity=".85"/>';
  if (o.env){ out += '<path class="frBound" d="M' + r1(f.contentRight + 28) + ',' + r1(E.T + 30) + ' V' + r1(E.T + .64 * G.clock.h) + (f.vTop >= 20 ? ' M' + r1(E.Rx - .42 * G.clock.w) + ',' + r1(f.contentTop - 28) + ' H' + r1(f.contentRight + 28) : '') + '"/>'; }
  return out;
}

/* ===== 5 · the frozen sea =====
   The water band (from the dune's foot to the screen's bottom) becomes sheet ice: a pale sheet, a white snow-
   dusted rim along the shore, long sheen streaks, crack lines, frozen bubbles and dusting. Freeze-in grows shore
   ice and pancakes into a sheet; break-up opens dark leads and tilts slabs. stage: "in1".."in3", "full", "break". */
function iceBand(G, stage, seed){
  var Rn = rng(seed || 23), W = G.W, wy = G.waves.y + 84 * G.waves.h / 120 - 2, H = G.H, x0 = G.dock ? G.dock.x + G.dock.w + 2 : 0;
  var s = "", id = "ic" + (UID++), sheet = "", cover = stage === "in1" ? .22 : stage === "in2" ? .55 : stage === "in3" ? .85 : 1;
  /* the ice: from both ends (the dock's side and the right edge) inward; full = the whole band */
  var gapC = W * .55, gapW = (1 - cover) * (W - x0);
  function sheetPath(xa, xb){ var p = "M" + r1(xa) + "," + r1(wy + 1), xx;
    for (xx = xa; xx <= xb; xx += 24) p += " L" + r1(xx) + "," + r1(wy + 1 + Rn() * 1.5);
    p += " L" + r1(xb) + "," + r1(wy + 1);
    if (xb < W - 1){ for (var yy = wy; yy <= H; yy += 6) p += " L" + r1(xb + (Rn() - .5) * 8) + "," + r1(yy); } else p += " L" + r1(xb) + "," + H;
    p += " L" + r1(xa) + "," + H + " Z"; return p; }
  var segs = cover >= 1 && stage !== "break" ? [[x0 - 40, W]] : stage === "break" ? [[x0 - 40, W * .3], [W * .33, W * .52], [W * .555, W * .74], [W * .765, W]] : [[x0 - 40, gapC - gapW / 2], [gapC + gapW / 2, W]];
  s += '<rect x="' + r1(x0) + '" y="' + r1(wy) + '" width="' + r1(W - x0) + '" height="' + r1(H - wy) + '" fill="#8FE5DC" opacity="' + (stage === "full" ? 0 : 0) + '"/>';
  segs.forEach(function(sg, i){
    if (sg[1] - sg[0] < 4) return;
    var tilt = stage === "break" && i % 2 ? ' transform="rotate(' + (i % 4 === 1 ? -2.2 : 1.6) + ' ' + r1((sg[0] + sg[1]) / 2) + ' ' + r1(wy + 8) + ')"' : '';
    sheet += '<path' + tilt + ' fill="#E6EFFB" stroke="#4C7BD9" stroke-opacity=".55" stroke-width="1.2" d="' + sheetPath(sg[0], sg[1]) + '"/>';
  });
  if (stage === "break") segs.forEach(function(sg, i){ if (i) s += '<path fill="#5FCBC4" d="M' + r1(segs[i - 1][1] - 2) + ',' + r1(wy + 1) + ' L' + r1(sg[0] + 2) + ',' + r1(wy + 1) + ' L' + r1(sg[0] + 8) + ',' + H + ' L' + r1(segs[i - 1][1] - 6) + ',' + H + ' Z"/>'; });
  if (stage !== "full" && stage !== "break"){   // open water between: pancakes forming on it
    var gx0 = gapC - gapW / 2, gx1 = gapC + gapW / 2;
    s += '<rect x="' + r1(gx0) + '" y="' + r1(wy + 1) + '" width="' + r1(gx1 - gx0) + '" height="' + r1(H - wy) + '" fill="#9DE6DF" opacity=".55"/>';
    for (var pk = gx0 + 12; pk < gx1 - 12; pk += 22 + Rn() * 30){ var pr = 5 + Rn() * 7; s += '<ellipse cx="' + r1(pk) + '" cy="' + r1(wy + 6 + Rn() * (H - wy - 14)) + '" rx="' + r1(pr) + '" ry="' + r1(pr * .32) + '" fill="#EEF3FE" stroke="#4C7BD9" stroke-opacity=".5" stroke-width="1"/>'; }
  }
  s += sheet;
  /* the sheet's surface: a snowy shore rim, sheen streaks, cracks, frozen bubbles, dusting (clipped to the ice) */
  var clip = '<clipPath id="' + id + '">' + segs.map(function(sg){ return sg[1] - sg[0] < 4 ? "" : '<rect x="' + r1(sg[0]) + '" y="' + r1(wy) + '" width="' + r1(sg[1] - sg[0]) + '" height="' + r1(H - wy) + '"/>'; }).join("") + '</clipPath>';
  var surf = '<path fill="#fff" d="M' + r1(x0 - 40) + ',' + r1(wy) + ' ';
  for (var xr = x0 - 40; xr <= W; xr += 14) surf += 'L' + r1(xr) + ',' + r1(wy + 3 + Rn() * 3.2) + ' ';
  surf += 'L' + W + ',' + r1(wy) + ' Z"/>';
  for (var sk = 0; sk < W / 140; sk++){ var sx = x0 + Rn() * (W - x0), sl = 60 + Rn() * 140, sy = wy + 6 + Rn() * (H - wy - 10);
    surf += '<path d="M' + r1(sx) + ',' + r1(sy) + ' l' + r1(sl) + ',' + r1(-2.4) + '" stroke="#fff" stroke-width="' + r1(1.4 + Rn() * 1.6) + '" stroke-linecap="round" opacity=".85"/>'; }
  for (var ck = 0; ck < W / 260; ck++){ var cx = x0 + Rn() * (W - x0), cy = wy + 4, d = "M" + r1(cx) + "," + r1(cy);
    while (cy < H){ cx += (Rn() - .5) * 22; cy += 4 + Rn() * 6; d += " L" + r1(cx) + "," + r1(cy); if (Rn() < .25) d += " M" + r1(cx) + "," + r1(cy) + " l" + r1((Rn() - .5) * 26) + "," + r1(3 + Rn() * 6) + " M" + r1(cx) + "," + r1(cy); }
    surf += '<path d="' + d + '" fill="none" stroke="#4C7BD9" stroke-opacity=".7" stroke-width="1" stroke-linejoin="round"/>'; }
  for (var bb = 0; bb < W / 90; bb++) surf += '<ellipse cx="' + r1(x0 + Rn() * (W - x0)) + '" cy="' + r1(wy + 8 + Rn() * (H - wy - 12)) + '" rx="' + r1(1.2 + Rn() * 1.8) + '" ry="' + r1(.8 + Rn() * 1) + '" fill="#fff" stroke="#9FB8E8" stroke-width=".6"/>';
  for (var du = 0; du < W / 200; du++){ var dx = x0 + Rn() * (W - x0), dw = 30 + Rn() * 80; surf += '<path fill="#fff" d="M' + r1(dx) + ',' + r1(H - 2) + ' q' + r1(dw * .3) + ',' + r1(-7 - Rn() * 5) + ' ' + r1(dw) + ',0 Z" opacity=".9"/>'; }
  return clip + s + '<g clip-path="url(#' + id + ')">' + surf + '</g>';
}
/* the boat frozen in: level, an ice collar at the hull, rime on the stay, the mast and the sails' edges, icicles */
function boatFrozen(o){
  o = o || {};
  return boatBase() + (o.lamp ? lantern(o.lamp) : "") + '<path class="btHull" d="M5,26.8 L37,25 Q34.6,31 29.5,34.8 L11.5,34.8 Q7,33 5,26.8 Z"/><path class="btStripe" d="M7.2,29 L34.4,28.2"/>' +
    '<path d="M20.6,4 L35.6,24.6 M20,3 V23" stroke="#fff" stroke-width=".9" stroke-linecap="round" stroke-dasharray="1.6 1.2"/><path d="M8.5,23.5 Q12,13 20,4" fill="none" stroke="#fff" stroke-width="1.1"/>' +
    '<path class="wnDeck" d="M6.2,26.5 L36.4,24.9"/><path fill="#F4F8FF" stroke="#4C7BD9" stroke-width=".5" d="M12,29.6 l.7,3 l.7,-3 Z M18,29.4 l.6,2.4 l.6,-2.4 Z M26,29 l.7,3.4 l.7,-3.4 Z"/>' +
    '<path fill="#fff" stroke="#4C7BD9" stroke-width=".55" stroke-opacity=".7" d="M1,32 L5,29.8 L8,31.4 L11,29.6 L15,31.6 L22,30.2 L28,31.8 L33,29.4 L37,31 L41,29.8 L43,32.4 L43,36 L1,36 Z"/>' + (o.gull !== false ? gull() : "");
}

/* ===== 6 · the serpent, redrawn: one continuous body moving as a traveling wave =====
   The body is a centerline sampled every 2 px from the head (s = 0) to the tail (s = L), offset by a thickness
   profile into ONE filled outline: a head that swells to a jaw and narrows to a neck, a body of even weight, a
   tail that tapers to a point with a small fin. Its shape over time is
     y(s, t) = waterline + Dw(xworld) + Dhead(s) − A(s) · sin(2π (s/λ + f t))
   with the head swimming left at a steady v. The wave runs back along the body (head to tail) at λf, slower than
   v, so each coil rises out of the water behind the neck, slides back along the body and sinks in again near the
   tail. Dw is the sea's depth along the lane: deep at the entry and exit (so the serpent arrives and leaves by
   slithering up and down a slope, never by appearing) and deep again mid-pass for the dive. Everything under the
   waterline is clipped; where the outline crosses the waterline there is a ripple. */
var SERP = { L: 164, lam: 64, f: .5, A: 15, v: 84 };
function serpPassDepth(x, W){   // the sea's depth along the lane (px below the surface for the body's center)
  function ramp(a, b, xx){ var t = Math.max(0, Math.min(1, (xx - a) / (b - a))); return t * t * (3 - 2 * t); }
  var d = 4;
  d += 40 * ramp(W * .70, W * .80, x);           // the entry: up out of the deep
  d += 40 * (1 - ramp(W * .14, W * .24, x));     // the exit: down into the deep
  d += 34 * Math.max(0, 1 - Math.abs(x - W * .46) / (W * .045)) ;   // the mid-pass dive
  return d;
}
function serpentGeom(t, o){
  o = o || {};
  var L = o.L || SERP.L, W = o.W || 1920, wl = o.wl, xh = o.xh != null ? o.xh : W + 30 - SERP.v * t, lift = o.lift || 0;
  var pts = [];
  for (var s = 0; s <= L; s += 2){
    var x = xh + s, A = SERP.A * Math.min(1, Math.max(0, (s - 14) / 22)) * (1 - .45 * Math.max(0, (s - L * .7) / (L * .3)));
    var headUp = s < 30 ? (13 + lift) * Math.pow(1 - s / 30, 1.5) : 0;
    var depthW = o.depth ? o.depth(x) : serpPassDepth(x - s * .55, W);   // the body lags its head down the slope
    var y = wl + depthW - headUp - A * Math.sin(2 * Math.PI * (s / SERP.lam + SERP.f * t)) + (s < 18 ? 1.2 * Math.sin(2 * Math.PI * SERP.f * t) : 0);
    pts.push([x, y, s]);
  }
  return pts;
}
function serpentThick(s, L){
  if (s < 2) return 3.2; if (s < 7) return 3.2 + (s - 2) * 1.4; if (s < 12) return 10.2 + (s - 7) * .1; if (s < 20) return 10.7 - (s - 12) * .4;
  if (s < L * .72) return 7.4 + .5 * Math.sin(s / 9); return Math.max(.9, 7.4 * (1 - (s - L * .72) / (L * .28)));
}
function serpentDraw(t, o){
  o = o || {};
  var pts = serpentGeom(t, o), L = o.L || SERP.L, wl = o.wl, top = [], bot = [], n = pts.length;
  for (var i = 0; i < n; i++){
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1, nx = ty / len, ny = -tx / len;
    var w = serpentThick(pts[i][2], L) / 2;
    if (ny > 0){ nx = -nx; ny = -ny; }   // the normal that points up
    top.push([pts[i][0] + nx * w, pts[i][1] + ny * w, nx, ny]); bot.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  var d = "M" + P2(top[0]);
  for (i = 1; i < n; i++) d += " L" + P2(top[i]);
  for (i = n - 1; i >= 0; i--) d += " L" + P2(bot[i]);
  d += " Z";
  var id = "sc" + (UID++), body = '<path class="navy" d="' + d + '"/>';
  /* the head's horn and the back's spines (along the top line, moving with the body) */
  var h = top[5]; body += '<path class="navy" d="M' + P2([top[4][0], top[4][1]]) + ' L' + P2([top[9][0] + top[9][2] * 7 + 4, top[9][1] + top[9][3] * 7]) + ' L' + P2([top[8][0], top[8][1]]) + ' Z"/>';
  for (i = 16; i < n - 18; i += 6){ var p = top[i], q = top[i + 1]; if (p[3] > -.8) continue; body += '<path class="navy" d="M' + P2(p) + ' L' + P2([(p[0] + q[0]) / 2 + p[2] * 3.2 + 1.6, (p[1] + q[1]) / 2 + p[3] * 3.2]) + ' L' + P2(q) + ' Z"/>'; }
  /* the tail's fin */
  var tl = pts[n - 1], tp = top[n - 3]; body += '<path class="navy" d="M' + P2([tl[0], tl[1]]) + ' L' + P2([tl[0] + 5, tl[1] - 6]) + ' L' + P2([tp[0] - 1, tp[1]]) + ' Z"/>';
  /* the face: a paleturq eye in the front third of the head, the mouth along the jaw */
  var e = pts[3], e2 = pts[1];
  body += '<circle class="ssEye" cx="' + r1(e[0] + top[3][2] * 2.2) + '" cy="' + r1(e[1] + top[3][3] * 2.2) + '" r="1.8"/>';
  body += '<path class="ssMouth" d="M' + P2([pts[0][0] - .5, pts[0][1] + .6]) + ' Q' + P2([pts[3][0], pts[3][1] + 1.6]) + ' ' + P2([pts[6][0], pts[6][1] + 1.2]) + '"/>';
  if (o.scarf) body += serpScarf(pts, top, 13);
  if (o.pail) body += serpPail(pts, top);
  var under = o.ice ? "" : "";
  var out = '<clipPath id="' + id + '"><rect x="-500" y="-500" width="5000" height="' + (wl + 500) + '"/></clipPath>';
  if (o.ice) out += serpIceHoles(pts, wl, o);
  out += '<g clip-path="url(#' + id + ')">' + body + '</g>';
  /* ripples where the body breaks the surface, and a splash at the head when it is just breaking */
  var prev = null;
  pts.forEach(function(p, j){ var above = top[j][1] < wl - .5; if (prev !== null && above !== prev) out += '<path class="ring" style="stroke-width:1.3" d="M' + r1(p[0] - 6) + ',' + r1(wl + .8) + ' Q' + r1(p[0]) + ',' + r1(wl + 2.6) + ' ' + r1(p[0] + 6) + ',' + r1(wl + .8) + '"/>'; prev = above; });
  if (top[2][1] < wl + 1 && top[2][1] > wl - 5) out += '<g class="puff"><circle cx="' + r1(pts[2][0] - 4) + '" cy="' + r1(wl - 4) + '" r="1.2"/><circle cx="' + r1(pts[2][0] - 1) + '" cy="' + r1(wl - 7) + '" r=".9"/><circle cx="' + r1(pts[2][0] + 3) + '" cy="' + r1(wl - 5) + '" r="1"/></g>';
  return out;
}
function serpScarf(pts, top, si){   // the sargassum scarf, wrapped at the neck and streaming back along the body
  var i = Math.round(si / 2), p = pts[i], q = pts[i + 4], s = '<g class="wnSerpScarf">';
  s += '<path class="sarg" d="M' + P2([top[i - 1][0], top[i - 1][1] - 1]) + ' L' + P2([top[i + 2][0], top[i + 2][1] - 1]) + ' L' + P2([pts[i + 2][0], pts[i + 2][1] + 4.6]) + ' L' + P2([pts[i - 1][0], pts[i - 1][1] + 4.6]) + ' Z"/>';
  s += '<path class="sarg" d="M' + P2([top[i + 1][0], top[i + 1][1]]) + ' C' + P2([q[0] + 6, q[1] - 9]) + ' ' + P2([q[0] + 14, q[1] - 6]) + ' ' + P2([q[0] + 20, q[1] - 10]) + ' L' + P2([q[0] + 18, q[1] - 5]) + ' C' + P2([q[0] + 12, q[1] - 2]) + ' ' + P2([q[0] + 6, q[1] - 4]) + ' ' + P2([pts[i + 2][0], pts[i + 2][1]]) + ' Z"/>';
  s += '<path class="sargD" d="M' + P2([q[0] + 20, q[1] - 10]) + ' l4,-2 l-2,4 Z"/><circle class="sargB" cx="' + r1(p[0] + 1) + '" cy="' + r1(p[1] + 1) + '" r="1.3"/><circle class="sargB" cx="' + r1(q[0] + 10) + '" cy="' + r1(q[1] - 6) + '" r="1.2"/>';
  return s + '</g>';
}
function serpPail(pts, top){
  var p = top[6], a = Math.atan2(pts[8][1] - pts[3][1], pts[8][0] - pts[3][0]) * 180 / Math.PI;
  return '<g transform="translate(' + r1(p[0]) + ' ' + r1(p[1] + .5) + ') rotate(' + r1(a - 8) + ') scale(.42)"><path class="pail" d="M-16,0 L16,0 L12,-21 L-12,-21 Z"/><path class="pailRim" d="M-17,-1 L17,-1 L17,3.4 L-17,3.4 Z"/><path class="pailStar" d="M3,-13 l1.6,3.4 3.6,.4 -2.7,2.4 .8,3.6 -3.3,-1.9 -3.3,1.9 .8,-3.6 -2.7,-2.4 3.6,-.4 Z"/></g>';
}
function serpIceHoles(pts, wl, o){   // on the frozen sea: each span that breaks the surface punches a hole, with tilted shards at its ends
  var s = "", run = null, Rn = rng(31);
  pts.forEach(function(p, j){ var up = p[1] - serpentThick(p[2], SERP.L) / 2 < wl; if (up && !run) run = [p[0], p[0]]; if (up) run[1] = p[0]; if ((!up || j === pts.length - 1) && run){
    var a = run[0] - 7, b = run[1] + 7; s += '<path fill="#5FCBC4" stroke="#4C7BD9" stroke-width="1" stroke-opacity=".7" d="M' + r1(a) + ',' + r1(wl) + ' L' + r1(a + 3) + ',' + r1(wl + 4) + ' L' + r1(b - 3) + ',' + r1(wl + 4.5) + ' L' + r1(b) + ',' + r1(wl) + ' Z"/>';
    s += '<path fill="#F4F8FF" stroke="#4C7BD9" stroke-width=".8" d="M' + r1(a - 1) + ',' + r1(wl) + ' l-3,-4.5 l5,1.5 Z M' + r1(b + 1) + ',' + r1(wl) + ' l3.5,-5 l.8,4.6 Z"/>'; run = null; } });
  return s;
}
/* the sea strip for the frame studies (the board's dune and water at 1080p, the far lane's waterline) */
function laneStrip(w, h, ice){ return '<svg viewBox="0 0 1920 120" width="' + w + '" height="' + h + '" preserveAspectRatio="none" style="position:absolute;left:0;top:0">' +
  '<path fill="#E6D5B8" d="M0,55 C240,25 480,85 720,55 C960,25 1200,85 1440,55 C1680,25 1820,70 1920,50 L1920,120 L0,120 Z"/><rect y="84" width="1920" height="36" fill="' + (ice ? "#E6EFFB" : "#BFEFEA") + '"/>' + (ice ? '<rect y="84" width="1920" height="3" fill="#fff"/>' : '<rect y="104" width="1920" height="16" fill="#8FE5DC"/>') + '</svg>'; }
