const express = require('express');
const cors = require('cors');
const db = require('./db'); 
require('dotenv').config();

const app = express();
const apiRouter = express.Router();
console.log('apiRouter created:', typeof apiRouter);

// Middlewares
const fs = require('fs');
app.use((req, res, next) => {
    fs.appendFileSync('trace.log', `APP: ${req.method} ${req.url}\n`);
    next();
});
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ruta de prueba para ver si la base de datos responde
app.get('/prueba-db', (req, res) => {
    fs.appendFileSync('trace.log', `PRUEBA-DB HANDLED: ${req.method} ${req.url}\n`);
    db.query('SELECT 1 + 1 AS resultado', (err, results) => {
        if (err) {
            res.status(500).send('Error en la base de datos');
        } else {
            res.send('PRUEBA-DB ROUTE V2. El servidor y la DB se hablan correctamente.');
        }
    });
});

// ---- API Routes ----

// Login
apiRouter.post('/login', (req, res) => {
    const { correo, password } = req.body;

    const query = 'SELECT * FROM Usuarios WHERE correo = ?';
    
    db.query(query, [correo], (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'El correo no está registrado' });
        }

        const usuario = results[0];

        if (password !== usuario.password) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        if (usuario.rol === 'docente') {
            res.json({ 
                message: 'Login exitoso', 
                redirect: '/dashboard-docente.html',
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

// Crear Aula
apiRouter.post('/crear-aula', (req, res) => {
    const { nombre, materia_id, docente_id } = req.body;

    const codigo_clase = Math.random().toString(36).substring(2, 8).toUpperCase(); 

    const query = 'INSERT INTO Aulas (codigo_clase, nombre, docente_id, materia_id) VALUES (?, ?, ?, ?)';
    
    db.query(query, [codigo_clase, nombre, docente_id, materia_id], (err, results) => {
        if (err) {
            console.error('Error al insertar aula:', err);
            return res.status(500).json({ message: 'Error al crear el aula' });
        }
        
        res.json({ message: 'Aula creada', codigo_clase: codigo_clase });
    });
});

// Obtener aulas de un docente
apiRouter.get('/aulas/:docente_id', (req, res) => {
    const docente_id = req.params.docente_id;

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
        res.json(results);
    });
});

// Eliminar aula
apiRouter.delete('/borrar-aula/:id', (req, res) => {
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

// Obtener preguntas del docente
apiRouter.get('/preguntas/:docente_id', (req, res) => {
    const docente_id = req.params.docente_id;
    const query = `
        SELECT Preguntas.*, Materias.nombre AS materia_nombre
        FROM Preguntas
        JOIN Materias ON Preguntas.materia_id = Materias.id
        WHERE Preguntas.docente_id = ?
        ORDER BY Preguntas.id DESC
    `;
    db.query(query, [docente_id], (err, results) => {
        if (err) {
            console.error('Error al obtener preguntas:', err);
            return res.status(500).json({ message: 'Error al cargar preguntas' });
        }
        res.json(results);
    });
});

// Crear pregunta
apiRouter.post('/preguntas', (req, res) => {
    const { materia_id, docente_id, texto_pregunta, tipo, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, tema_retroalimentacion } = req.body;
    const query = `INSERT INTO Preguntas (materia_id, docente_id, texto_pregunta, tipo, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, tema_retroalimentacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [materia_id, docente_id, texto_pregunta, tipo, opcion_a || null, opcion_b || null, opcion_c || null, opcion_d || null, respuesta_correcta, tema_retroalimentacion], (err, results) => {
        if (err) {
            console.error('Error al crear pregunta:', err);
            return res.status(500).json({ message: 'Error al crear la pregunta' });
        }
        res.json({ message: 'Pregunta creada', id: results.insertId });
    });
});

// Editar pregunta
apiRouter.put('/preguntas/:id', (req, res) => {
    const preguntaId = req.params.id;
    const { materia_id, texto_pregunta, tipo, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, tema_retroalimentacion } = req.body;
    const query = `UPDATE Preguntas SET materia_id = ?, texto_pregunta = ?, tipo = ?, opcion_a = ?, opcion_b = ?, opcion_c = ?, opcion_d = ?, respuesta_correcta = ?, tema_retroalimentacion = ? WHERE id = ?`;
    db.query(query, [materia_id, texto_pregunta, tipo, opcion_a || null, opcion_b || null, opcion_c || null, opcion_d || null, respuesta_correcta, tema_retroalimentacion, preguntaId], (err, results) => {
        if (err) {
            console.error('Error al editar pregunta:', err);
            return res.status(500).json({ message: 'Error al editar la pregunta' });
        }
        res.json({ message: 'Pregunta actualizada' });
    });
});

// Eliminar pregunta
apiRouter.delete('/preguntas/:id', (req, res) => {
    const preguntaId = req.params.id;
    const query = 'DELETE FROM Preguntas WHERE id = ?';
    db.query(query, [preguntaId], (err, results) => {
        if (err) {
            console.error('Error al eliminar pregunta:', err);
            return res.status(500).json({ message: 'Error al eliminar la pregunta' });
        }
        res.json({ message: 'Pregunta eliminada' });
    });
});

// Obtener detalle de un aula (materia_id)
apiRouter.get('/aula-detalle/:aula_id', (req, res) => {
    const aula_id = req.params.aula_id;
    const query = 'SELECT id, nombre, materia_id FROM Aulas WHERE id = ?';
    db.query(query, [aula_id], (err, results) => {
        if (err) {
            console.error('Error al obtener aula:', err);
            return res.status(500).json({ message: 'Error al cargar aula' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aula no encontrada' });
        }
        res.json(results[0]);
    });
});

// Obtener preguntas filtradas por materia
apiRouter.get('/preguntas-por-materia/:docente_id/:materia_id', (req, res) => {
    const { docente_id, materia_id } = req.params;
    const query = `
        SELECT id, texto_pregunta, tipo, respuesta_correcta, tema_retroalimentacion
        FROM Preguntas
        WHERE docente_id = ? AND materia_id = ?
        ORDER BY id DESC
    `;
    db.query(query, [docente_id, materia_id], (err, results) => {
        if (err) {
            console.error('Error al obtener preguntas:', err);
            return res.status(500).json({ message: 'Error al cargar preguntas' });
        }
        res.json(results);
    });
});

// Listar exámenes de un aula
apiRouter.get('/examenes/:aula_id', (req, res) => {
    const aula_id = req.params.aula_id;
    const query = `
        SELECT e.*, COUNT(ep.pregunta_id) AS total_preguntas
        FROM Examenes e
        LEFT JOIN Examen_Preguntas ep ON e.id = ep.examen_id
        WHERE e.aula_id = ?
        GROUP BY e.id
        ORDER BY e.fecha_apertura DESC
    `;
    db.query(query, [aula_id], (err, results) => {
        if (err) {
            console.error('Error al obtener exámenes:', err);
            return res.status(500).json({ message: 'Error al cargar exámenes' });
        }
        res.json(results);
    });
});

// Crear examen (con preguntas)
apiRouter.post('/examenes', (req, res) => {
    const { aula_id, titulo, fecha_apertura, fecha_cierre, tiempo_limite_minutos, preguntas } = req.body;
    const queryExamen = 'INSERT INTO Examenes (aula_id, titulo, fecha_apertura, fecha_cierre, tiempo_limite_minutos) VALUES (?, ?, ?, ?, ?)';
    db.query(queryExamen, [aula_id, titulo, fecha_apertura, fecha_cierre, tiempo_limite_minutos], (err, result) => {
        if (err) {
            console.error('Error al crear examen:', err);
            return res.status(500).json({ message: 'Error al crear el examen' });
        }
        const examenId = result.insertId;
        if (preguntas && preguntas.length > 0) {
            const values = preguntas.map(p => [examenId, p]);
            const queryPreguntas = 'INSERT INTO Examen_Preguntas (examen_id, pregunta_id) VALUES ?';
            db.query(queryPreguntas, [values], (err) => {
                if (err) {
                    console.error('Error al asignar preguntas:', err);
                    return res.status(500).json({ message: 'Examen creado pero error al asignar preguntas' });
                }
                res.json({ message: 'Examen creado correctamente', id: examenId });
            });
        } else {
            res.json({ message: 'Examen creado sin preguntas', id: examenId });
        }
    });
});

// Eliminar examen
apiRouter.delete('/examenes/:id', (req, res) => {
    const examenId = req.params.id;
    const query = 'DELETE FROM Examenes WHERE id = ?';
    db.query(query, [examenId], (err, results) => {
        if (err) {
            console.error('Error al eliminar examen:', err);
            return res.status(500).json({ message: 'Error al eliminar el examen' });
        }
        res.json({ message: 'Examen eliminado correctamente' });
    });
});

// Registro de usuarios
apiRouter.post('/registro', async (req, res) => {
    const { nombre, apellido_paterno, apellido_materno, correo, password, rol, matricula } = req.body;
    if (!nombre || !apellido_paterno || !correo || !password || !rol) {
        return res.status(400).json({ message: 'Todos los campos obligatorios deben ser llenados' });
    }
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO Usuarios (nombre, apellido_paterno, apellido_materno, correo, password, rol, matricula) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [nombre, apellido_paterno, apellido_materno || null, correo, passwordHash, rol, matricula || null], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'El correo ya está registrado' });
                }
                console.error('Error al registrar usuario:', err);
                return res.status(500).json({ message: 'Error interno del servidor' });
            }
            res.json({ message: 'Usuario registrado correctamente' });
        });
    } catch (error) {
        console.error('Error al hashear contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Mount API routes
apiRouter.use((req, res, next) => {
    fs.appendFileSync('trace.log', `API: ${req.method} ${req.url}\n`);
    next();
});
app.use('/api', apiRouter);
console.log('API routes mounted');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
