document.addEventListener('DOMContentLoaded', () => {

    // 1. Extraemos el ID del aula directamente de la barra de direcciones (URL)
    const urlParams = new URLSearchParams(window.location.search);
    const aulaId = urlParams.get('id');

    // Seguridad extra: Si alguien intenta entrar a la página sin el ID del aula, lo regresamos
    if (!aulaId) {
        window.location.href = 'dashboard-docente.html';
        return;
    }

    const contenedor = document.getElementById('contenedorSolicitudes');

    // --- FUNCIÓN PARA CARGAR LOS ALUMNOS PENDIENTES ---
    async function cargarSolicitudes() {
        try {
            const response = await fetch(`http://localhost:3000/aulas/${aulaId}/solicitudes`);
            const alumnos = await response.json();

            // Si no hay nadie en espera, volvemos a poner nuestro diseño limpio
            if (alumnos.length === 0) {
                contenedor.innerHTML = `
                    <div class="text-center text-muted my-5">
                        <i class="bi bi-inbox display-4 mb-3 text-secondary d-block"></i>
                        <p class="fs-5">Aún no hay solicitudes de alumnos.</p>
                    </div>`;
                return;
            }

            // Si hay alumnos, limpiamos el contenedor y los dibujamos
            contenedor.innerHTML = '';
            
            alumnos.forEach(alumno => {
                const fila = `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-3">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-badge text-primary me-2"></i>${alumno.nombre} ${alumno.apellido_paterno}</h6>
                            <small class="text-muted">Solicita unirse al aula</small>
                        </div>
                        <div>
                            <button class="btn btn-success btn-sm me-2 shadow-sm" onclick="responderSolicitud(${alumno.id}, 'aceptado')" title="Aceptar">
                                <i class="bi bi-check-lg fw-bold"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm shadow-sm" onclick="responderSolicitud(${alumno.id}, 'rechazado')" title="Rechazar">
                                <i class="bi bi-x-lg fw-bold"></i>
                            </button>
                        </div>
                    </div>
                `;
                contenedor.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            contenedor.innerHTML = `<div class="alert alert-danger">Problemas al conectar con el servidor.</div>`;
        }
    }
    // La hacemos global (window)
    window.responderSolicitud = async (estudiante_id, estado) => {
        try {
            const response = await fetch('http://localhost:3000/aulas/responder-solicitud', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estudiante_id, aula_id: aulaId, estado })
            });

            if (response.ok) {
                // Pequeña alerta no intrusiva de éxito
                Swal.fire({
                    title: estado === 'aceptado' ? '¡Alumno Aceptado!' : 'Solicitud Rechazada',
                    icon: estado === 'aceptado' ? 'success' : 'info',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                // Recargamos la lista para que ese alumno desaparezca de la cola
                cargarSolicitudes();
            }
        } catch (error) {
            console.error('Error al procesar:', error);
            Swal.fire('Error', 'Hubo un problema de red.', 'error');
        }
    };
    cargarSolicitudes();

}); 