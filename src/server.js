const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
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

// ---- RUTAS DE ALUMNO ----

// Unirse a aula mediante código
apiRouter.post('/unirse-aula', (req, res) => {
    const { estudiante_id, codigo_clase } = req.body;
    if (!estudiante_id || !codigo_clase) {
        return res.status(400).json({ message: 'Faltan datos' });
    }
    const queryBuscar = 'SELECT id FROM Aulas WHERE codigo_clase = ?';
    db.query(queryBuscar, [codigo_clase.toUpperCase()], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        if (results.length === 0) return res.status(404).json({ message: 'Código de clase inválido' });
        const aula_id = results[0].id;
        const queryInsert = 'INSERT INTO Estudiantes_Aulas (aula_id, estudiante_id, estado) VALUES (?, ?, \'pendiente\')';
        db.query(queryInsert, [aula_id, estudiante_id], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya enviaste solicitud a esta aula' });
                return res.status(500).json({ message: 'Error del servidor' });
            }
            res.json({ message: 'Solicitud enviada. Espera a que el docente te acepte.' });
        });
    });
});

// Obtener aulas del alumno (con estado y datos del docente)
apiRouter.get('/alumno/aulas/:estudiante_id', (req, res) => {
    const query = `
        SELECT Aulas.id, Aulas.nombre AS aula_nombre, Aulas.codigo_clase,
               Materias.nombre AS materia_nombre,
               CONCAT(Usuarios.nombre, ' ', Usuarios.apellido_paterno) AS docente_nombre,
               Estudiantes_Aulas.estado
        FROM Estudiantes_Aulas
        JOIN Aulas ON Estudiantes_Aulas.aula_id = Aulas.id
        JOIN Materias ON Aulas.materia_id = Materias.id
        JOIN Usuarios ON Aulas.docente_id = Usuarios.id
        WHERE Estudiantes_Aulas.estudiante_id = ?
        ORDER BY Estudiantes_Aulas.id DESC
    `;
    db.query(query, [req.params.estudiante_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        res.json(results);
    });
});

// Obtener solicitudes pendientes de un aula
apiRouter.get('/aulas/:aulaId/solicitudes', (req, res) => {
    const aulaId = req.params.aulaId;
    const query = `
        SELECT ea.id, ea.estudiante_id, u.nombre, u.apellido_paterno
        FROM Estudiantes_Aulas ea
        JOIN Usuarios u ON ea.estudiante_id = u.id
        WHERE ea.aula_id = ? AND ea.estado = 'pendiente'
        ORDER BY ea.id ASC
    `;
    db.query(query, [aulaId], (err, results) => {
        if (err) {
            console.error('Error al obtener solicitudes:', err);
            return res.status(500).json({ message: 'Error al cargar solicitudes' });
        }
        res.json(results);
    });
});

// Responder solicitud (aceptar/rechazar)
apiRouter.put('/aulas/responder-solicitud', (req, res) => {
    const { solicitud_id, estado } = req.body;
    if (!solicitud_id || !estado) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }
    if (!['aceptado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ message: 'Estado inválido' });
    }
    const query = 'UPDATE Estudiantes_Aulas SET estado = ? WHERE id = ?';
    db.query(query, [estado, solicitud_id], (err, result) => {
        if (err) {
            console.error('Error al responder solicitud:', err);
            return res.status(500).json({ message: 'Error al procesar la solicitud' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        res.json({ message: estado === 'aceptado' ? 'Alumno aceptado' : 'Solicitud rechazada' });
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
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(500).json({ message: 'No se puede eliminar: hay alumnos que ya presentaron este examen. Ejecuta el script CASCADE en la BD primero.' });
            }
            return res.status(500).json({ message: 'Error al eliminar el examen' });
        }
        res.json({ message: 'Examen eliminado correctamente' });
    });
});

// Exámenes pendientes del alumno en un aula (no realizados aún)
apiRouter.get('/alumno/examenes-pendientes/:aula_id/:estudiante_id', (req, res) => {
    const query = `
        SELECT e.id, e.titulo, e.fecha_apertura, e.fecha_cierre, e.tiempo_limite_minutos
        FROM Examenes e
        WHERE e.aula_id = ?
          AND e.id NOT IN (
              SELECT r.examen_id FROM Resultados r WHERE r.estudiante_id = ?
          )
        ORDER BY e.fecha_apertura ASC
    `;
    db.query(query, [req.params.aula_id, req.params.estudiante_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        res.json(results);
    });
});

// Obtener detalle completo de un examen (con preguntas asociadas)
apiRouter.get('/examenes/:id/detalle', (req, res) => {
    const examenId = req.params.id;
    const queryExamen = 'SELECT * FROM Examenes WHERE id = ?';
    db.query(queryExamen, [examenId], (err, examData) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        if (examData.length === 0) return res.status(404).json({ message: 'Examen no encontrado' });
        const queryPreguntas = `
            SELECT ep.pregunta_id
            FROM Examen_Preguntas ep
            WHERE ep.examen_id = ?
        `;
        db.query(queryPreguntas, [examenId], (err, preguntas) => {
            if (err) return res.status(500).json({ message: 'Error del servidor' });
            res.json({
                ...examData[0],
                preguntas: preguntas.map(p => p.pregunta_id)
            });
        });
    });
});

