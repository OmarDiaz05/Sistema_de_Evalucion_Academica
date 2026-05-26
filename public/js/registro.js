document.getElementById('rol').addEventListener('change', function() {
    document.getElementById('campoMatricula').style.display = this.value === 'docente' ? 'block' : 'none';
});
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rol = document.getElementById('rol').value;
    const matricula = document.getElementById('matricula').value;
    if (rol === 'docente' && !matricula.trim()) {
        showAlertError('Campo requerido', 'La matrícula es obligatoria para registrarse como docente');
        return;
    }
    const data = {
        nombre: document.getElementById('nombre').value,
        apellido_paterno: document.getElementById('apellidoPaterno').value,
        apellido_materno: document.getElementById('apellidoMaterno').value,
        correo: document.getElementById('correo').value,
        password: document.getElementById('password').value,
        rol: document.getElementById('rol').value,
        matricula: matricula.trim() || null
    };
    try {
        const response = await fetch('http://localhost:3000/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            showAlertSuccess('¡Cuenta creada exitosamente!', 'Redirigiendo al inicio de sesión...');
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
            showAlertError('Error al registrar', result.message || 'Ocurrió un error inesperado');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlertError('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    }
});
