const API = 'http://localhost:3000/api';
const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuario) {
    window.location.href = '/login.html';
}

const params = new URLSearchParams(window.location.search);
const examenId = params.get('id');
if (!examenId) window.location.href = '/dashboard-alumno.html';

let preguntas = [];
let respuestas = {};
let temporizador = null;
let segundosRestantes = 0;
let totalSegundos = 0;
let examenEntregado = false;

// ---- Cargar examen ----
async function cargarExamen() {
    try {
        const response = await fetch(`${API}/examen/${examenId}/preguntas`);
        if (!response.ok) throw new Error('Error al cargar examen');
        const data = await response.json();
        preguntas = data.preguntas;

        document.getElementById('tituloExamenNav').textContent = data.titulo || `Examen (${preguntas.length} preguntas)`;
        segundosRestantes = (data.tiempo_limite_minutos || 60) * 60;
        totalSegundos = segundosRestantes;
        renderizarPreguntas();
        iniciarTemporizador();
    } catch (error) {
        document.getElementById('contenedorPreguntas').innerHTML = `
            <div class="alert alert-danger text-center p-5">
                <i class="bi bi-exclamation-triangle display-4 d-block mb-3"></i>
                <p>Error al cargar el examen.</p>
                <a href="dashboard-alumno.html" class="btn btn-primary">Volver</a>
            </div>`;
    }
}

