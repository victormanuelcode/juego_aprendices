// Juego simple en navegador: carro + preguntas + registro/ranking con PHP
const porId = (id) => document.getElementById(id);

// Elementos principales (canvas y capas)
const lienzo = porId("game");
const contexto = lienzo.getContext("2d");

const capaInicio = porId("overlayStart");
const capaRegistro = porId("overlayRegister");
const capaPregunta = porId("overlayQuiz");
const capaFinal = porId("overlayEnd");

// Botones
const botonJugar = porId("btnStart");
const botonReiniciar = porId("btnRestart");

// Datos que se ven arriba (HUD)
const hudDistancia = porId("hudDistance");
const hudJugador = porId("hudPlayer");
const hudVelocidad = porId("hudSpeed");
const hudPuntos = porId("hudScore");
const hudAciertos = porId("hudCorrect");
const hudTiempo = porId("hudTime");

// Pantalla de preguntas
const tituloPregunta = porId("quizTitle");
const tiempoPregunta = porId("quizTime");
const textoPregunta = porId("quizQ");
const opcionesPregunta = porId("quizOpts");

// Pantalla final + ranking
const finTiempo = porId("endTime");
const finPuntos = porId("endScore");
const finAciertos = porId("endCorrect");
const finLicencia = porId("endMedal");
const tablaClasificacion = porId("leaderboard");

// Registro (nombre / ficha)
const formularioRegistro = porId("formRegister");
const registroNombre = porId("regNombre");
const registroFicha = porId("regFicha");
const registroMensaje = porId("regMsg");
const botonRegistrar = porId("btnRegister");

// Config del nivel (tiempo y distancia)
const duracionNivelSeg = 60;
const distanciaMeta = 1000;
const pista = { x: 150, y: 40, w: 600, h: 440 };

// Preguntas del nivel (cada una aparece cuando llegas a "distance")
const preguntas = [
  {
    title: "Obstáculo 1",
    q: "¿Qué es un deber básico del aprendiz en formación?",
    options: [
      "Interrumpir cuando quiera",
      "Respetar normas y participar activamente",
      "Ignorar instrucciones",
      "Usar el celular todo el tiempo",
    ],
    correctIndex: 1,
    seconds: 12,
    distance: 120,
  },
  {
    title: "Obstáculo 2",
    q: "Si hay un conflicto entre aprendices, lo adecuado es:",
    options: [
      "Exponerlo en redes",
      "Dialogar y usar canales institucionales",
      "Amenazar para “ganar”",
      "Irse sin avisar",
    ],
    correctIndex: 1,
    seconds: 12,
    distance: 240,
  },
  {
    title: "Obstáculo 3",
    q: "Un ejemplo de respeto es:",
    options: [
      "Burlarse “por chiste”",
      "Escuchar y tratar bien a todos",
      "Solo respetar al instructor",
      "Gritar para que me entiendan",
    ],
    correctIndex: 1,
    seconds: 12,
    distance: 360,
  },
  {
    title: "Obstáculo 4",
    q: "Sobre el cuidado de equipos (PC/herramientas):",
    options: [
      "Se usan sin responsabilidad",
      "Se pueden dañar y no pasa nada",
      "Se cuidan y se usan según normas y permisos",
      "Se pueden llevar sin autorización",
    ],
    correctIndex: 2,
    seconds: 12,
    distance: 480,
  },
  {
    title: "Obstáculo 5",
    q: "¿Qué acción mejora la convivencia?",
    options: [
      "Hacer rumores",
      "Ser puntual y colaborar",
      "Evitar el trabajo en equipo",
      "Responder con insultos",
    ],
    correctIndex: 1,
    seconds: 12,
    distance: 600,
  },
  {
    title: "Obstáculo 6",
    q: "El “conducto regular” sirve para:",
    options: [
      "Evitar reportar problemas",
      "Resolver situaciones de forma ordenada y justa",
      "Castigar sin escuchar",
      "Hacer perder tiempo siempre",
    ],
    correctIndex: 1,
    seconds: 12,
    distance: 720,
  },
  {
    title: "Obstáculo 7",
    q: "Si veo una situación riesgosa en el ambiente, debo:",
    options: [
      "Ignorarla",
      "Reportarla y actuar con responsabilidad",
      "Grabarlas para redes",
      "Provocar más desorden",
    ],
    correctIndex: 1,
    seconds: 10,
    distance: 840,
  },
  {
    title: "Obstáculo 8",
    q: "Una conducta responsable en evaluación es:",
    options: [
      "Copiar para “no perder”",
      "Presentar mi trabajo con honestidad",
      "Compartir respuestas en grupo",
      "Hacer trampa si nadie ve",
    ],
    correctIndex: 1,
    seconds: 10,
    distance: 940,
  },
];

