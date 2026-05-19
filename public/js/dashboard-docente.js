

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

});