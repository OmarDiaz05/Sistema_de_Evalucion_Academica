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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});