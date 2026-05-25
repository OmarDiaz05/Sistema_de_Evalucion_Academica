const API = 'http://localhost:3000/api';
const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuario) {
    window.location.href = '/login.html';
}
const params = new URLSearchParams(window.location.search);
const aulaId = params.get('id');
if (!aulaId) {
    window.location.href = '/dashboard-docente.html';
}
let aulaMateriaId = null;
const modalExamen = new bootstrap.Modal(document.getElementById('modalExamen'));
// ---- Obtener info del aula ----
async function cargarInfoAula() {
    try {
        const response = await fetch(`${API}/aula-detalle/${aulaId}`);
        if (!response.ok) {
            throw new Error('Error al cargar aula');
        }
        const aula = await response.json();
        document.getElementById('nombreAulaHeader').textContent = aula.nombre;
        aulaMateriaId = aula.materia_id;
        cargarPreguntasDisponibles();
    } catch (error) {
        document.getElementById('nombreAulaHeader').textContent = 'Error al cargar aula';
    }
}
// ---- Cargar preguntas disponibles para seleccionar ----
async function cargarPreguntasDisponibles() {
    const contenedor = document.getElementById('listaPreguntas');
    if (!aulaMateriaId) {
        contenedor.innerHTML = '<div class="alert alert-warning">Esperando información del aula...</div>';
        return;
    }
    try {
        const response = await fetch(`${API}/preguntas-por-materia/${usuario.id}/${aulaMateriaId}`);
        if (!response.ok) {
            throw new Error('Error al cargar preguntas');
        }
        const preguntas = await response.json();
        if (preguntas.length === 0) {
            contenedor.innerHTML = `
                <div class="sin-preguntas-msg text-center">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    No tienes preguntas en el banco para esta materia.
                    <a href="banco-preguntas.html" class="d-block mt-2">Ir al Banco de Preguntas</a>
                </div>`;
            return;
        }
        contenedor.innerHTML = preguntas.map(p => `
            <div class="pregunta-check-item d-flex align-items-center mb-2">
                <input type="checkbox" class="form-check-input me-3" value="${p.id}" id="preg_${p.id}">
                <label for="preg_${p.id}" class="form-check-label w-100">
                    <strong>${p.texto_pregunta}</strong>
                    <span class="badge ${p.tipo === 'opcion_multiple' ? 'bg-primary' : 'bg-warning text-dark'} ms-2">
                        ${p.tipo === 'opcion_multiple' ? 'Opción Múltiple' : 'Arrastrar'}
                    </span>
                    <small class="d-block text-muted">${p.tema_retroalimentacion}</small>
                </label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error en cargarPreguntasDisponibles:', error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar preguntas.</div>`;
    }
}
// ---- Cargar exámenes del aula ----
async function cargarExamenes() {
    const contenedor = document.getElementById('contenedorExamenes');
    try {
        const response = await fetch(`${API}/examenes/${aulaId}`);
        if (!response.ok) {
            throw new Error('Error al cargar exámenes');
        }
        const examenes = await response.json();
        if (examenes.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="bi bi-journal-x display-4 mb-3 text-secondary"></i>
                    <p>Aún no has creado exámenes para este grupo.</p>
                </div>`;
            return;
        }
        contenedor.innerHTML = examenes.map(e => `
            <div class="card card-examen shadow-sm mb-3 p-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="fw-bold mb-1">${e.titulo}</h6>
                        <small class="text-muted d-block">
                            <i class="bi bi-clock me-1"></i>${e.tiempo_limite_minutos} min
                        </small>
                        <small class="text-muted d-block">
                            <i class="bi bi-calendar-event me-1"></i>
                            ${new Date(e.fecha_apertura).toLocaleString()} — ${new Date(e.fecha_cierre).toLocaleString()}
                        </small>
                        <span class="badge bg-info mt-2">${e.total_preguntas} preguntas</span>
                    </div>
                    <button class="btn btn-outline-danger btn-sm btn-eliminar-examen" data-id="${e.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.btn-eliminar-examen').forEach(btn => {
            btn.addEventListener('click', () => eliminarExamen(btn.dataset.id));
        });
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar exámenes.</div>`;
    }
}
// ---- Crear examen ----
document.getElementById('formExamen').addEventListener('submit', async (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('#listaPreguntas input[type="checkbox"]:checked');
    const preguntas = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const data = {
        aula_id: parseInt(aulaId),
        titulo: document.getElementById('tituloExamen').value,
        fecha_apertura: document.getElementById('fechaApertura').value,
        fecha_cierre: document.getElementById('fechaCierre').value,
        tiempo_limite_minutos: parseInt(document.getElementById('tiempoLimite').value),
        preguntas
    };
    try {
        const response = await fetch(`${API}/examenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            modalExamen.hide();
            document.getElementById('formExamen').reset();
            Swal.fire('¡Éxito!', result.message, 'success');
            cargarExamenes();
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
});
// ---- Eliminar examen ----
function eliminarExamen(id) {
    Swal.fire({
        title: '¿Eliminar este examen?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API}/examenes/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) {
                    Swal.fire('¡Eliminado!', data.message, 'success');
                    cargarExamenes();
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión.', 'error');
            }
        }
    });
}
// ---- Cargar solicitudes de alumnos pendientes ----
async function cargarSolicitudes() {
    const contenedor = document.getElementById('contenedorSolicitudes');
    try {
        const response = await fetch(`${API}/aulas/${aulaId}/solicitudes`);
        if (!response.ok) throw new Error('Error al cargar solicitudes');
        const alumnos = await response.json();
        if (alumnos.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="bi bi-inbox display-4 mb-3 text-secondary d-block"></i>
                    <p class="fs-5">Aún no hay solicitudes de alumnos.</p>
                </div>`;
            return;
        }
        contenedor.innerHTML = '';
        alumnos.forEach(alumno => {
            const fila = document.createElement('div');
            fila.className = 'd-flex justify-content-between align-items-center border-bottom py-3';
            fila.innerHTML = `
                <div>
                    <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-badge text-primary me-2"></i>${alumno.nombre} ${alumno.apellido_paterno}</h6>
                    <small class="text-muted">Solicita unirse al aula</small>
                </div>
                <div>
                    <button class="btn btn-success btn-sm me-2 shadow-sm btn-aceptar" data-id="${alumno.id}">
                        <i class="bi bi-check-lg fw-bold"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm shadow-sm btn-rechazar" data-id="${alumno.id}">
                        <i class="bi bi-x-lg fw-bold"></i>
                    </button>
                </div>
            `;
            contenedor.appendChild(fila);
        });
        document.querySelectorAll('.btn-aceptar').forEach(btn => {
            btn.addEventListener('click', () => responderSolicitud(btn.dataset.id, 'aceptado'));
        });
        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', () => responderSolicitud(btn.dataset.id, 'rechazado'));
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        if (error instanceof TypeError) {
            contenedor.innerHTML = `<div class="alert alert-danger">Problemas al conectar con el servidor.</div>`;
        } else {
            contenedor.innerHTML = `<div class="alert alert-danger">Error del servidor: ${error.message}</div>`;
        }
    }
}
async function responderSolicitud(estudiante_id, estado) {
    try {
        const response = await fetch(`${API}/aulas/responder-solicitud`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estudiante_id: parseInt(estudiante_id), aula_id: parseInt(aulaId), estado })
        });
        if (response.ok) {
            Swal.fire({
                title: estado === 'aceptado' ? '¡Alumno Aceptado!' : 'Solicitud Rechazada',
                icon: estado === 'aceptado' ? 'success' : 'info',
                timer: 1500,
                showConfirmButton: false
            });
            cargarSolicitudes();
        } else {
            const result = await response.json();
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        console.error('Error al procesar:', error);
        if (error instanceof TypeError) {
            Swal.fire('Error', 'Hubo un problema de red.', 'error');
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    }
}
// ---- Iniciar ----
document.getElementById('btnCrearExamen').addEventListener('click', () => {
    document.getElementById('formExamen').reset();
    document.getElementById('listaPreguntas').innerHTML = '<div class="text-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Cargando preguntas...</div>';
    modalExamen.show();
    cargarPreguntasDisponibles();
});
cargarInfoAula();
cargarExamenes();
cargarSolicitudes();