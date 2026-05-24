document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    try {
        // Enviamos los datos a Node.js
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardamos la información del usuario en el navegador
            localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
                    
            // Redireccionamos según el rol
            window.location.href = data.redirect;
        } else {
            // Mostramos alerta si hay error
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor.');
    }
});