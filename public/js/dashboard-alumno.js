const API = 'http://localhost:3000/api';
const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuario) {
    window.location.href = '/login.html';
}

document.getElementById('nombreAlumno').textContent = `${usuario.nombre} ${usuario.apellido}`;

// ---- Unirse a clase ----
document.getElementById('formUnirseClase').addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('codigoClase').value.trim().toUpperCase();
    try {
        const response = await fetch(`${API}/unirse-aula`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estudiante_id: usuario.id, codigo_clase: codigo })
        });
        const data = await response.json();
        if (response.ok) {
            showAlertSuccess('¡Solicitud enviada!', data.message);
            document.getElementById('codigoClase').value = '';
            bootstrap.Modal.getInstance(document.getElementById('modalUnirse')).hide();
            cargarAulas();
        } else {
            showAlertError('Error', data.message);
        }
    } catch (error) {
        showAlertError('Error de conexión', 'No se pudo conectar con el servidor.');
    }
});

// ---- Cargar aulas del alumno ----
async function cargarAulas() {
    const contenedor = document.getElementById('contenedorAulas');
    try {
        const response = await fetch(`${API}/alumno/aulas/${usuario.id}`);
        const aulas = await response.json();
        contenedor.innerHTML = '';
        if (aulas.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-secondary text-center rounded-4 p-5">
                        <i class="bi bi-inbox display-4 d-block mb-3 text-muted"></i>
                        <p class="mb-0 fs-5">No estás inscrito en ninguna clase. ¡Usa un código para unirte!</p>
                    </div>
                </div>`;
            return;
        }
        for (const aula of aulas) {
            if (aula.estado === 'aceptado') {
                await renderAulaActiva(contenedor, aula);
            } else if (aula.estado === 'pendiente') {
                renderAulaPendiente(contenedor, aula);
            }
        }
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar aulas.</div>`;
    }
}

async function renderAulaActiva(contenedor, aula) {
    let examenesHTML = '<p class="text-muted small mb-0">No hay exámenes disponibles.</p>';
    try {
        const res = await fetch(`${API}/alumno/examenes-pendientes/${aula.id}/${usuario.id}`);
        const examenes = await res.json();
        if (examenes.length > 0) {
            examenesHTML = examenes.map(ex => {
                const ahora = new Date();
                const apertura = new Date(ex.fecha_apertura);
                const cierre = new Date(ex.fecha_cierre);
                let boton = '';
                let estadoBadge = '';
                if (ahora < apertura) {
                    estadoBadge = '<span class="badge bg-secondary">Próximo</span>';
                    boton = `<button class="btn btn-secondary btn-sm w-100 mt-2" disabled>No disponible aún</button>`;
                } else if (ahora > cierre) {
                    estadoBadge = '<span class="badge bg-danger">Cerrado</span>';
                    boton = `<button class="btn btn-secondary btn-sm w-100 mt-2" disabled>Examen cerrado</button>`;
                } else {
                    estadoBadge = '<span class="badge bg-success">Disponible</span>';
                    boton = `<button class="btn btn-primary btn-sm w-100 mt-2 btn-entrar-examen" data-id="${ex.id}">Entrar al examen</button>`;
                }
                return `
                    <div class="border rounded p-2 mb-2 bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${ex.titulo}</strong> ${estadoBadge}
                        </div>
                        <small class="text-muted">
                            ${ex.tiempo_limite_minutos} min | ${new Date(ex.fecha_apertura).toLocaleDateString()} - ${new Date(ex.fecha_cierre).toLocaleDateString()}
                        </small>
                        ${boton}
                    </div>`;
            }).join('');
        }
    } catch (e) {}
    const tarjeta = document.createElement('div');
    tarjeta.className = 'col';
    tarjeta.innerHTML = `
        <div class="card h-100 card-aula shadow-sm">
            <div class="card-header bg-dark text-white p-3 d-flex align-items-center gap-3">
                <div class="aula-icon bg-white bg-opacity-10 text-white">
                    <i class="bi bi-mortarboard-fill"></i>
                </div>
                <div>
                    <span class="badge bg-success mb-1">Activa</span>
                    <h5 class="card-title mb-0 fs-6">${aula.aula_nombre}</h5>
                    <small class="text-white-50">Prof. ${aula.docente_nombre} · ${aula.materia_nombre}</small>
                </div>
            </div>
            <div class="card-body">
                ${examenesHTML}
            </div>
        </div>`;
    contenedor.appendChild(tarjeta);
}

function renderAulaPendiente(contenedor, aula) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'col';
    tarjeta.innerHTML = `
        <div class="card h-100 card-aula shadow-sm opacity-75">
            <div class="card-header bg-secondary text-white p-3 d-flex align-items-center gap-3">
                <div class="aula-icon bg-white bg-opacity-10 text-white">
                    <i class="bi bi-hourglass-split"></i>
                </div>
                <div>
                    <span class="badge bg-warning text-dark mb-1"><i class="bi bi-clock-history me-1"></i> Pendiente</span>
                    <h5 class="card-title mb-0 fs-6">${aula.aula_nombre}</h5>
                    <small class="text-white-50">${aula.materia_nombre}</small>
                </div>
            </div>
            <div class="card-body">
                <p class="card-text text-muted small">El docente recibió tu solicitud. Podrás ingresar en cuanto sea aceptada.</p>
                <button class="btn btn-secondary w-100" disabled><i class="bi bi-lock-fill me-1"></i> Acceso Restringido</button>
            </div>
        </div>`;
    contenedor.appendChild(tarjeta);
}

// ---- Delegación de eventos para botones "Entrar al examen" ----
document.getElementById('contenedorAulas').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-entrar-examen');
    if (btn) {
        window.location.href = `examen.html?id=${btn.dataset.id}`;
    }
});

// ---- Cerrar sesión ----
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    localStorage.removeItem('usuarioLogueado');
    window.location.href = '/login.html';
});

cargarAulas();
