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
    const esArrastre = this.value === 'arrastre';
    const mostrarOpciones = esMultiple || esArrastre;
    document.getElementById('opcionesContainer').style.display = mostrarOpciones ? 'flex' : 'none';
    document.getElementById('ordenArrastreContainer').style.display = esArrastre ? 'block' : 'none';
    document.getElementById('respuesta_correcta_select').style.display = esMultiple ? 'block' : 'none';
    document.getElementById('respuesta_correcta_text').style.display = (!esMultiple && !esArrastre) ? 'block' : 'none';
    if (esMultiple) {
        document.getElementById('labelRespuesta').textContent = 'Respuesta Correcta';
    } else if (esArrastre) {
        document.getElementById('labelRespuesta').textContent = 'Relación de columnas';
    } else {
        document.getElementById('labelRespuesta').textContent = 'Respuesta Correcta (texto)';
    }
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
    document.getElementById('ordenArrastreContainer').style.display = 'none';
    document.getElementById('labelRespuesta').textContent = 'Respuesta Correcta';
    modalPregunta.show();
});
// ---- Guardar (crear o editar) ----
document.getElementById('formPregunta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo').value;
    let respuestaCorrecta, arrastre_targets;
    if (tipo === 'arrastre') {
        const t1 = document.getElementById('target_1').value;
        const t2 = document.getElementById('target_2').value;
        const t3 = document.getElementById('target_3').value;
        const t4 = document.getElementById('target_4').value;
        const m1 = document.getElementById('match_1').value;
        const m2 = document.getElementById('match_2').value;
        const m3 = document.getElementById('match_3').value;
        const m4 = document.getElementById('match_4').value;
        arrastre_targets = JSON.stringify([t1, t2, t3, t4]);
        respuestaCorrecta = [m1, m2, m3, m4].join(',');
    } else if (tipo === 'opcion_multiple') {
        respuestaCorrecta = document.getElementById('respuesta_correcta_select').value;
    } else {
        respuestaCorrecta = document.getElementById('respuesta_correcta_text').value;
    }
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
        tema_retroalimentacion: document.getElementById('tema_retroalimentacion').value,
        arrastre_targets: arrastre_targets
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
            showAlertSuccess('¡Éxito!', result.message);
            cargarPreguntas();
        } else {
            showAlertError('Error', result.message);
        }
    } catch (error) {
        showAlertError('Error de conexión', 'No se pudo conectar con el servidor.');
    }
});
let todasPreguntas = [];