// Actualizar examen (editar datos y/o preguntas)
apiRouter.put('/examenes/:id', (req, res) => {
    const examenId = req.params.id;
    const { titulo, fecha_apertura, fecha_cierre, tiempo_limite_minutos, preguntas } = req.body;
    const queryUpdate = 'UPDATE Examenes SET titulo = ?, fecha_apertura = ?, fecha_cierre = ?, tiempo_limite_minutos = ? WHERE id = ?';
    db.query(queryUpdate, [titulo, fecha_apertura, fecha_cierre, tiempo_limite_minutos, examenId], (err, result) => {
        if (err) {
            console.error('Error al actualizar examen:', err);
            return res.status(500).json({ message: 'Error al actualizar el examen' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Examen no encontrado' });
        }
        // Si se enviaron preguntas, reemplazar todas
        if (preguntas !== undefined) {
            const queryDelete = 'DELETE FROM Examen_Preguntas WHERE examen_id = ?';
            db.query(queryDelete, [examenId], (err) => {
                if (err) {
                    console.error('Error al reemplazar preguntas:', err);
                    return res.status(500).json({ message: 'Examen actualizado pero error al reemplazar preguntas' });
                }
                if (preguntas.length > 0) {
                    const values = preguntas.map(p => [examenId, p]);
                    const queryInsert = 'INSERT INTO Examen_Preguntas (examen_id, pregunta_id) VALUES ?';
                    db.query(queryInsert, [values], (err) => {
                        if (err) {
                            console.error('Error al insertar preguntas:', err);
                            return res.status(500).json({ message: 'Examen actualizado pero error al asignar preguntas' });
                        }
                        res.json({ message: 'Examen actualizado correctamente' });
                    });
                } else {
                    res.json({ message: 'Examen actualizado sin preguntas' });
                }
            });
        } else {
            res.json({ message: 'Examen actualizado correctamente' });
        }
    });
});

// Obtener resultados de estudiantes para un examen
apiRouter.get('/examenes/:id/resultados', (req, res) => {
    const examenId = req.params.id;
    const query = `
        SELECT r.id, r.calificacion, r.fecha_realizacion,
               u.id AS estudiante_id, u.nombre, u.apellido_paterno, u.apellido_materno
        FROM Resultados r
        JOIN Usuarios u ON r.estudiante_id = u.id
        WHERE r.examen_id = ?
        ORDER BY r.fecha_realizacion DESC
    `;
    db.query(query, [examenId], (err, results) => {
        if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ message: 'Error al cargar resultados' });
        }
        // Obtener total de preguntas del examen para contexto
        const queryCount = 'SELECT COUNT(*) AS total FROM Examen_Preguntas WHERE examen_id = ?';
        db.query(queryCount, [examenId], (err, countResult) => {
            if (err) return res.status(500).json({ message: 'Error del servidor' });
            res.json({
                total_preguntas: countResult[0].total,
                resultados: results
            });
        });
    });
});

// Obtener preguntas de un examen (incluye tiempo límite)
apiRouter.get('/examen/:examen_id/preguntas', (req, res) => {
    const queryExamen = 'SELECT titulo, tiempo_limite_minutos FROM Examenes WHERE id = ?';
    db.query(queryExamen, [req.params.examen_id], (err, examData) => {
        if (err || examData.length === 0) return res.status(500).json({ message: 'Error del servidor' });
        const queryPreguntas = `
            SELECT Preguntas.id, Preguntas.texto_pregunta, Preguntas.tipo,
                   Preguntas.opcion_a, Preguntas.opcion_b, Preguntas.opcion_c, Preguntas.opcion_d,
                   Preguntas.tema_retroalimentacion
            FROM Examen_Preguntas
            JOIN Preguntas ON Examen_Preguntas.pregunta_id = Preguntas.id
            WHERE Examen_Preguntas.examen_id = ?
            ORDER BY Examen_Preguntas.pregunta_id ASC
        `;
        db.query(queryPreguntas, [req.params.examen_id], (err, preguntas) => {
            if (err) return res.status(500).json({ message: 'Error del servidor' });
            res.json({
                titulo: examData[0].titulo,
                tiempo_limite_minutos: examData[0].tiempo_limite_minutos,
                preguntas
            });
        });
    });
});

