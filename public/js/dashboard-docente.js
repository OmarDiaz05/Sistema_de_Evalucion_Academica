
document.addEventListener('DOMContentLoaded', () => {
    
    //busca datos memoria navegador
    const usuarioStr = localStorage.getItem('usuarioLogueado');
    
    //Seguridad: Si alguien entra a esta página sin iniciar sesión, lo rebotamos al login
    if (!usuarioStr) {
        window.location.href = '/login.html';
        return;
    }

    const usuario = JSON.parse(usuarioStr);

    document.getElementById('nombreDocente').textContent = `¡Bienvenido, Maestro ${usuario.nombre} ${usuario.apellido}!`;

    // --- LÓGICA PARA CREAR AULA ---
    const btnCrearAula = document.getElementById('btnCrearAula');
    const modalCrearAula = new bootstrap.Modal(document.getElementById('modalCrearAula'));
    const formCrearAula = document.getElementById('formCrearAula');

    btnCrearAula.addEventListener('click', () => modalCrearAula.show());

    formCrearAula.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombreAula').value;
        const materia_id = document.getElementById('materiaAula').value;
        const docente_id = usuario.id; 

        try {
            const response = await fetch('http://localhost:3000/api/crear-aula', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, materia_id, docente_id })
            });

            const data = await response.json();

            if (response.ok) {
                modalCrearAula.hide();
                formCrearAula.reset();
                
                // --- ALERTA LLAMATIVA CON SWEETALERT2 
                Swal.fire({
                    title: '¡Aula Creada con Éxito!',
                    html: `El código de acceso para tus alumnos es:<br><br>
                    <strong class="codigo-destacado">${data.codigo_clase}</strong>`,
                    icon: 'success',
                    confirmButtonText: '¡Entendido!',
                    confirmButtonColor: '#198754'
                });

                // Recargamos las aulas para que aparezca la nueva inmediatamente
                cargarAulas();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Hubo un problema de conexión.', 'error');
        }
    });

    // --- LÓGICA PARA MOSTRAR LAS AULAS ---
    async function cargarAulas() {
        const contenedor = document.getElementById('contenedorAulas');
        
        try {
            // Le pedimos a Node las aulas de ESTE maestro
            const response = await fetch(`http://localhost:3000/api/aulas/${usuario.id}`);
            const aulas = await response.json();

            // Limpiamos el contenedor
            contenedor.innerHTML = '';

            // Si no tiene aulas, mostramos un mensaje bonito
            if (aulas.length === 0) {
                contenedor.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-secondary text-center rounded-4 p-4">
                            <i class="bi bi-info-circle display-4 d-block mb-3 text-muted"></i>
                            <p class="mb-0 fs-5">Aún no tienes aulas creadas. ¡Crea tu primer grupo para comenzar!</p>
                        </div>
                    </div>`;
                return;
            }

        // Si tiene aulas, dibujamos una tarjeta por cada una
            aulas.forEach(aula => {
                const tarjeta = `
                    <div class="col-md-6 col-lg-4 mb-4" id="aula-${aula.id}">
                        <div class="card card-aula-docente h-100 shadow-sm">
                            <div class="card-body d-flex flex-column">
                                <div class="d-flex align-items-center gap-3 mb-3">
                                    <div class="aula-icon bg-primary bg-opacity-10 text-primary">
                                        <i class="bi bi-mortarboard-fill"></i>
                                    </div>
                                    <div>
                                        <h5 class="fw-bold text-dark mb-0">${aula.nombre}</h5>
                                        <span class="badge bg-primary bg-opacity-10 text-primary">${aula.materia_nombre}</span>
                                    </div>
                                </div>
                                <div class="bg-light p-3 rounded-3 text-center mb-3 border">
                                    <span class="d-block text-muted small mb-1">Código de Clase</span>
                                    <span class="fs-4 fw-bold font-monospace text-dark">${aula.codigo_clase}</span>
                                </div>
                                <div class="mt-auto row g-2">
                                    <div class="col-8">
                                        <button class="btn btn-primary w-100 fw-bold" onclick="window.location.href='aula-docente.html?id=${aula.id}'">
                                            <i class="bi bi-box-arrow-in-right"></i> Entrar
                                        </button>
                                    </div>
                                    <div class="col-4">
                                        <button class="btn btn-outline-danger w-100" onclick="eliminarAula(${aula.id})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                contenedor.innerHTML += tarjeta;
            });

        } catch (error) {
            console.error('Error al cargar aulas:', error);
            contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar la información.</div>`;
        }
    }

    // --- LÓGICA PARA ELIMINAR UN AULA ---
    window.eliminarAula = async (id) => {
        // Alerta de confirmación llamativa 
        Swal.fire({
            title: '¿Estás seguro de eliminar esta aula?',
            text: "Esta acción no se puede deshacer y se perderán los datos asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545', 
            cancelButtonColor: '#6c757d',  
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            // Si se confirma que se borra
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`http://localhost:3000/api/borrar-aula/${id}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (response.ok) {
                        Swal.fire(
                            '¡Eliminada!',
                            'El aula ha sido borrada correctamente.',
                            'success'
                        );
                        // Volvemos a cargar las aulas para actualizar la pantalla
                        cargarAulas();
                    } else {
                        Swal.fire('Error', data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    Swal.fire('Error', 'Hubo un problema al conectar con el servidor.', 'error');
                }
            }
        });
    };
    cargarAulas();

}); // Fin del DOMContentLoaded


