// Algoritmo DDA para trazar una línea entre dos puntos.
// Calcula los pasos según el mayor incremento y redondea cada punto.
function dda(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const pasos = Math.max(Math.abs(dx), Math.abs(dy));
  if (pasos === 0) return [{ x: x1, y: y1 }];
  const xInc = dx / pasos, yInc = dy / pasos;
  const pts = [];
  let x = x1, y = y1;
  for (let i = 0; i <= pasos; i++) {
    pts.push({ x: Math.round(x), y: Math.round(y) });
    x += xInc; y += yInc;
  }
  return pts;
}

// Triángulo relleno: se trazan los tres lados con DDA y, por cada fila (y),
// se rellena desde el punto más a la izquierda hasta el más a la derecha del contorno.
function triangulo(A, B, C) {
  const lados = {
    AB: dda(A.x, A.y, B.x, B.y),
    BC: dda(B.x, B.y, C.x, C.y),
    CA: dda(C.x, C.y, A.x, A.y),
  };

  const filas = new Map();
  const contorno = new Set();
  for (const pts of Object.values(lados)) {
    for (const p of pts) {
      contorno.add(p.x + "," + p.y);
      const f = filas.get(p.y);
      if (!f) filas.set(p.y, { min: p.x, max: p.x });
      else { f.min = Math.min(f.min, p.x); f.max = Math.max(f.max, p.x); }
    }
  }

  const relleno = [...filas.entries()]
    .map(([y, v]) => ({ y, x1: v.min, x2: v.max }))
    .sort((a, b) => a.y - b.y);

  let pixeles = 0;
  for (const f of relleno) pixeles += f.x2 - f.x1 + 1;

  const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  return { lados, relleno, contorno: contorno.size, pixeles, area };
}

// ---------- Plano ----------
const canvas = document.getElementById("lienzo");
const ctx = canvas.getContext("2d");
const estado = { escala: 6, ox: 0, oy: 0, figura: null };

function aPantalla(x, y) { return [estado.ox + x * estado.escala, estado.oy - y * estado.escala]; }
function aMundo(px, py) { return [(px - estado.ox) / estado.escala, (estado.oy - py) / estado.escala]; }

function ajustarCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  centrar();
}

function centrar() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  let cx = 50, cy = 50, tam = 60;
  if (estado.figura) {
    const xs = [estado.figura.A.x, estado.figura.B.x, estado.figura.C.x];
    const ys = [estado.figura.A.y, estado.figura.B.y, estado.figura.C.y];
    cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    tam = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 20);
  }
  estado.escala = Math.min(w, h) / (tam * 1.3);
  estado.ox = w / 2 - cx * estado.escala;
  estado.oy = h / 2 + cy * estado.escala;
  dibujar();
}

function dibujarRejilla(w, h) {
  const paso = estado.escala >= 4 ? 10 : 50;
  const [xmin, ymax] = aMundo(0, 0);
  const [xmax, ymin] = aMundo(w, h);
  ctx.font = "10px monospace";
  for (let x = Math.floor(xmin / paso) * paso; x <= xmax; x += paso) {
    const [px] = aPantalla(x, 0);
    ctx.strokeStyle = x === 0 ? "rgba(255,140,60,0.6)" : "rgba(61,40,96,0.6)";
    ctx.lineWidth = x === 0 ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    if (x !== 0) { ctx.fillStyle = "#9b82c0"; ctx.fillText(x, px + 3, Math.min(Math.max(estado.oy, 12), h - 6)); }
  }
  for (let y = Math.floor(ymin / paso) * paso; y <= ymax; y += paso) {
    const [, py] = aPantalla(0, y);
    ctx.strokeStyle = y === 0 ? "rgba(255,140,60,0.6)" : "rgba(61,40,96,0.6)";
    ctx.lineWidth = y === 0 ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    if (y !== 0) { ctx.fillStyle = "#9b82c0"; ctx.fillText(y, Math.min(Math.max(estado.ox, 4), w - 30), py - 3); }
  }
}

