document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
            window.location.href = data.redirect;
        } else {
            Swal.fire({
                title: '<span class="fw-bold">Error al iniciar sesión</span>',
                html: '<div class="text-muted" style="font-size:0.95rem">' + data.message + '</div>',
                icon: 'error',
                iconColor: '#dc3545',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#0d6efd',
                customClass: {
                    popup: 'rounded-4 shadow-lg border-0',
                    confirmButton: 'btn btn-primary btn-lg fw-bold px-4 rounded-pill'
                },
                buttonsStyling: false
            });
        }
    } catch (error) {
        Swal.fire({
            title: '<span class="fw-bold">Error de conexión</span>',
            html: '<div class="text-muted" style="font-size:0.95rem">No se pudo conectar con el servidor.<br>Verifica tu conexión e intenta de nuevo.</div>',
            icon: 'error',
            iconColor: '#dc3545',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#0d6efd',
            customClass: {
                popup: 'rounded-4 shadow-lg border-0',
                confirmButton: 'btn btn-primary btn-lg fw-bold px-4 rounded-pill'
            },
            buttonsStyling: false
        });
    }
});