// Estado general del juego (todo lo que va cambiando)
const estado = {
  ejecutando: false,
  pausadoPorPregunta: false,
  jugador: null,
  ultimoTs: 0,
  transcurridoSeg: 0,
  distancia: 0,
  puntos: 0,
  aciertos: 0,
  velocidadBase: 30,
  multVelocidad: 1,
  efectoVelocidadRestanteSeg: 0,
  efectoVelocidadMult: 1,
  carro: { x: pista.x + pista.w / 2, y: pista.y + pista.h - 60, w: 44, h: 68 },
  teclas: { izquierda: false, derecha: false },
  siguienteIndicePregunta: 0,
  preguntaActiva: null,
  preguntaRestanteSeg: 0,
  preguntaRespondida: false,
  aviso: { texto: "", restanteSeg: 0, color: "white" },
};

// Helpers rápidos
function limitar(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function mostrarCapa(el, visible) {
  el.setAttribute("aria-hidden", visible ? "false" : "true");
}

// Habla con api.php (registro, guardar partida, ranking)
async function api(action, payload) {
  const cuerpo = new URLSearchParams();
  const data = payload ?? {};
  Object.keys(data).forEach((k) => {
    const v = data[k];
    if (v === undefined || v === null) return;
    cuerpo.set(k, String(v));
  });
  const res = await fetch(`./api.php?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: cuerpo.toString(),
  });
  const respuesta = await res.json().catch(() => null);
  if (!respuesta || !respuesta.ok) throw new Error((respuesta && respuesta.error) || "api_error");
  return respuesta;
}

// Mostrar/ocultar pantallas
function mostrarRegistro(mensaje = "") {
  registroMensaje.textContent = mensaje;
  mostrarCapa(capaRegistro, true);
  mostrarCapa(capaInicio, false);
  mostrarCapa(capaFinal, false);
  mostrarCapa(capaPregunta, false);
}

function mostrarInicio() {
  registroMensaje.textContent = "";
  mostrarCapa(capaRegistro, false);
  mostrarCapa(capaInicio, true);
  mostrarCapa(capaFinal, false);
  mostrarCapa(capaPregunta, false);
}

// Registro en la BD (si sale bien, ya puedes jugar)
async function registrarJugador(nombre, ficha) {
  botonRegistrar.disabled = true;
  registroMensaje.textContent = "Guardando…";
  try {
    const data = await api("registrar", { nombre, ficha });
    estado.jugador = data.user;
    mostrarInicio();
    actualizarHud();
  } catch {
    registroMensaje.textContent = "No se pudo registrar. Revisa que Apache/MySQL estén encendidos en XAMPP.";
  } finally {
    botonRegistrar.disabled = false;
  }
}

// Pintar el ranking en pantalla (top 10)
function renderizarClasificacion(filas) {
  tablaClasificacion.innerHTML = "";
  if (!filas) {
    tablaClasificacion.textContent = "No disponible.";
    return;
  }
  if (filas.length === 0) {
    tablaClasificacion.textContent = "Aún no hay partidas registradas.";
    return;
  }

  for (let i = 0; i < filas.length; i += 1) {
    const r = filas[i];
    const fila = document.createElement("div");
    fila.className = "filaClasificacion";

    const pos = document.createElement("div");
    pos.className = "posClasificacion";
    pos.textContent = String(i + 1);

    const contNombre = document.createElement("div");
    const nombre = document.createElement("div");
    nombre.className = "nombreClasificacion";
    const fichaTexto = r.ficha ? ` (${r.ficha})` : "";
    nombre.textContent = `${r.nombre}${fichaTexto}`;
    const meta = document.createElement("div");
    meta.className = "metaClasificacion";
    meta.textContent = `${r.aciertos}/${r.total} · ${Number(r.tiempo_seg).toFixed(1)} s`;
    contNombre.appendChild(nombre);
    contNombre.appendChild(meta);

    const puntos = document.createElement("div");
    puntos.className = "puntajeClasificacion";
    puntos.textContent = String(r.puntaje);

    fila.appendChild(pos);
    fila.appendChild(contNombre);
    fila.appendChild(puntos);
    tablaClasificacion.appendChild(fila);
  }
}

// Pedir el ranking al backend
async function actualizarClasificacion() {
  const res = await fetch("./api.php?action=clasificacion&limit=10", { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) {
    renderizarClasificacion(null);
    return;
  }
  renderizarClasificacion(Array.isArray(data.rows) ? data.rows : []);
}

// Guardar partida y luego refrescar ranking
async function sincronizarPartida() {
  if (!estado.jugador) return;

  try {
    await api("guardar_partida", {
      user_id: estado.jugador.id,
      puntaje: estado.puntos,
      aciertos: estado.aciertos,
      total: preguntas.length,
      tiempo_seg: estado.transcurridoSeg,
      distancia: estado.distancia,
    });
  } catch {}

  await actualizarClasificacion();
}

// Reset de variables para empezar de cero
function reiniciarJuego() {
  estado.ejecutando = false;
  estado.pausadoPorPregunta = false;
  estado.ultimoTs = 0;
  estado.transcurridoSeg = 0;
  estado.distancia = 0;
  estado.puntos = 0;
  estado.aciertos = 0;
  estado.velocidadBase = 30;
  estado.multVelocidad = 1;
  estado.efectoVelocidadRestanteSeg = 0;
  estado.efectoVelocidadMult = 1;
  estado.carro.x = pista.x + pista.w / 2;
  estado.siguienteIndicePregunta = 0;
  estado.preguntaActiva = null;
  estado.preguntaRestanteSeg = 0;
  estado.preguntaRespondida = false;
  estado.aviso.texto = "";
  estado.aviso.restanteSeg = 0;
  estado.aviso.color = "white";
  actualizarHud();
  dibujar();
}

// Arrancar partida (solo si ya hay jugador)
function iniciarJuego() {
  if (!estado.jugador) {
    mostrarRegistro("");
    return;
  }
  reiniciarJuego();
  estado.ejecutando = true;
  estado.ultimoTs = performance.now();
  mostrarCapa(capaInicio, false);
  mostrarCapa(capaFinal, false);
  mostrarCapa(capaRegistro, false);
  requestAnimationFrame(bucle);
}

// Fin de partida: muestra resultados + guarda ranking
function terminarJuego() {
  estado.ejecutando = false;

  const textoTiempo = `${estado.transcurridoSeg.toFixed(1)} s`;
  const licencia =
    estado.aciertos >= 8 ? "Licencia Oro" : estado.aciertos >= 6 ? "Licencia Plata" : estado.aciertos >= 4 ? "Licencia Bronce" : "Repetir práctica";

  finTiempo.textContent = textoTiempo;
  finPuntos.textContent = String(estado.puntos);
  finAciertos.textContent = `${estado.aciertos}/${preguntas.length}`;
  finLicencia.textContent = licencia;
  tablaClasificacion.textContent = "Cargando…";
  mostrarCapa(capaPregunta, false);
  mostrarCapa(capaFinal, true);
  void sincronizarPartida();
}

// Actualiza los numeritos de arriba
function actualizarHud() {
  hudJugador.textContent = estado.jugador ? (estado.jugador.ficha ? `${estado.jugador.nombre} (${estado.jugador.ficha})` : estado.jugador.nombre) : "—";
  hudDistancia.textContent = `${Math.floor(estado.distancia)} m`;
  const velPct = Math.round((estado.multVelocidad * 100 + Number.EPSILON) * 10) / 10;
  hudVelocidad.textContent = `${velPct}%`;
  hudPuntos.textContent = String(estado.puntos);
  hudAciertos.textContent = `${estado.aciertos}/${preguntas.length}`;
  const restante = limitar(duracionNivelSeg - estado.transcurridoSeg, 0, duracionNivelSeg);
  hudTiempo.textContent = `${restante.toFixed(1)} s`;
}

// Mensaje corto arriba (correcto/incorrecto, etc.)
function ponerAviso(texto, color, segundos = 1.2) {
  estado.aviso.texto = texto;
  estado.aviso.restanteSeg = segundos;
  estado.aviso.color = color;
}

// Boost o penalización de velocidad por unos segundos
function aplicarEfectoVelocidad(mult, segundos) {
  estado.efectoVelocidadMult = mult;
  estado.efectoVelocidadRestanteSeg = segundos;
}

// Abre la pantalla de pregunta y crea los botones 1-4
function abrirPregunta(pregunta) {
  estado.pausadoPorPregunta = true;
  estado.preguntaActiva = pregunta;
  estado.preguntaRestanteSeg = pregunta.seconds;
  estado.preguntaRespondida = false;

  tituloPregunta.textContent = pregunta.title;
  textoPregunta.textContent = pregunta.q;
  tiempoPregunta.textContent = String(Math.ceil(estado.preguntaRestanteSeg));
  opcionesPregunta.innerHTML = "";

  pregunta.options.forEach((texto, idx) => {
    const boton = document.createElement("button");
    boton.className = "opcion";
    boton.type = "button";
    boton.dataset.index = String(idx);
    boton.addEventListener("click", () => responderPregunta(idx));

    const tecla = document.createElement("div");
    tecla.className = "opcionTecla";
    tecla.textContent = String(idx + 1);

    const t = document.createElement("div");
    t.className = "opcionTexto";
    t.textContent = texto;

    boton.appendChild(tecla);
    boton.appendChild(t);
    opcionesPregunta.appendChild(boton);
  });

  mostrarCapa(capaPregunta, true);
}

function cerrarPregunta() {
  mostrarCapa(capaPregunta, false);
  estado.pausadoPorPregunta = false;
  estado.preguntaActiva = null;
  estado.preguntaRestanteSeg = 0;
  estado.preguntaRespondida = false;
}

function responderPregunta(indiceSeleccionado) {
  const pregunta = estado.preguntaActiva;
  if (!pregunta || estado.preguntaRespondida) return;
  estado.preguntaRespondida = true;

  const esCorrecta = indiceSeleccionado === pregunta.correctIndex;
  if (esCorrecta) {
    estado.aciertos += 1;
    const rapido = estado.preguntaRestanteSeg >= pregunta.seconds / 2;
    estado.puntos += rapido ? 200 : 100;
    aplicarEfectoVelocidad(1.2, 3);
    ponerAviso(rapido ? "¡Correcto! +200" : "¡Correcto! +100", "#c8ffe1", 1.1);
  } else {
    aplicarEfectoVelocidad(0.7, 4);
    ponerAviso("Incorrecto - velocidad", "#ffd0d8", 1.1);
  }

  cerrarPregunta();
  actualizarHud();
}

function tiempoAgotadoPregunta() {
  if (!estado.preguntaActiva || estado.preguntaRespondida) return;
  estado.preguntaRespondida = true;
  aplicarEfectoVelocidad(0.6, 4);
  estado.distancia = limitar(estado.distancia - 10, 0, distanciaMeta);
  ponerAviso("Sin responder: -10 m", "#ffd0d8", 1.4);
  cerrarPregunta();
  actualizarHud();
}

// Este es el "motor": mueve el carro, avanza metros y dispara preguntas
function actualizar(dtSeg) {
  if (!estado.ejecutando) return;

  estado.transcurridoSeg += dtSeg;
  if (estado.transcurridoSeg >= duracionNivelSeg) {
    estado.transcurridoSeg = duracionNivelSeg;
    terminarJuego();
    return;
  }

  if (estado.aviso.restanteSeg > 0) estado.aviso.restanteSeg = Math.max(0, estado.aviso.restanteSeg - dtSeg);

  if (estado.efectoVelocidadRestanteSeg > 0) {
    estado.efectoVelocidadRestanteSeg = Math.max(0, estado.efectoVelocidadRestanteSeg - dtSeg);
    estado.multVelocidad = estado.efectoVelocidadMult;
  } else {
    estado.multVelocidad = 1;
  }

  const mov = (estado.teclas.derecha ? 1 : 0) - (estado.teclas.izquierda ? 1 : 0);
  const objetivoX = estado.carro.x + mov * 240 * dtSeg;
  estado.carro.x = limitar(objetivoX, pista.x + 50, pista.x + pista.w - 50);

  if (estado.pausadoPorPregunta) {
    estado.preguntaRestanteSeg = Math.max(0, estado.preguntaRestanteSeg - dtSeg);
    tiempoPregunta.textContent = String(Math.ceil(estado.preguntaRestanteSeg));
    if (estado.preguntaRestanteSeg <= 0) tiempoAgotadoPregunta();
    return;
  }

  const vel = estado.velocidadBase * estado.multVelocidad;
  estado.distancia = limitar(estado.distancia + vel * dtSeg, 0, distanciaMeta);

  const siguiente = preguntas[estado.siguienteIndicePregunta];
  if (siguiente && estado.distancia >= siguiente.distance) {
    estado.siguienteIndicePregunta += 1;
    abrirPregunta(siguiente);
  }

  if (estado.distancia >= distanciaMeta) {
    terminarJuego();
  }
}

// Dibujo de pista (solo visual)
function dibujarPista(progreso01) {
  const grad = contexto.createLinearGradient(0, pista.y, 0, pista.y + pista.h);
  grad.addColorStop(0, "#eafff1");
  grad.addColorStop(1, "#f8fffb");
  contexto.fillStyle = grad;
  contexto.fillRect(pista.x, pista.y, pista.w, pista.h);

  contexto.fillStyle = "rgba(10,60,35,.06)";
  contexto.fillRect(pista.x - 18, pista.y, 18, pista.h);
  contexto.fillRect(pista.x + pista.w, pista.y, 18, pista.h);

  const centroCarrilX = pista.x + pista.w / 2;
  const alto = 26;
  const gap = 18;
  const velVisual = 110 * (0.7 + progreso01 * 0.7) * estado.multVelocidad;
  const offset = (performance.now() / 1000) * velVisual;
  contexto.fillStyle = "rgba(10,60,35,.16)";
  for (let y = pista.y - 60; y < pista.y + pista.h + 60; y += alto + gap) {
    const yy = y + (offset % (alto + gap));
    contexto.fillRect(centroCarrilX - 3, yy, 6, alto);
  }
}

// Dibujo del carro (solo visual)
function dibujarCarro() {
  const x = estado.carro.x;
  const y = estado.carro.y;

  contexto.save();
  contexto.translate(x, y);
  contexto.fillStyle = "rgba(0,0,0,.35)";
  contexto.beginPath();
  contexto.ellipse(0, estado.carro.h / 2 + 10, 28, 10, 0, 0, Math.PI * 2);
  contexto.fill();

  const cuerpo = contexto.createLinearGradient(0, -estado.carro.h / 2, 0, estado.carro.h / 2);
  cuerpo.addColorStop(0, "#35d07a");
  cuerpo.addColorStop(1, "#1fbf63");
  contexto.fillStyle = cuerpo;
  rectRedondeado(-estado.carro.w / 2, -estado.carro.h / 2, estado.carro.w, estado.carro.h, 12);
  contexto.fill();

  contexto.fillStyle = "rgba(255,255,255,.35)";
  rectRedondeado(-estado.carro.w / 2 + 6, -estado.carro.h / 2 + 10, estado.carro.w - 12, 18, 10);
  contexto.fill();

  contexto.fillStyle = "rgba(0,0,0,.55)";
  rectRedondeado(-estado.carro.w / 2 - 6, -estado.carro.h / 2 + 10, 10, 18, 5);
  rectRedondeado(estado.carro.w / 2 - 4, -estado.carro.h / 2 + 10, 10, 18, 5);
  rectRedondeado(-estado.carro.w / 2 - 6, estado.carro.h / 2 - 30, 10, 18, 5);
  rectRedondeado(estado.carro.w / 2 - 4, estado.carro.h / 2 - 30, 10, 18, 5);
  contexto.fill();
  contexto.restore();
}

// Dibuja un rectángulo con esquinas redondeadas (reutilizado en todo)
function rectRedondeado(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  contexto.beginPath();
  contexto.moveTo(x + rr, y);
  contexto.arcTo(x + w, y, x + w, y + h, rr);
  contexto.arcTo(x + w, y + h, x, y + h, rr);
  contexto.arcTo(x, y + h, x, y, rr);
  contexto.arcTo(x, y, x + w, y, rr);
  contexto.closePath();
}

// Dibuja los "portales" que representan cada obstáculo/pregunta
function dibujarPortales() {
  const ancho = 520;
  const x = pista.x + (pista.w - ancho) / 2;

  const adelanto = 220;
  const inicio = estado.distancia;
  const fin = estado.distancia + adelanto;

  contexto.save();
  for (let i = 0; i < preguntas.length; i += 1) {
    const p = preguntas[i];
    if (p.distance < inicio || p.distance > fin) continue;
    const t = (p.distance - inicio) / adelanto;
    const y = pista.y + 40 + t * 300;

    const resuelta = i < estado.siguienteIndicePregunta;
    const alpha = resuelta ? 0.15 : 0.32;
    contexto.fillStyle = resuelta ? `rgba(46,204,113,${alpha})` : `rgba(120,230,170,${alpha})`;
    rectRedondeado(x, y, ancho, 46, 12);
    contexto.fill();

    contexto.strokeStyle = resuelta ? "rgba(46,204,113,.55)" : "rgba(120,230,170,.65)";
    contexto.lineWidth = 2;
    rectRedondeado(x, y, ancho, 46, 12);
    contexto.stroke();

    contexto.fillStyle = "rgba(11,43,27,.90)";
    contexto.font = "800 14px system-ui,Segoe UI,Arial";
    contexto.fillText(`${p.title} · ${p.distance} m`, x + 14, y + 28);
  }
  contexto.restore();
}

// Dibuja la meta cuando estás cerca del final
function dibujarMeta() {
  const adelanto = 220;
  const inicio = estado.distancia;
  const fin = estado.distancia + adelanto;
  if (distanciaMeta < inicio || distanciaMeta > fin) return;

  const t = (distanciaMeta - inicio) / adelanto;
  const y = pista.y + 40 + t * 300;

  const x = pista.x + 60;
  const w = pista.w - 120;

  contexto.save();
  contexto.fillStyle = "rgba(255,255,255,.80)";
  rectRedondeado(x, y, w, 58, 12);
  contexto.fill();
  contexto.strokeStyle = "rgba(10,60,35,.22)";
  contexto.lineWidth = 2;
  rectRedondeado(x, y, w, 58, 12);
  contexto.stroke();
  contexto.fillStyle = "rgba(11,43,27,.95)";
  contexto.font = "900 16px system-ui,Segoe UI,Arial";
  contexto.fillText("META", x + 14, y + 35);
  contexto.restore();
}

// Dibuja un frame completo (fondo + pista + carro + barra)
function dibujar() {
  contexto.clearRect(0, 0, lienzo.width, lienzo.height);

  contexto.fillStyle = "#f4fbf6";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);

  const progreso01 = limitar(estado.distancia / distanciaMeta, 0, 1);
  dibujarPista(progreso01);
  dibujarPortales();
  dibujarMeta();
  dibujarCarro();

  contexto.save();
  contexto.fillStyle = "rgba(11,43,27,.82)";
  contexto.font = "700 12px system-ui,Segoe UI,Arial";
  contexto.fillText("Nivel 1 · Manual del aprendiz (hipotético)", 18, 22);

  const barraX = pista.x;
  const barraY = pista.y + pista.h + 18;
  const barraW = pista.w;
  const barraH = 10;
  contexto.fillStyle = "rgba(10,60,35,.10)";
  rectRedondeado(barraX, barraY, barraW, barraH, 6);
  contexto.fill();
  contexto.fillStyle = "rgba(31,191,99,.92)";
  rectRedondeado(barraX, barraY, barraW * progreso01, barraH, 6);
  contexto.fill();

  if (estado.aviso.restanteSeg > 0) {
    contexto.font = "900 18px system-ui,Segoe UI,Arial";
    contexto.fillStyle = estado.aviso.color;
    contexto.fillText(estado.aviso.texto, 18, 50);
  }

  contexto.restore();
}

// Bucle principal (requestAnimationFrame)
function bucle(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - estado.ultimoTs) / 1000));
  estado.ultimoTs = ts;
  actualizar(dt);
  actualizarHud();
  dibujar();
  if (estado.ejecutando) requestAnimationFrame(bucle);
}

// Teclas: mover y responder
function alTeclaPresionada(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") estado.teclas.izquierda = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") estado.teclas.derecha = true;
  if (e.key === "r" || e.key === "R") iniciarJuego();

  if (estado.pausadoPorPregunta && !estado.preguntaRespondida) {
    if (e.key === "1") responderPregunta(0);
    if (e.key === "2") responderPregunta(1);
    if (e.key === "3") responderPregunta(2);
    if (e.key === "4") responderPregunta(3);
  }
}

// Soltar teclas
function alTeclaSoltada(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") estado.teclas.izquierda = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") estado.teclas.derecha = false;
}

// Eventos de UI
botonJugar.addEventListener("click", iniciarJuego);
botonReiniciar.addEventListener("click", iniciarJuego);

formularioRegistro.addEventListener("submit", (e) => {
  e.preventDefault();
  void registrarJugador(registroNombre.value, registroFicha.value);
});

window.addEventListener("keydown", alTeclaPresionada);
window.addEventListener("keyup", alTeclaSoltada);

// Arranque
reiniciarJuego();

mostrarRegistro("");
actualizarHud();