function renderPreguntas(lista) {
    const contenedor = document.getElementById('contenedorPreguntas');
    contenedor.innerHTML = '';
    if (lista.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12">
                <div class="alert alert-secondary text-center rounded-4 p-5">
                    <i class="bi bi-journal-x display-4 d-block mb-3 text-muted"></i>
                    <p class="mb-0 fs-5">No hay preguntas para esta materia.</p>
                </div>
            </div>`;
        return;
    }
    lista.forEach(p => {
        const badgeColor = p.tipo === 'opcion_multiple' ? 'bg-primary' : 'bg-warning text-dark';
        const tipoTexto = p.tipo === 'opcion_multiple' ? 'Opción Múltiple' : 'Arrastrar';
        let opcionesHTML;
        if (p.tipo === 'opcion_multiple') {
            opcionesHTML = `<div class="mt-2">
                   ${['A', 'B', 'C', 'D'].filter(l => p[`opcion_${l.toLowerCase()}`]).map(l =>
                       `<span class="opcion-item ${p.respuesta_correcta === l ? 'bg-success text-white' : 'bg-light'} me-1">
                            ${l}) ${p[`opcion_${l.toLowerCase()}`]}
                        </span>`
                   ).join('')}
               </div>`;
        } else if (p.tipo === 'arrastre') {
            let targets = ['','','',''];
            try { targets = JSON.parse(p.arrastre_targets) || targets; } catch(e) {}
            const orden = p.respuesta_correcta ? p.respuesta_correcta.split(',') : [];
            opcionesHTML = `<div class="mt-2">
                <small class="text-muted fw-bold d-block mb-1"><i class="bi bi-arrows-move me-1"></i>Relación correcta:</small>
                <div class="d-flex flex-column gap-1">
                ${targets.map((t, idx) => {
                    if (!t) return '';
                    const letra = orden[idx] || '';
                    const itemTxt = p[`opcion_${letra.toLowerCase()}`] || '';
                    return `<div class="d-flex align-items-center gap-2 small">
                        <span class="badge bg-dark rounded-circle" style="min-width:22px;">${idx+1}</span>
                        <span class="flex-grow-1">${t}</span>
                        <i class="bi bi-arrow-right text-primary"></i>
                        <span class="badge bg-success">${letra}) ${itemTxt}</span>
                    </div>`;
                }).join('')}
                </div>
            </div>`;
        } else {
            opcionesHTML = `<div class="mt-2 text-muted small">
                   <i class="bi bi-arrows-move me-1"></i> Respuesta: ${p.respuesta_correcta}
               </div>`;
        }
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
}

// ---- Cargar preguntas ----
async function cargarPreguntas() {
    try {
        const response = await fetch(`${API}/preguntas/${usuario.id}`);
        todasPreguntas = await response.json();
        aplicarFiltro();
    } catch (error) {
        document.getElementById('contenedorPreguntas').innerHTML = `<div class="alert alert-danger">Error al cargar preguntas.</div>`;
    }
}

function aplicarFiltro() {
    const materiaId = document.getElementById('filtroMateria').value;
    const filtradas = materiaId === 'todas' ? todasPreguntas : todasPreguntas.filter(p => p.materia_id == materiaId);
    renderPreguntas(filtradas);
}

document.getElementById('filtroMateria').addEventListener('change', aplicarFiltro);
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
        const esArrastre = p.tipo === 'arrastre';
        const esMultiple = p.tipo === 'opcion_multiple';
        document.getElementById('opcionesContainer').style.display = (esMultiple || esArrastre) ? 'flex' : 'none';
        document.getElementById('ordenArrastreContainer').style.display = esArrastre ? 'block' : 'none';
        document.getElementById('respuesta_correcta_select').style.display = esMultiple ? 'block' : 'none';
        document.getElementById('respuesta_correcta_text').style.display = (!esMultiple && !esArrastre) ? 'block' : 'none';
        if (esArrastre) {
            let targets = ['','','',''];
            try { targets = JSON.parse(p.arrastre_targets) || targets; } catch(e) {}
            document.getElementById('target_1').value = targets[0] || '';
            document.getElementById('target_2').value = targets[1] || '';
            document.getElementById('target_3').value = targets[2] || '';
            document.getElementById('target_4').value = targets[3] || '';
            const orden = p.respuesta_correcta ? p.respuesta_correcta.split(',') : ['','','',''];
            document.getElementById('match_1').value = orden[0] || '';
            document.getElementById('match_2').value = orden[1] || '';
            document.getElementById('match_3').value = orden[2] || '';
            document.getElementById('match_4').value = orden[3] || '';
        } else if (esMultiple) {
            document.getElementById('respuesta_correcta_select').value = p.respuesta_correcta;
        } else {
            document.getElementById('respuesta_correcta_text').value = p.respuesta_correcta;
        }
        modalPregunta.show();
    } catch (error) {
        showAlertError('Error', 'No se pudo cargar la pregunta para editar.');
    }
}
// ---- Eliminar ----
async function eliminarPregunta(id) {
    const confirmado = await showAlertConfirm(
        '¿Eliminar esta pregunta?',
        'Esta acción no se puede deshacer.',
        'Sí, eliminar',
        '#dc3545'
    );
    if (confirmado) {
        try {
            const response = await fetch(`${API}/preguntas/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (response.ok) {
                showAlertSuccess('¡Eliminada!', data.message);
                cargarPreguntas();
            } else {
                showAlertError('Error', data.message);
            }
        } catch (error) {
            showAlertError('Error de conexión', 'No se pudo conectar con el servidor.');
        }
    }
}
cargarPreguntas();