// Entregar examen (calificar automáticamente)
apiRouter.post('/examen/entregar', (req, res) => {
    const { examen_id, estudiante_id, respuestas } = req.body;
    if (!examen_id || !estudiante_id || !respuestas) {
        return res.status(400).json({ message: 'Faltan datos' });
    }
    const queryPreguntas = 'SELECT id, respuesta_correcta, tema_retroalimentacion FROM Preguntas WHERE id IN (?)';
    const ids = respuestas.map(r => r.pregunta_id);
    db.query(queryPreguntas, [ids], (err, preguntas) => {
        if (err || preguntas.length === 0) return res.status(500).json({ message: 'Error del servidor' });
        let correctas = 0;
        const detalles = preguntas.map(p => {
            const respuesta = respuestas.find(r => r.pregunta_id === p.id);
            const dada = respuesta ? respuesta.respuesta_dada.trim().toUpperCase() : '';
            const correcta = p.respuesta_correcta.trim().toUpperCase();
            const esCorrecta = dada === correcta;
            if (esCorrecta) correctas++;
            return {
                pregunta_id: p.id,
                respuesta_dada: dada,
                es_correcta: esCorrecta,
                tema_retroalimentacion: esCorrecta ? null : p.tema_retroalimentacion
            };
        });
        const calificacion = (correctas / preguntas.length) * 10;
        const queryResultado = 'INSERT INTO Resultados (examen_id, estudiante_id, calificacion) VALUES (?, ?, ?)';
        db.query(queryResultado, [examen_id, estudiante_id, calificacion], (err, result) => {
            if (err) return res.status(500).json({ message: 'Error al guardar resultado' });
            const resultado_id = result.insertId;
            const values = detalles.map(d => [resultado_id, d.pregunta_id, d.respuesta_dada, d.es_correcta]);
            const queryRespuestas = 'INSERT INTO Respuestas_Alumno (resultado_id, pregunta_id, respuesta_dada, es_correcta) VALUES ?';
            db.query(queryRespuestas, [values], (err) => {
                if (err) return res.status(500).json({ message: 'Error al guardar respuestas' });
                const temasFallidos = detalles.filter(d => !d.es_correcta).map(d => d.tema_retroalimentacion);
                res.json({
                    message: 'Examen entregado',
                    calificacion: parseFloat(calificacion.toFixed(2)),
                    total_preguntas: preguntas.length,
                    correctas,
                    temas_a_repasar: [...new Set(temasFallidos)]
                });
            });
        });
    });
});

// Resultado detallado de un examen realizado
apiRouter.get('/alumno/resultados/:resultado_id', (req, res) => {
    const query = `
        SELECT r.calificacion, r.fecha_realizacion,
               ra.pregunta_id, ra.respuesta_dada, ra.es_correcta,
               p.texto_pregunta, p.respuesta_correcta, p.tema_retroalimentacion, p.tipo
        FROM Resultados r
        JOIN Respuestas_Alumno ra ON r.id = ra.resultado_id
        JOIN Preguntas p ON ra.pregunta_id = p.id
        WHERE r.id = ?
    `;
    db.query(query, [req.params.resultado_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        if (results.length === 0) return res.status(404).json({ message: 'Resultado no encontrado' });
        const temasFallidos = results.filter(r => !r.es_correcta).map(r => r.tema_retroalimentacion);
        res.json({
            calificacion: results[0].calificacion,
            fecha_realizacion: results[0].fecha_realizacion,
            preguntas: results.map(r => ({
                pregunta_id: r.pregunta_id,
                texto_pregunta: r.texto_pregunta,
                tipo: r.tipo,
                respuesta_dada: r.respuesta_dada,
                respuesta_correcta: r.respuesta_correcta,
                es_correcta: r.es_correcta,
                tema_retroalimentacion: r.tema_retroalimentacion
            })),
            temas_a_repasar: [...new Set(temasFallidos)]
        });
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
