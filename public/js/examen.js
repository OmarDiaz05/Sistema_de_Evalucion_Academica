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
        if (p.tipo === 'opcion_multiple') {
            const opciones = [
                { letra: 'A', texto: p.opcion_a },
                { letra: 'B', texto: p.opcion_b },
                { letra: 'C', texto: p.opcion_c },
                { letra: 'D', texto: p.opcion_d }
            ].filter(o => o.texto);
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
}

function guardarRespuesta(e) {
    const preguntaId = parseInt(e.target.dataset.pregunta);
    const valor = e.target.type === 'radio' ? e.target.value : e.target.value.trim();
    respuestas[preguntaId] = valor;
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
    if (examenEntregado) return;
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

    const tiempoTomado = Math.floor((totalSegundos - segundosRestantes) / 60);

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
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        examenEntregado = false;
        document.getElementById('btnEntregar').disabled = false;
        document.getElementById('btnEntregar').innerHTML =
            '<i class="bi bi-check2-square me-2"></i>Entregar Examen';
    }
}

// ---- Mostrar resultados ----
function mostrarResultados(data) {
    document.getElementById('botoneraEnviar').style.display = 'none';
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

cargarExamen();