function dibujar() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.fillStyle = "#140e1a";
  ctx.fillRect(0, 0, w, h);
  dibujarRejilla(w, h);
  const f = estado.figura;
  if (!f) return;

  const s = estado.escala;

  // 1. Relleno por scanline
  ctx.fillStyle = "rgba(224, 64, 251, 0.28)";
  for (const fila of f.relleno) {
    const [px, py] = aPantalla(fila.x1, fila.y);
    ctx.fillRect(px - s / 2, py - s / 2, (fila.x2 - fila.x1) * s + s, s);
  }

  // 2. Trazado continuo de los lados (líneas continuas con resplandor)
  const [pAx, pAy] = aPantalla(f.A.x, f.A.y);
  const [pBx, pBy] = aPantalla(f.B.x, f.B.y);
  const [pCx, pCy] = aPantalla(f.C.x, f.C.y);

  const segmentos = [
    { p1: [pAx, pAy], p2: [pBx, pBy], color: "#e040fb" },
    { p1: [pBx, pBy], p2: [pCx, pCy], color: "#ff9e2c" },
    { p1: [pCx, pCy], p2: [pAx, pAy], color: "#ffd166" }
  ];

  ctx.save();
  ctx.lineWidth = 1.6;
  for (const seg of segmentos) {
    ctx.strokeStyle = seg.color;
    ctx.shadowColor = seg.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(seg.p1[0], seg.p1[1]);
    ctx.lineTo(seg.p2[0], seg.p2[1]);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Puntos calculados con DDA (píxeles rasterizados del borde)
  const colores = { AB: "#e040fb", BC: "#ff9e2c", CA: "#ffd166" };
  const sq = Math.max(s > 3 ? s - 0.8 : s, 2);

  for (const [nombre, pts] of Object.entries(f.lados)) {
    ctx.fillStyle = colores[nombre];
    for (const p of pts) {
      const [px, py] = aPantalla(p.x, p.y);
      ctx.fillRect(px - sq / 2, py - sq / 2, sq, sq);
    }
  }

  // 4. Vértices principales con halo y etiquetas nítidas
  const vertices = [
    { nombre: "A", v: f.A, color: "#e040fb" },
    { nombre: "B", v: f.B, color: "#ff9e2c" },
    { nombre: "C", v: f.C, color: "#ffd166" }
  ];

  for (const { nombre, v, color } of vertices) {
    const [px, py] = aPantalla(v.x, v.y);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = "bold 13px Arial";
    ctx.fillStyle = "#140e1a";
    ctx.strokeStyle = "#140e1a";
    ctx.lineWidth = 3;
    ctx.strokeText(`${nombre}(${v.x}, ${v.y})`, px + 9, py - 7);
    ctx.fillStyle = "#f0deff";
    ctx.fillText(`${nombre}(${v.x}, ${v.y})`, px + 9, py - 7);
    ctx.restore();
  }
}

// ---------- Interacción ----------
let arrastrando = false, ultimo = null;
const cursor = { px: -1, py: -1, visible: false };

function dibujarCursor(mx, my, px, py) {
  const w = canvas.clientWidth, h = canvas.clientHeight;

  ctx.save();
  // Líneas guía (crosshair)
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(255, 200, 80, 0.45)";
  ctx.beginPath();
  ctx.moveTo(px, 0); ctx.lineTo(px, h);
  ctx.moveTo(0, py); ctx.lineTo(w, py);
  ctx.stroke();
  ctx.setLineDash([]);

  // Punto central del cursor
  ctx.fillStyle = "rgba(255, 200, 80, 0.9)";
  ctx.beginPath();
  ctx.arc(px, py, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Tooltip flotante con coordenadas
  const label = `(${Math.round(mx)}, ${Math.round(my)})`;
  ctx.font = "bold 12px monospace";
  const tw = ctx.measureText(label).width;
  const th = 16, pad = 6;
  let lx = px + 14, ly = py - 20;
  if (lx + tw + pad * 2 > w) lx = px - tw - pad * 2 - 10;
  if (ly - pad < 0) ly = py + 24;

  // Fondo del badge
  ctx.fillStyle = "rgba(20, 10, 30, 0.9)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(lx - pad, ly - th + 2, tw + pad * 2, th + 4, 5);
  } else {
    ctx.rect(lx - pad, ly - th + 2, tw + pad * 2, th + 4);
  }
  ctx.fill();

  // Borde del badge
  ctx.strokeStyle = "rgba(255, 180, 60, 0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Texto coordenadas
  ctx.fillStyle = "#ffe066";
  ctx.fillText(label, lx, ly);

  // Coordenadas proyectadas en los ejes
  ctx.font = "10px monospace";
  const xLabel = `${Math.round(mx)}`;
  const xLw = ctx.measureText(xLabel).width;
  ctx.fillStyle = "rgba(20, 10, 30, 0.8)";
  ctx.fillRect(px - xLw / 2 - 3, Math.min(Math.max(estado.oy, 0), h - 18), xLw + 6, 14);
  ctx.fillStyle = "rgba(255, 220, 100, 0.9)";
  ctx.fillText(xLabel, px - xLw / 2, Math.min(Math.max(estado.oy + 11, 12), h - 6));

  const yLabel = `${Math.round(my)}`;
  const yLw = ctx.measureText(yLabel).width;
  ctx.fillStyle = "rgba(20, 10, 30, 0.8)";
  ctx.fillRect(Math.min(Math.max(estado.ox - yLw - 6, 0), w - yLw - 10), py - 7, yLw + 6, 14);
  ctx.fillStyle = "rgba(255, 220, 100, 0.9)";
  ctx.fillText(yLabel, Math.min(Math.max(estado.ox - yLw - 3, 2), w - yLw - 6), py + 4);

  ctx.restore();
}

