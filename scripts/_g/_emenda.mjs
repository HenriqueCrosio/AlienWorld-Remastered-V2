// BLOCO G · SEAMLESS BY QUILTING, shared (first written for the ground strips, `_camadas-chao-f1.mjs`, 20/10).
// The strip's last `sobra` columns and its first `sobra` columns are the SAME place once the tile repeats. Per row, the
// seam column s(y) ∈ [0, sobra): left of it the pixel comes from the end (A[P + c]), right of it from the start (A[c]);
// the seam is the minimum-error path (dynamic programming, ±1 px per row; a silhouette step costs 3000).
//   emendar(A raw RGBA, w, h, sobra) → { T raw RGBA P×h, P = w − sobra, custoTotal }
export function emendar(A, w, h, sobra) {
  const P = w - sobra;
  const custo = (y, c) => {
    const i = (y * w + P + c) * 4, j = (y * w + c) * 4;
    const ai = A[i + 3] > 0, aj = A[j + 3] > 0;
    if (!ai && !aj) return 0;
    if (ai !== aj) return 3000; // a skyline step is the worst joint there is
    return Math.abs(A[i] - A[j]) + Math.abs(A[i + 1] - A[j + 1]) + Math.abs(A[i + 2] - A[j + 2]);
  };
  // also forbid the very edges of the overlap (a seam at c = 0 would leave the end/start joint as it was)
  const borda = 3;
  const D = new Float64Array(h * sobra), V = new Int16Array(h * sobra);
  for (let c = 0; c < sobra; c++) D[c] = c < borda || c >= sobra - borda ? 1e12 : custo(0, c);
  for (let y = 1; y < h; y++) for (let c = 0; c < sobra; c++) {
    let best = 1e18, bc = c;
    for (const dc of [-1, 0, 1]) { const cc = c + dc; if (cc < 0 || cc >= sobra) continue; const v = D[(y - 1) * sobra + cc]; if (v < best) { best = v; bc = cc; } }
    D[y * sobra + c] = best + (c < borda || c >= sobra - borda ? 1e12 : custo(y, c));
    V[y * sobra + c] = bc;
  }
  let c = 0, best = 1e18;
  for (let k = 0; k < sobra; k++) if (D[(h - 1) * sobra + k] < best) { best = D[(h - 1) * sobra + k]; c = k; }
  const seam = new Int16Array(h);
  for (let y = h - 1; y >= 0; y--) { seam[y] = c; c = V[y * sobra + c]; }
  const T = Buffer.alloc(P * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < P; x++) {
    const src = x < sobra && x < seam[y] ? P + x : x;
    A.copy(T, (y * P + x) * 4, (y * w + src) * 4, (y * w + src) * 4 + 4);
  }
  return { T, P, custoTotal: Math.round(best) };
}
