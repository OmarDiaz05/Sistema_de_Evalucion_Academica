const express = require('express');
const cors = require('cors');
const db = require('./db'); // Importamos la conexión que creamos antes
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Para poder recibir datos en formato JSON (de los formularios)
app.use(express.static('public')); // Para que el navegador pueda ver mis carpetas de HTML/CSS

// Ruta de prueba para ver si la base de datos responde
app.get('/prueba-db', (req, res) => {
    db.query('SELECT 1 + 1 AS resultado', (err, results) => {
        if (err) {
            res.status(500).send('Error en la base de datos');
        } else {
            res.send('Conexión exitosa. El servidor y la DB se hablan correctamente.');
        }
    });
});


// Ruta para procesar el Login
app.post('/login', (req, res) => {
    const { correo, password } = req.body;

    // 1. Buscamos el correo en la base de datos
    const query = 'SELECT * FROM Usuarios WHERE correo = ?';
    
    db.query(query, [correo], (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }

        // 2. Verificamos si el usuario existe
        if (results.length === 0) {
            return res.status(401).json({ message: 'El correo no está registrado' });
        }

        const usuario = results[0];

        // 3. Comparamos la contraseña (Nota: Más adelante implementaremos bcrypt para contraseñas encriptadas)
        if (password !== usuario.password) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // 4. Si la contraseña es correcta, revisamos el rol y redirigimos
        if (usuario.rol === 'docente') {
            res.json({ message: 'Login exitoso', redirect: '/public/dashboard-docente.html' });
        } else if (usuario.rol === 'alumno') {
            res.json({ message: 'Login exitoso', redirect: '/dashboard-alumno.html' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});