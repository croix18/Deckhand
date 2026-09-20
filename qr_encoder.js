/* Deckhand QR encoder — byte mode, EC level L, versions 1-10.
   Self-contained (no deps); returns a 2D array of 0/1, or null if the
   text is too long. Written for inlining into Deckhand_v6.html. */

function qrMatrix(text){
  // ---- UTF-8 bytes ----
  var bytes = [];
  for (var i = 0; i < text.length; i++){
    var cp = text.codePointAt(i);
    if (cp > 0xFFFF) i++;                       // surrogate pair consumed
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800){
      bytes.push(0xC0 | (cp >> 6), 0x80 | (cp & 63));
    } else if (cp < 0x10000){
      bytes.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    } else {
      bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63),
                 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
  }

  // ---- version tables (EC level L, versions 1-10) ----
  // [total codewords, ec per block, group1 count, group1 data, group2 count, group2 data]
  var TABLE = [
    null,
    [26, 7, 1, 19, 0, 0],
    [44, 10, 1, 34, 0, 0],
    [70, 15, 1, 55, 0, 0],
    [100, 20, 1, 80, 0, 0],
    [134, 26, 1, 108, 0, 0],
    [172, 18, 2, 68, 0, 0],
    [196, 20, 2, 78, 0, 0],
    [242, 24, 2, 97, 0, 0],
    [292, 30, 2, 116, 0, 0],
    [346, 18, 2, 68, 2, 69]
  ];
  var ALIGN = [null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
               [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

  var version = 0;
  for (var v = 1; v <= 10; v++){
    var t = TABLE[v];
    var dataCW = t[2] * t[3] + t[4] * t[5];
    var countBits = v <= 9 ? 8 : 16;
    var need = 4 + countBits + bytes.length * 8;         // mode + count + data
    if (need <= dataCW * 8){ version = v; break; }
  }
  if (!version) return null;

  var T = TABLE[version];
  var totalCW = T[0], ecPerBlock = T[1];
  var dataCW = T[2] * T[3] + T[4] * T[5];
  var cntBits = version <= 9 ? 8 : 16;

  // ---- bit stream: mode 0100, count, data, terminator, pads ----
  var bits = [];
  function push(val, len){
    for (var b = len - 1; b >= 0; b--) bits.push((val >> b) & 1);
  }
  push(4, 4);
  push(bytes.length, cntBits);
  bytes.forEach(function(by){ push(by, 8); });
  var cap = dataCW * 8;
  push(0, Math.min(4, cap - bits.length));               // terminator
  while (bits.length % 8) bits.push(0);
  var cw = [];
  for (var c = 0; c < bits.length; c += 8){
    var val = 0;
    for (var b = 0; b < 8; b++) val = (val << 1) | bits[c + b];
    cw.push(val);
  }
  var padToggle = true;
  while (cw.length < dataCW){ cw.push(padToggle ? 0xEC : 0x11); padToggle = !padToggle; }

  // ---- GF(256), poly 0x11D ----
  var EXP = new Array(512), LOG = new Array(256);
  var x = 1;
  for (var e = 0; e < 255; e++){
    EXP[e] = x; LOG[x] = e;
    x <<= 1; if (x & 0x100) x ^= 0x11D;
  }
  for (e = 255; e < 512; e++) EXP[e] = EXP[e - 255];
  function rsGenerator(deg){
    var g = [1];
    for (var d = 0; d < deg; d++){
      var ng = new Array(g.length + 1).fill(0);
      for (var gi = 0; gi < g.length; gi++){
        ng[gi] ^= g[gi];                                       // g * x
        ng[gi + 1] ^= g[gi] === 0 ? 0 : EXP[(LOG[g[gi]] + d) % 255];  // g * a^d
      }
      g = ng;
    }
    return g;                                            // highest degree first
  }
  function rsEC(data, deg){
    var gen = rsGenerator(deg);
    var rem = data.slice().concat(new Array(deg).fill(0));
    for (var d = 0; d < data.length; d++){
      var coef = rem[d];
      if (coef === 0) continue;
      var lc = LOG[coef];
      for (var gi = 1; gi < gen.length; gi++){
        if (gen[gi] !== 0) rem[d + gi] ^= EXP[(LOG[gen[gi]] + lc) % 255];
      }
    }
    return rem.slice(data.length);
  }

  // ---- split into blocks, compute EC, interleave ----
  var blocks = [], ecBlocks = [], pos = 0, bi;
  for (bi = 0; bi < T[2]; bi++){ blocks.push(cw.slice(pos, pos + T[3])); pos += T[3]; }
  for (bi = 0; bi < T[4]; bi++){ blocks.push(cw.slice(pos, pos + T[5])); pos += T[5]; }
  blocks.forEach(function(bl){ ecBlocks.push(rsEC(bl, ecPerBlock)); });
  var seq = [];
  var maxData = Math.max(T[3], T[5]);
  for (var di = 0; di < maxData; di++){
    blocks.forEach(function(bl){ if (di < bl.length) seq.push(bl[di]); });
  }
  for (di = 0; di < ecPerBlock; di++){
    ecBlocks.forEach(function(bl){ seq.push(bl[di]); });
  }

  // ---- matrix ----
  var size = 17 + version * 4;
  var M = [], F = [];                                    // modules, function-pattern flags
  for (var r = 0; r < size; r++){ M.push(new Array(size).fill(0)); F.push(new Array(size).fill(false)); }
  function setF(r, c, val){ M[r][c] = val; F[r][c] = true; }
  function finder(r, c){
    for (var dr = -1; dr <= 7; dr++){
      for (var dc = -1; dc <= 7; dc++){
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        var on = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
                 (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
                  (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setF(rr, cc, on ? 1 : 0);
      }
    }
  }
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  // timing
  for (var tt = 8; tt < size - 8; tt++){
    if (!F[6][tt]) setF(6, tt, tt % 2 === 0 ? 1 : 0);
    if (!F[tt][6]) setF(tt, 6, tt % 2 === 0 ? 1 : 0);
  }
  // alignment
  var ap = ALIGN[version];
  ap.forEach(function(ar){
    ap.forEach(function(ac){
      /* skip only the three FINDER corners — alignment patterns that sit
         on a timing line (v7+) are legal and overwrite it */
      var nearFinder = (ar <= 8 && ac <= 8) ||
                       (ar <= 8 && ac >= size - 9) ||
                       (ar >= size - 9 && ac <= 8);
      if (nearFinder) return;
      for (var dr = -2; dr <= 2; dr++){
        for (var dc = -2; dc <= 2; dc++){
          var on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setF(ar + dr, ac + dc, on ? 1 : 0);
        }
      }
    });
  });
  // dark module + format info areas reserved
  setF(size - 8, 8, 1);
  for (var fi = 0; fi <= 8; fi++){
    if (!F[8][fi]) setF(8, fi, 0);
    if (!F[fi][8]) setF(fi, 8, 0);
    if (fi < 8){
      if (!F[8][size - 1 - fi]) setF(8, size - 1 - fi, 0);
      if (!F[size - 1 - fi][8]) setF(size - 1 - fi, 8, 0);
    }
  }
  // version info (v7+)
  if (version >= 7){
    var vinfo = version << 12;
    var vrem = version << 12;
    for (var vb = 17; vb >= 12; vb--){
      if (vrem & (1 << vb)) vrem ^= 0x1F25 << (vb - 12);
    }
    vinfo |= vrem;
    for (var vi = 0; vi < 18; vi++){
      var bit = (vinfo >> vi) & 1;
      setF(Math.floor(vi / 3), size - 11 + (vi % 3), bit);
      setF(size - 11 + (vi % 3), Math.floor(vi / 3), bit);
    }
  }
  // data placement: zigzag from bottom-right, skipping column 6
  var bitIdx = 0;
  var totalBits = seq.length * 8;
  function dataBit(i){
    if (i >= totalBits) return 0;                        // remainder bits
    return (seq[i >> 3] >> (7 - (i & 7))) & 1;
  }
  var col = size - 1, up = true;
  while (col > 0){
    if (col === 6) col--;
    for (var step = 0; step < size; step++){
      var row = up ? size - 1 - step : step;
      for (var side = 0; side < 2; side++){
        var cc2 = col - side;
        if (!F[row][cc2]){
          M[row][cc2] = dataBit(bitIdx++);
        }
      }
    }
    up = !up;
    col -= 2;
  }
  // mask 0: (r+c) % 2 === 0
  for (r = 0; r < size; r++){
    for (var c2 = 0; c2 < size; c2++){
      if (!F[r][c2] && (r + c2) % 2 === 0) M[r][c2] ^= 1;
    }
  }
  // format info: EC L (01) + mask 000 -> BCH(15,5), XOR 0x5412
  var fmt = (1 << 3) | 0;                                // L=01, mask=000 -> 01000
  var fval = fmt << 10;
  for (var fb = 14; fb >= 10; fb--){
    if (fval & (1 << fb)) fval ^= 0x537 << (fb - 10);
  }
  var format = ((fmt << 10) | fval) ^ 0x5412;
  // MSB (bit 14) first along each placement path
  var FMT1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
              [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  for (fi = 0; fi < 15; fi++){
    var fbit = (format >> (14 - fi)) & 1;
    M[FMT1[fi][0]][FMT1[fi][1]] = fbit;                  // copy 1: around top-left finder
    if (fi < 7) M[size - 1 - fi][8] = fbit;              // copy 2: up the bottom-left column,
    else M[8][size - 15 + fi] = fbit;                    // then across the top-right row
  }
  M[size - 8][8] = 1;                                    // dark module stays dark
  return M;
}

if (typeof module !== "undefined") module.exports = qrMatrix;