// ---- Renderizar preguntas ----
function renderizarPreguntas() {
    const contenedor = document.getElementById('contenedorPreguntas');
    contenedor.innerHTML = preguntas.map((p, i) => {
        let inputHTML = '';
        const opciones = [
            { letra: 'A', texto: p.opcion_a },
            { letra: 'B', texto: p.opcion_b },
            { letra: 'C', texto: p.opcion_c },
            { letra: 'D', texto: p.opcion_d }
        ].filter(o => o.texto);
        if (p.tipo === 'opcion_multiple') {
            inputHTML = opciones.map(o => `
                <div class="form-check mb-2">
                    <input class="form-check-input input-respuesta" type="radio"
                           name="preg_${p.id}" value="${o.letra}"
                           data-pregunta="${p.id}" id="opt_${p.id}_${o.letra}">
                    <label class="form-check-label" for="opt_${p.id}_${o.letra}">
                        <strong>${o.letra})</strong> ${o.texto}
                    </label>
                </div>
            `).join('');
        } else if (p.tipo === 'arrastre') {
            let targets = ['','','',''];
            try { targets = JSON.parse(p.arrastre_targets) || targets; } catch(e) {}
            const hasTargets = targets.some(t => t);
            if (!hasTargets) targets = ['Objetivo 1', 'Objetivo 2', 'Objetivo 3', 'Objetivo 4'];
            const shuffled = [...opciones].sort(() => Math.random() - 0.5);
            const letrasColor = { A:'primary', B:'success', C:'danger', D:'warning text-dark' };
            inputHTML = `
                <div class="arrastre-container" data-pregunta="${p.id}">
                    <div class="row g-4">
                        <div class="col-md-5">
                            <div class="matching-column-label"><i class="bi bi-palette me-1"></i> Elementos</div>
                            <div class="items-list" id="arrastre_opts_${p.id}">
                                ${shuffled.map(o => `
                                    <div class="matching-card" draggable="true"
                                         data-pregunta="${p.id}" data-letra="${o.letra}"
                                         id="drag_${p.id}_${o.letra}">
                                        <span class="matching-badge bg-${letrasColor[o.letra].split(' ')[0]}">${o.letra}</span>
                                        <span class="matching-card-text">${o.texto}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="col-md-7">
                            <div class="matching-column-label"><i class="bi bi-geo-alt me-1"></i> Descripciones</div>
                            <div class="targets-list" id="arrastre_pos_${p.id}">
                                ${[1,2,3,4].map(n => {
                                    return `
                                    <div class="matching-dropzone" data-pregunta="${p.id}" data-pos="${n}" id="dropzone_${p.id}_${n}">
                                        <span class="target-number">${n}</span>
                                        <div class="target-content">
                                            <span class="target-text">${targets[n-1]}</span>
                                            <span class="target-slot" id="slot_${p.id}_${n}">
                                                <span class="slot-placeholder"><i class="bi bi-plus-circle me-1"></i>Suelta aquí</span>
                                            </span>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                            <button class="btn btn-sm btn-outline-secondary matching-reset" data-pregunta="${p.id}">
                                <i class="bi bi-arrow-counterclockwise me-1"></i> Reiniciar
                            </button>
                        </div>
                    </div>
                    <input type="hidden" class="input-respuesta" data-pregunta="${p.id}" id="hidden_${p.id}" value="">
                </div>`;
        } else {
            inputHTML = `
                <div class="mb-2">
                    <label class="form-label">Escribe tu respuesta:</label>
                    <input type="text" class="form-control input-respuesta" data-pregunta="${p.id}"
                           placeholder="Escribe la respuesta correcta..." id="txt_${p.id}">
                </div>`;
        }
        return `
            <div class="col-12 mb-4">
                <div class="card shadow-sm border-0 rounded-4">
                    <div class="card-body p-4">
                        <h6 class="text-muted mb-2">Pregunta ${i + 1} de ${preguntas.length}</h6>
                        <p class="fw-bold mb-3">${p.texto_pregunta}</p>
                        ${inputHTML}
                    </div>
                </div>
            </div>`;
    }).join('');

    document.querySelectorAll('.input-respuesta').forEach(input => {
        input.addEventListener('change', guardarRespuesta);
        input.addEventListener('input', guardarRespuesta);
    });
    iniciarDragDrop();
}

function guardarRespuesta(e) {
    const preguntaId = parseInt(e.target.dataset.pregunta);
    const valor = e.target.type === 'radio' ? e.target.value : e.target.value.trim();
    respuestas[preguntaId] = valor;
}

// ---- Drag & Drop para preguntas tipo arrastre (matching) ----
function getColor(letra) {
    const c = { A:'primary', B:'success', C:'danger', D:'warning text-dark' };
    return c[letra] || 'secondary';
}

function iniciarDragDrop() {
    document.querySelectorAll('.matching-card').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const preguntaId = item.dataset.pregunta;
            const letra = item.dataset.letra;
            if (item.classList.contains('placed')) {
                document.querySelectorAll(`#arrastre_pos_${preguntaId} .target-slot`).forEach(s => {
                    if (s.dataset.letra === letra) {
                        s.innerHTML = `<span class="slot-placeholder"><i class="bi bi-plus-circle me-1"></i>Suelta aquí</span>`;
                        s.className = 'target-slot';
                        delete s.dataset.letra;
                    }
                });
                item.classList.remove('placed');
            }
            e.dataTransfer.setData('text/plain', JSON.stringify({ preguntaId, letra }));
            actualizarRespuestaArrastre(parseInt(preguntaId));
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });
    document.querySelectorAll('.matching-dropzone').forEach(zona => {
        zona.addEventListener('dragover', (e) => {
            e.preventDefault();
            zona.classList.add('drag-over');
        });
        zona.addEventListener('dragleave', () => {
            zona.classList.remove('drag-over');
        });
        zona.addEventListener('drop', (e) => {
            e.preventDefault();
            zona.classList.remove('drag-over');
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const preguntaId = parseInt(zona.dataset.pregunta);
            const pos = parseInt(zona.dataset.pos);
            const letra = data.letra;
            const itemOrig = document.getElementById(`drag_${preguntaId}_${letra}`);
            if (!itemOrig || itemOrig.classList.contains('placed')) return;
            document.querySelectorAll(`#arrastre_pos_${preguntaId} .target-slot`).forEach(s => {
                if (s.dataset.letra === letra) {
                    s.innerHTML = `<span class="slot-placeholder"><i class="bi bi-plus-circle me-1"></i>Suelta aquí</span>`;
                    s.className = 'target-slot';
                    delete s.dataset.letra;
                }
            });
            const slotTarget = document.getElementById(`slot_${preguntaId}_${pos}`);
            if (slotTarget.dataset.letra) {
                const oldLetra = slotTarget.dataset.letra;
                const oldItem = document.getElementById(`drag_${preguntaId}_${oldLetra}`);
                if (oldItem) oldItem.classList.remove('placed');
            }
            itemOrig.classList.add('placed');
            const cardText = itemOrig.querySelector('.matching-card-text')?.textContent || '';
            const colorClass = getColor(letra).split(' ')[0];
            slotTarget.innerHTML = `<span class="slot-filled"><span class="matching-badge bg-${colorClass}">${letra}</span> ${cardText}</span>`;
            slotTarget.className = 'target-slot filled';
            slotTarget.dataset.letra = letra;
            actualizarRespuestaArrastre(preguntaId);
        });
    });
    document.querySelectorAll('.matching-reset').forEach(btn => {
        btn.addEventListener('click', () => {
            const preguntaId = btn.dataset.pregunta;
            document.querySelectorAll(`#arrastre_pos_${preguntaId} .target-slot`).forEach(slot => {
                if (slot.dataset.letra) {
                    const item = document.getElementById(`drag_${preguntaId}_${slot.dataset.letra}`);
                    if (item) item.classList.remove('placed');
                }
                slot.innerHTML = `<span class="slot-placeholder"><i class="bi bi-plus-circle me-1"></i>Suelta aquí</span>`;
                slot.className = 'target-slot';
                delete slot.dataset.letra;
            });
            document.getElementById(`hidden_${preguntaId}`).value = '';
            delete respuestas[preguntaId];
        });
    });
}

function actualizarRespuestaArrastre(preguntaId) {
    const valores = [];
    for (let i = 1; i <= 4; i++) {
        const slot = document.getElementById(`slot_${preguntaId}_${i}`);
        valores.push(slot.dataset.letra || '');
    }
    const respuesta = valores.join(',');
    document.getElementById(`hidden_${preguntaId}`).value = respuesta;
    respuestas[preguntaId] = respuesta;
}

// ---- Temporizador ----
function iniciarTemporizador() {
    actualizarDisplay();
    temporizador = setInterval(() => {
        segundosRestantes--;
        actualizarDisplay();
        if (segundosRestantes <= 0) {
            clearInterval(temporizador);
            entregarExamen(true);
        }
    }, 1000);
}

function actualizarDisplay() {
    const mins = Math.floor(segundosRestantes / 60);
    const segs = segundosRestantes % 60;
    document.getElementById('tiempoRestante').textContent =
        `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
    document.getElementById('avisoAutocierre').textContent =
        segundosRestantes <= 120 ? '⏰ El examen se cerrará automáticamente cuando el tiempo termine.' : '';
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.className = segundosRestantes <= 60 ? 'navbar-text text-danger fw-bold' : 'navbar-text';
}

// ---- Entregar examen ----
document.getElementById('btnEntregar').addEventListener('click', () => {
    if (!examenEntregado) entregarExamen(false);
});

async function entregarExamen(porTiempo) {
    if (examenEntregado) return true;
    examenEntregado = true;
    clearInterval(temporizador);

    if (!porTiempo) {
        const confirmar = await Swal.fire({
            title: '¿Entregar examen?',
            text: 'Una vez entregado no podrás modificarlo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, entregar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirmar.isConfirmed) {
            examenEntregado = false;
            temporizador = setInterval(() => {
                segundosRestantes--;
                actualizarDisplay();
                if (segundosRestantes <= 0) entregarExamen(true);
            }, 1000);
            return;
        }
    }

    document.getElementById('btnEntregar').disabled = true;
    document.getElementById('btnEntregar').innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Entregando...';

    const respuestasArray = Object.entries(respuestas).map(([pregunta_id, respuesta_dada]) => ({
        pregunta_id: parseInt(pregunta_id),
        respuesta_dada: String(respuesta_dada)
    }));

    const tiempoTomado = totalSegundos - segundosRestantes;

    try {
        const response = await fetch(`${API}/examen/entregar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                examen_id: parseInt(examenId),
                estudiante_id: usuario.id,
                respuestas: respuestasArray,
                tiempo_tomado: tiempoTomado
            })
        });
        const data = await response.json();
        if (response.ok) {
            mostrarResultados(data);
            return true;
        } else {
            showAlertError('Error', data.message);
            return false;
        }
    } catch (error) {
        if (!porTiempo) {
            showAlertError('Error de conexión', 'No se pudo conectar con el servidor.');
            examenEntregado = false;
            document.getElementById('btnEntregar').disabled = false;
            document.getElementById('btnEntregar').innerHTML =
                '<i class="bi bi-check2-square me-2"></i>Entregar Examen';
        }
        return false;
    }
}