canvas.addEventListener("mouseenter", () => { cursor.visible = true; });
canvas.addEventListener("mouseleave", () => {
  cursor.visible = false;
  dibujar();
  document.getElementById("pie").textContent = "X = —   Y = —";
});
canvas.addEventListener("mousedown", e => {
  arrastrando = true;
  ultimo = [e.offsetX, e.offsetY];
});
window.addEventListener("mouseup", () => {
  arrastrando = false;
});
canvas.addEventListener("mousemove", e => {
  const [mx, my] = aMundo(e.offsetX, e.offsetY);
  document.getElementById("pie").textContent = `X = ${Math.round(mx)}   Y = ${Math.round(my)}`;
  if (arrastrando) {
    estado.ox += e.offsetX - ultimo[0];
    estado.oy += e.offsetY - ultimo[1];
    ultimo = [e.offsetX, e.offsetY];
  }
  dibujar();
  if (cursor.visible) {
    dibujarCursor(mx, my, e.offsetX, e.offsetY);
  }
});
canvas.addEventListener("wheel", e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false });

function zoom(factor, px, py) {
  const [mx, my] = aMundo(px, py);
  estado.escala = Math.min(Math.max(estado.escala * factor, 0.5), 80);
  estado.ox = px - mx * estado.escala;
  estado.oy = py + my * estado.escala;
  dibujar();
}
document.getElementById("zoomMas").onclick = () => zoom(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
document.getElementById("zoomMenos").onclick = () => zoom(1 / 1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
document.getElementById("centrar").onclick = centrar;

// ---------- Cálculo ----------
function leerVertices() {
  const ids = ["ax", "ay", "bx", "by", "cx", "cy"];
  const v = ids.map(id => parseInt(document.getElementById(id).value, 10));
  const error = document.getElementById("error");
  if (v.some(isNaN)) { error.textContent = "Escribe números enteros en los seis campos."; return null; }
  const A = { x: v[0], y: v[1] }, B = { x: v[2], y: v[3] }, C = { x: v[4], y: v[5] };
  const area2 = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
  if (area2 === 0) { error.textContent = "Los tres puntos están alineados; no forman un triángulo."; return null; }
  error.textContent = "";
  return { A, B, C };
}

function calcular() {
  const v = leerVertices();
  if (!v) return;
  const res = triangulo(v.A, v.B, v.C);
  estado.figura = { ...v, ...res };

  document.getElementById("d-ab").textContent = res.lados.AB.length;
  document.getElementById("d-bc").textContent = res.lados.BC.length;
  document.getElementById("d-ca").textContent = res.lados.CA.length;
  document.getElementById("d-borde").textContent = res.contorno;
  document.getElementById("d-filas").textContent = res.relleno.length;
  document.getElementById("d-pix").textContent = res.pixeles;
  document.getElementById("d-area").textContent = res.area;

  let html = "";
  for (const [nombre, pts] of Object.entries(res.lados)) {
    pts.forEach((p, i) => { html += `<tr><td>${nombre}</td><td>${i + 1}</td><td>${p.x}</td><td>${p.y}</td></tr>`; });
  }
  document.getElementById("tabla").innerHTML = html;
  centrar();
}

function limpiar() {
  estado.figura = null;
  ["ax","ay","bx","by","cx","cy"].forEach(id => document.getElementById(id).value = "");
  ["d-ab","d-bc","d-ca","d-borde","d-filas","d-pix","d-area"].forEach(id => document.getElementById(id).textContent = "—");
  document.getElementById("tabla").innerHTML = "";
  document.getElementById("error").textContent = "";
  dibujar();
}

document.getElementById("calcular").onclick = calcular;
document.getElementById("limpiar").onclick = limpiar;
["ax","ay","bx","by","cx","cy"].forEach(id =>
  document.getElementById(id).addEventListener("keydown", e => { if (e.key === "Enter") calcular(); }));

window.addEventListener("resize", ajustarCanvas);
ajustarCanvas();
