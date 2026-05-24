let usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuario) {
    window.location.href = '/login.html';
}
const API = `http://localhost:3000/api`;
let editando = false;
const modalPregunta = new bootstrap.Modal(document.getElementById('modalPregunta'));
// ---- Mostrar/ocultar campos según tipo ----
document.getElementById('tipo').addEventListener('change', function () {
    const esMultiple = this.value === 'opcion_multiple';
    document.getElementById('opcionesContainer').style.display = esMultiple ? 'flex' : 'none';
    document.getElementById('respuesta_correcta_select').style.display = esMultiple ? 'block' : 'none';
    document.getElementById('respuesta_correcta_text').style.display = esMultiple ? 'none' : 'block';
    document.getElementById('labelRespuesta').textContent = esMultiple ? 'Respuesta Correcta' : 'Respuesta Correcta (texto)';
});
// ---- Botón nueva pregunta ----
document.getElementById('btnNuevaPregunta').addEventListener('click', () => {
    editando = false;
    document.getElementById('tituloAccion').textContent = 'Nueva';
    document.getElementById('formPregunta').reset();
    document.getElementById('preguntaId').value = '';
    document.getElementById('opcionesContainer').style.display = 'flex';
    document.getElementById('respuesta_correcta_select').style.display = 'block';
    document.getElementById('respuesta_correcta_text').style.display = 'none';
    modalPregunta.show();
});
// ---- Guardar (crear o editar) ----
document.getElementById('formPregunta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo').value;
    const respuestaCorrecta = tipo === 'opcion_multiple'
        ? document.getElementById('respuesta_correcta_select').value
        : document.getElementById('respuesta_correcta_text').value;
    const data = {
        materia_id: document.getElementById('materia_id').value,
        docente_id: usuario.id,
        texto_pregunta: document.getElementById('texto_pregunta').value,
        tipo,
        opcion_a: document.getElementById('opcion_a').value,
        opcion_b: document.getElementById('opcion_b').value,
        opcion_c: document.getElementById('opcion_c').value,
        opcion_d: document.getElementById('opcion_d').value,
        respuesta_correcta: respuestaCorrecta,
        tema_retroalimentacion: document.getElementById('tema_retroalimentacion').value
    };
    try {
        const id = document.getElementById('preguntaId').value;
        const url = id ? `${API}/preguntas/${id}` : `${API}/preguntas`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            modalPregunta.hide();
            Swal.fire('¡Éxito!', result.message, 'success');
            cargarPreguntas();
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
});
// ---- Cargar preguntas ----
async function cargarPreguntas() {
    const contenedor = document.getElementById('contenedorPreguntas');
    try {
        const response = await fetch(`${API}/preguntas/${usuario.id}`);
        const preguntas = await response.json();
        contenedor.innerHTML = '';
        if (preguntas.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-secondary text-center rounded-4 p-5">
                        <i class="bi bi-journal-x display-4 d-block mb-3 text-muted"></i>
                        <p class="mb-0 fs-5">Aún no tienes preguntas registradas. ¡Crea tu primera pregunta!</p>
                    </div>
                </div>`;
            return;
        }
        preguntas.forEach(p => {
            const badgeColor = p.tipo === 'opcion_multiple' ? 'bg-primary' : 'bg-warning text-dark';
            const tipoTexto = p.tipo === 'opcion_multiple' ? 'Opción Múltiple' : 'Arrastrar';
            const opcionesHTML = p.tipo === 'opcion_multiple'
                ? `<div class="mt-2">
                       ${['A', 'B', 'C', 'D'].filter(l => p[`opcion_${l.toLowerCase()}`]).map(l =>
                           `<span class="opcion-item ${p.respuesta_correcta === l ? 'bg-success text-white' : 'bg-light'} me-1">
                                ${l}) ${p[`opcion_${l.toLowerCase()}`]}
                            </span>`
                       ).join('')}
                   </div>`
                : `<div class="mt-2 text-muted small">
                       <i class="bi bi-arrows-move me-1"></i> Respuesta: ${p.respuesta_correcta}
                   </div>`;
            const tarjeta = `
                <div class="col-md-6 mb-3">
                    <div class="card card-pregunta shadow-sm h-100 p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge badge-tipo ${badgeColor}">${tipoTexto}</span>
                            <span class="badge bg-secondary">${p.materia_nombre}</span>
                        </div>
                        <p class="pregunta-texto fw-semibold mb-2">${p.texto_pregunta}</p>
                        ${opcionesHTML}
                        <div class="mt-2 text-muted small">
                            <i class="bi bi-book me-1"></i>${p.tema_retroalimentacion}
                        </div>
                        <div class="mt-3 d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm fw-bold btn-editar" data-id="${p.id}">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="btn btn-outline-danger btn-sm fw-bold btn-eliminar" data-id="${p.id}">
                                <i class="bi bi-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>`;
            contenedor.innerHTML += tarjeta;
        });
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => editarPregunta(btn.dataset.id));
        });
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', () => eliminarPregunta(btn.dataset.id));
        });
    } catch (error) {
        contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar preguntas.</div>`;
    }
}
// ---- Editar ----
async function editarPregunta(id) {
    try {
        const response = await fetch(`${API}/preguntas/${usuario.id}`);
        const preguntas = await response.json();
        const p = preguntas.find(q => q.id == id);
        if (!p) return;
        editando = true;
        document.getElementById('tituloAccion').textContent = 'Editar';
        document.getElementById('preguntaId').value = p.id;
        document.getElementById('materia_id').value = p.materia_id;
        document.getElementById('tipo').value = p.tipo;
        document.getElementById('texto_pregunta').value = p.texto_pregunta;
        document.getElementById('opcion_a').value = p.opcion_a || '';
        document.getElementById('opcion_b').value = p.opcion_b || '';
        document.getElementById('opcion_c').value = p.opcion_c || '';
        document.getElementById('opcion_d').value = p.opcion_d || '';
        document.getElementById('tema_retroalimentacion').value = p.tema_retroalimentacion;
        const esMultiple = p.tipo === 'opcion_multiple';
        document.getElementById('opcionesContainer').style.display = esMultiple ? 'flex' : 'none';
        document.getElementById('respuesta_correcta_select').style.display = esMultiple ? 'block' : 'none';
        document.getElementById('respuesta_correcta_text').style.display = esMultiple ? 'none' : 'block';
        if (esMultiple) {
            document.getElementById('respuesta_correcta_select').value = p.respuesta_correcta;
        } else {
            document.getElementById('respuesta_correcta_text').value = p.respuesta_correcta;
        }
        modalPregunta.show();
    } catch (error) {
        Swal.fire('Error', 'No se pudo cargar la pregunta.', 'error');
    }
}
// ---- Eliminar ----
function eliminarPregunta(id) {
    Swal.fire({
        title: '¿Eliminar esta pregunta?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API}/preguntas/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) {
                    Swal.fire('¡Eliminada!', data.message, 'success');
                    cargarPreguntas();
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión.', 'error');
            }
        }
    });
}
cargarPreguntas();