// ---- Mostrar resultados ----
function mostrarResultados(data) {
    document.getElementById('botoneraEnviar').style.display = 'none';

    if (data.detalles) {
        data.detalles.forEach(d => {
            const preguntaCont = document.querySelector(`.arrastre-container[data-pregunta="${d.pregunta_id}"]`);
            if (!preguntaCont) return;
            preguntaCont.querySelectorAll('.matching-dropzone').forEach(zona => {
                const pos = parseInt(zona.dataset.pos);
                const respuestaArray = respuestas[d.pregunta_id] ? respuestas[d.pregunta_id].split(',') : [];
                const respuestaEnPos = respuestaArray[pos - 1] || '';
                const correctaEnPos = preguntas.find(p => p.id == d.pregunta_id)?.respuesta_correcta?.split(',')?.[pos - 1] || '';
                const isCorrect = respuestaEnPos.toUpperCase() === correctaEnPos.toUpperCase();
                zona.classList.add(isCorrect ? 'correct' : 'incorrect');
                if (!isCorrect && correctaEnPos) {
                    const correctItem = preguntas.find(p => p.id == d.pregunta_id)?.[`opcion_${correctaEnPos.toLowerCase()}`] || '';
                    const content = zona.querySelector('.target-content');
                    if (content) {
                        const feedback = document.createElement('span');
                        feedback.className = 'correct-answer-feedback';
                        feedback.innerHTML = `<i class="bi bi-check-circle me-1"></i>Respuesta: ${correctaEnPos}) ${correctItem}`;
                        content.appendChild(feedback);
                    }
                }
            });
        });
    }

    const contenedor = document.getElementById('contenedorResultados');
    contenedor.style.display = 'block';
    const esAprobatorio = data.calificacion >= 6;
    const icono = esAprobatorio ? '🎉' : '📚';
    const color = esAprobatorio ? 'success' : 'warning';

    let temasHTML = '';
    if (data.temas_a_repasar.length > 0) {
        temasHTML = `
            <div class="mt-4 p-3 bg-light rounded-3 border">
                <h6 class="fw-bold text-danger"><i class="bi bi-book me-2"></i>Temas a repasar:</h6>
                <ul class="mb-0">${data.temas_a_repasar.map(t => `<li>${t}</li>`).join('')}</ul>
            </div>`;
    } else {
        temasHTML = `<p class="text-success fw-bold mt-3"><i class="bi bi-check-circle"></i> ¡Perfecto! No necesitas repasar nada.</p>`;
    }

    contenedor.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow border-0 rounded-4 p-4 text-center">
                    <div class="display-1 mb-2">${icono}</div>
                    <h3 class="fw-bold text-${color}">${data.calificacion.toFixed(1)} / 10</h3>
                    <p class="text-muted">${data.correctas} de ${data.total_preguntas} preguntas correctas</p>
                    <div class="progress mb-3" style="height: 12px;">
                        <div class="progress-bar bg-${color}" style="width: ${(data.correctas / data.total_preguntas) * 100}%"></div>
                    </div>
                    ${temasHTML}
                    <a href="dashboard-alumno.html" class="btn btn-primary mt-4">Volver al inicio</a>
                </div>
            </div>
        </div>`;
}

// ---- Protección contra salida del examen ----
window.addEventListener('beforeunload', (e) => {
    if (examenEntregado) return;
    e.preventDefault();
    e.returnValue = '';
    const respuestasArray = Object.entries(respuestas).map(([pregunta_id, respuesta_dada]) => ({
        pregunta_id: parseInt(pregunta_id),
        respuesta_dada: String(respuesta_dada)
    }));
    const tiempoTomado = totalSegundos - segundosRestantes;
    navigator.sendBeacon(`${API}/examen/entregar`, new Blob([JSON.stringify({
        examen_id: parseInt(examenId),
        estudiante_id: usuario.id,
        respuestas: respuestasArray,
        tiempo_tomado: tiempoTomado
    })], { type: 'application/json' }));
    examenEntregado = true;
});

document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href]');
    if (!link || examenEntregado) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;
    e.preventDefault();
    const confirmar = await Swal.fire({
        title: '<span class="fw-bold">¿Salir del examen?</span>',
        html: '<div class="text-muted" style="font-size:0.95rem">Si sales ahora el examen <span class="fw-semibold text-danger">se marcará como entregado</span> y no podrás volver a ingresar.</div>',
        icon: 'warning',
        iconColor: '#dc3545',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, salir y entregar',
        cancelButtonText: 'Seguir en el examen',
        cancelButtonColor: '#0d6efd',
        reverseButtons: true,
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            confirmButton: 'btn btn-danger btn-lg fw-bold px-4 rounded-pill',
            cancelButton: 'btn btn-primary btn-lg fw-bold px-4 rounded-pill'
        },
        buttonsStyling: false
    });
    if (confirmar.isConfirmed) {
        const ok = await entregarExamen(true);
        if (ok) {
            window.location.href = href;
        } else {
            examenEntregado = false;
            document.getElementById('btnEntregar').disabled = false;
            document.getElementById('btnEntregar').innerHTML =
                '<i class="bi bi-check2-square me-2"></i>Entregar Examen';
            showAlertError('Error al entregar', 'Hubo un problema al conectar con el servidor. Puedes intentarlo de nuevo.');
        }
    }
});

cargarExamen();
