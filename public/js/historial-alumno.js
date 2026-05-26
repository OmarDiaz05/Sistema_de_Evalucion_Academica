const API = 'http://localhost:3000/api';
const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
if (!usuario) {
    window.location.href = '/login.html';
}

async function cargarHistorial() {
    const contenedor = document.getElementById('contenedorHistorial');
    try {
        const response = await fetch(`${API}/alumno/historial/${usuario.id}`);
        if (!response.ok) throw new Error('Error al cargar historial');
        const aulas = await response.json();
        if (aulas.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted my-5">
                    <i class="bi bi-journal-x display-4 mb-3 text-secondary d-block"></i>
                    <p class="fs-5">Aún no has realizado ningún examen.</p>
                    <a href="dashboard-alumno.html" class="btn btn-primary">Ir a mis clases</a>
                </div>`;
            return;
        }
        contenedor.innerHTML = aulas.map(aula => {
            const totalCalifs = aula.examenes.filter(e => e.calificacion != null).length;
            const suma = aula.examenes.filter(e => e.calificacion != null).reduce((s, e) => s + parseFloat(e.calificacion), 0);
            const promedio = totalCalifs > 0 ? (suma / totalCalifs).toFixed(1) : '-';
            return `
                <div class="card shadow-sm border-0 rounded-4 mb-4">
                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="fw-bold mb-0"><i class="bi bi-book me-2"></i>${aula.aula_nombre}</h5>
                            <small class="text-white-50">${aula.materia_nombre} · Prof. ${aula.docente_nombre}</small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-info fs-6">Promedio: ${promedio}</span>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Examen</th>
                                        <th>Calificación</th>
                                        <th>Aciertos</th>
                                        <th>Tiempo</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${aula.examenes.map(ex => {
                                        const pct = ex.total_preguntas > 0 ? Math.round((ex.correctas / ex.total_preguntas) * 100) : 0;
                                        const t = ex.tiempo_tomado;
                                        const tiempo = t ? `${Math.floor(t / 60)}m ${t % 60}s` : '-';
                                        return `
                                            <tr>
                                                <td class="fw-medium">${ex.titulo}</td>
                                                <td>
                                                    <span class="badge ${parseFloat(ex.calificacion) >= 6 ? 'bg-success' : 'bg-danger'} fs-6">
                                                        ${parseFloat(ex.calificacion).toFixed(1)}
                                                    </span>
                                                </td>
                                                <td>${ex.correctas} / ${ex.total_preguntas} (${pct}%)</td>
                                                <td>${tiempo}</td>
                                                <td><small class="text-muted">${new Date(ex.fecha_realizacion).toLocaleString()}</small></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error al cargar historial:', error);
        contenedor.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-triangle display-4 d-block mb-3"></i>
                <p>Error al cargar el historial.</p>
                <a href="dashboard-alumno.html" class="btn btn-primary">Volver</a>
            </div>`;
    }
}

cargarHistorial();
