const express = require('express');
const cors = require('cors');
const db = require('./db'); 
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
            res.json({ 
                message: 'Login exitoso', 
                redirect: '/dashboard-docente.html',
                // Enviamos los datos del usuario para guardarlos en el navegador
                usuario: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido_paterno }
            });
        } else if (usuario.rol === 'alumno') {
            res.json({ 
                message: 'Login exitoso', 
                redirect: '/dashboard-alumno.html',
                usuario: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido_paterno }
            });
        }
    });
});
// Ruta para Crear un Aula Nueva
app.post('/crear-aula', (req, res) => {
    const { nombre, materia_id, docente_id } = req.body;

    // 2. Generamos un código de clase aleatorio de 6 caracteress
    const codigo_clase = Math.random().toString(36).substring(2, 8).toUpperCase(); 

    // 3. Guardamos en la base de datos
    const query = 'INSERT INTO Aulas (codigo_clase, nombre, docente_id, materia_id) VALUES (?, ?, ?, ?)';
    
    db.query(query, [codigo_clase, nombre, docente_id, materia_id], (err, results) => {
        if (err) {
            console.error('Error al insertar aula:', err);
            return res.status(500).json({ message: 'Error al crear el aula' });
        }
        
        // Respondemos con éxito y le mandamos el código al maestro
        res.json({ message: 'Aula creada', codigo_clase: codigo_clase });
    });
});

// Ruta para obtener las aulas de un docente específico
app.get('/aulas/:docente_id', (req, res) => {
    const docente_id = req.params.docente_id;

  // Ruta para eliminar un aula específica
app.delete('/borrar-aula/:id', (req, res) => {
    const aulaId = req.params.id;

    const query = 'DELETE FROM Aulas WHERE id = ?';

    db.query(query, [aulaId], (err, results) => {
        if (err) {
            console.error('Error al eliminar el aula:', err);
            return res.status(500).json({ message: 'No se pudo eliminar el aula. Asegúrate de que no tenga exámenes o alumnos inscritos.' });
        }
        res.json({ message: 'Aula eliminada correctamente' });
    });
});
    
    // Usamos JOIN para unir la tabla Aulas con Materias y saber el nombre de la materia
    const query = `
        SELECT Aulas.id, Aulas.codigo_clase, Aulas.nombre, Materias.nombre AS materia_nombre 
        FROM Aulas 
        JOIN Materias ON Aulas.materia_id = Materias.id 
        WHERE Aulas.docente_id = ?
        ORDER BY Aulas.id DESC
    `;
    
    db.query(query, [docente_id], (err, results) => {
        if (err) {
            console.error('Error al obtener aulas:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
        res.json(results); // Devolvemos la lista de aulas en formato JSON
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

