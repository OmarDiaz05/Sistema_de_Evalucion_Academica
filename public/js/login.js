document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('#togglePassword i');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
});

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
            showAlertError('Error al iniciar sesión', data.message);
        }
    } catch (error) {
        showAlertError('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }
});
