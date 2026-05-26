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
const modalEditarExamen = new bootstrap.Modal(document.getElementById('modalEditarExamen'));
const modalResultados = new bootstrap.Modal(document.getElementById('modalResultados'));
const modalEstudianteStats = new bootstrap.Modal(document.getElementById('modalEstudianteStats'));
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
function renderPreguntasCheckboxes(containerId, preguntas, seleccionadas) {
    const contenedor = document.getElementById(containerId);
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
            <input type="checkbox" class="form-check-input me-3" value="${p.id}" id="${containerId}_${p.id}" ${seleccionadas.includes(p.id) ? 'checked' : ''}>
            <label for="${containerId}_${p.id}" class="form-check-label w-100">
                <strong>${p.texto_pregunta}</strong>
                <span class="badge ${p.tipo === 'opcion_multiple' ? 'bg-primary' : 'bg-warning text-dark'} ms-2">
                    ${p.tipo === 'opcion_multiple' ? 'Opción Múltiple' : 'Arrastrar'}
                </span>
                <small class="d-block text-muted">${p.tema_retroalimentacion}</small>
            </label>
        </div>
    `).join('');
}
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
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm btn-editar-examen" data-id="${e.id}" title="Editar examen">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm btn-resultados-examen" data-id="${e.id}" title="Ver resultados">
                            <i class="bi bi-bar-chart"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm btn-eliminar-examen" data-id="${e.id}" title="Eliminar examen">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.btn-eliminar-examen').forEach(btn => {
            btn.addEventListener('click', () => eliminarExamen(btn.dataset.id));
        });
        document.querySelectorAll('.btn-editar-examen').forEach(btn => {
            btn.addEventListener('click', () => editarExamen(btn.dataset.id));
        });
        document.querySelectorAll('.btn-resultados-examen').forEach(btn => {
            btn.addEventListener('click', () => verResultados(btn.dataset.id));
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
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
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
// ---- Editar examen ----
async function editarExamen(id) {
    try {
        const respDetalle = await fetch(`${API}/examenes/${id}/detalle`);
        if (!respDetalle.ok) throw new Error('Error al cargar examen');
        const examen = await respDetalle.json();
        document.getElementById('editExamenId').value = examen.id;
        document.getElementById('editTituloExamen').value = examen.titulo;
        const apertura = examen.fecha_apertura ? examen.fecha_apertura.substring(0, 16) : '';
        const cierre = examen.fecha_cierre ? examen.fecha_cierre.substring(0, 16) : '';
        document.getElementById('editFechaApertura').value = apertura;
        document.getElementById('editFechaCierre').value = cierre;
        document.getElementById('editTiempoLimite').value = examen.tiempo_limite_minutos;
        const preguntasExamen = examen.preguntas || [];
        const respPregs = await fetch(`${API}/preguntas-por-materia/${usuario.id}/${aulaMateriaId}`);
        if (!respPregs.ok) throw new Error('Error al cargar preguntas');
        const preguntas = await respPregs.json();
        renderPreguntasCheckboxes('editListaPreguntas', preguntas, preguntasExamen);
        modalEditarExamen.show();
    } catch (error) {
        console.error('Error en editarExamen:', error);
        Swal.fire('Error', 'No se pudo cargar el examen para editar.', 'error');
    }
}
document.getElementById('formEditarExamen').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editExamenId').value;
    const checkboxes = document.querySelectorAll('#editListaPreguntas input[type="checkbox"]:checked');
    const preguntas = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const data = {
        titulo: document.getElementById('editTituloExamen').value,
        fecha_apertura: document.getElementById('editFechaApertura').value,
        fecha_cierre: document.getElementById('editFechaCierre').value,
        tiempo_limite_minutos: parseInt(document.getElementById('editTiempoLimite').value),
        preguntas
    };
    try {
        const response = await fetch(`${API}/examenes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            modalEditarExamen.hide();
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            Swal.fire('¡Actualizado!', result.message, 'success');
            cargarExamenes();
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
});
// ---- Ver resultados ----
async function verResultados(examenId) {
    try {
        const resp = await fetch(`${API}/examenes/${examenId}/resultados`);
        if (!resp.ok) throw new Error('Error al cargar resultados');
        const data = await resp.json();
        const examenes = await (await fetch(`${API}/examenes/${aulaId}`)).json();
        const examen = examenes.find(e => e.id == examenId);
        document.getElementById('resultadosTituloExamen').textContent = examen ? examen.titulo : 'Resultados';
        const tbody = document.getElementById('cuerpoResultados');
        if (data.resultados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Aún no hay resultados para este examen.</td></tr>`;
        } else {
            tbody.innerHTML = data.resultados.map(r => `
                <tr>
                    <td>${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ''}</td>
                    <td>
                        <span class="badge ${parseFloat(r.calificacion) >= 6 ? 'bg-success' : 'bg-danger'} fs-6">
                            ${parseFloat(r.calificacion).toFixed(1)} / 10
                        </span>
                    </td>
                    <td>${new Date(r.fecha_realizacion).toLocaleString()}</td>
                </tr>
            `).join('');
        }
        modalResultados.show();
    } catch (error) {
        console.error('Error en verResultados:', error);
        Swal.fire('Error', 'No se pudieron cargar los resultados.', 'error');
    }
}
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
// ---- Cargar estudiantes aceptados ----
async function cargarEstudiantes() {
    const contenedor = document.getElementById('contenedorEstudiantes');
    try {
        const response = await fetch(`${API}/aulas/${aulaId}/estudiantes`);
        if (!response.ok) throw new Error('Error al cargar estudiantes');
        const estudiantes = await response.json();
        if (estudiantes.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="bi bi-people display-4 mb-3 text-secondary d-block"></i>
                    <p class="fs-5">No hay estudiantes inscritos.</p>
                </div>`;
            return;
        }
        contenedor.innerHTML = estudiantes.map(e => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2 estudiante-item" data-id="${e.id}" style="cursor:pointer;">
                <div>
                    <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-circle text-warning me-2"></i>${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ''}</h6>
                </div>
                <button class="btn btn-outline-warning btn-sm btn-ver-stats" data-id="${e.id}" data-nombre="${e.nombre} ${e.apellido_paterno}" title="Ver estadísticas">
                    <i class="bi bi-graph-up"></i>
                </button>
            </div>
        `).join('');
        document.querySelectorAll('.btn-ver-stats').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                verEstadisticas(btn.dataset.id, btn.dataset.nombre);
            });
        });
    } catch (error) {
        console.error('Error al cargar estudiantes:', error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar estudiantes.</div>`;
    }
}

// ---- Ver estadisticas de un estudiante ----
async function verEstadisticas(estudianteId, nombre) {
    document.getElementById('statsNombreEstudiante').textContent = nombre;
    document.getElementById('cuerpoStatsExamenes').innerHTML = '<tr><td colspan="5" class="text-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Cargando...</td></tr>';
    modalEstudianteStats.show();
    try {
        const response = await fetch(`${API}/aulas/${aulaId}/estudiantes/${estudianteId}/estadisticas`);
        if (!response.ok) throw new Error('Error al cargar estadísticas');
        const data = await response.json();
        document.getElementById('statsCompletados').textContent = data.examenes_completados;
        document.getElementById('statsPendientes').textContent = data.examenes_pendientes;
        const promedioEl = document.getElementById('statsPromedio');
        if (data.promedio !== null) {
            promedioEl.textContent = data.promedio.toFixed(1);
            promedioEl.className = 'fw-bold mb-0 ' + (data.promedio >= 6 ? 'text-success' : 'text-danger');
        } else {
            promedioEl.textContent = '-';
            promedioEl.className = 'fw-bold mb-0 text-muted';
        }
        const tbody = document.getElementById('cuerpoStatsExamenes');
        if (data.examenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay exámenes en esta aula.</td></tr>';
        } else {
            tbody.innerHTML = data.examenes.map(ex => {
                if (ex.completado) {
                    const tiempo = ex.tiempo_tomado ? `${Math.floor(ex.tiempo_tomado / 60)}:${String(ex.tiempo_tomado % 60).padStart(2, '0')} min` : '-';
                    return `
                        <tr>
                            <td>${ex.titulo}</td>
                            <td><span class="badge bg-success">Completado</span></td>
                            <td><span class="badge ${parseFloat(ex.calificacion) >= 6 ? 'bg-success' : 'bg-danger'}">${parseFloat(ex.calificacion).toFixed(1)}</span></td>
                            <td>${tiempo}</td>
                            <td>${new Date(ex.fecha_realizacion).toLocaleString()}</td>
                        </tr>
                    `;
                }
                return `
                    <tr>
                        <td>${ex.titulo}</td>
                        <td><span class="badge bg-secondary">Pendiente</span></td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error en verEstadisticas:', error);
        document.getElementById('cuerpoStatsExamenes').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar estadísticas.</td></tr>';
    }
}

async function responderSolicitud(solicitud_id, estado) {
    try {
        const response = await fetch(`${API}/aulas/responder-solicitud`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solicitud_id: parseInt(solicitud_id), estado })
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
cargarEstudiantes();
