       document.getElementById('rol').addEventListener('change', function() {
            document.getElementById('campoMatricula').style.display = this.value === 'docente' ? 'block' : 'none';
        });
        document.getElementById('registroForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                nombre: document.getElementById('nombre').value,
                apellido_paterno: document.getElementById('apellidoPaterno').value,
                apellido_materno: document.getElementById('apellidoMaterno').value,
                correo: document.getElementById('correo').value,
                password: document.getElementById('password').value,
                rol: document.getElementById('rol').value,
                matricula: document.getElementById('matricula').value || null
            };
            try {
                const response = await fetch('http://localhost:3000/api/registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    alert('¡Cuenta creada exitosamente! Redirigiendo al login...');
                    window.location.href = 'login.html';
                } else {
                    alert(result.message || 'Error al registrar');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al conectar con el servidor.');
            }
        });