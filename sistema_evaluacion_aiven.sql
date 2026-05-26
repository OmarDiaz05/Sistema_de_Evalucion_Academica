-- 1. Tabla de Usuarios (Alumnos y Maestros)
CREATE TABLE IF NOT EXISTS Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(50) NOT NULL,
    rol ENUM('alumno', 'docente') NOT NULL,
    matricula VARCHAR(50) UNIQUE NULL
);
ALTER TABLE Usuarios MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- 2. Tabla de Materias
CREATE TABLE IF NOT EXISTS Materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

INSERT INTO Materias (nombre) VALUES ('Matemáticas'), ('Biología'), ('Historia');

-- 3. Tabla de Aulas
CREATE TABLE IF NOT EXISTS Aulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_clase VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    docente_id INT NOT NULL,
    materia_id INT NOT NULL,
    FOREIGN KEY (docente_id) REFERENCES Usuarios(id),
    FOREIGN KEY (materia_id) REFERENCES Materias(id)
);

-- 4. Estudiantes_Aulas
CREATE TABLE IF NOT EXISTS Estudiantes_Aulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aula_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    estado ENUM('pendiente', 'aceptado', 'rechazado') DEFAULT 'pendiente',
    FOREIGN KEY (aula_id) REFERENCES Aulas(id),
    FOREIGN KEY (estudiante_id) REFERENCES Usuarios(id)
);

-- 5. Banco de Preguntas
CREATE TABLE IF NOT EXISTS Preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT NOT NULL,
    docente_id INT NOT NULL,
    texto_pregunta TEXT NOT NULL,
    tipo ENUM('opcion_multiple', 'arrastre') NOT NULL,
    opcion_a VARCHAR(255),
    opcion_b VARCHAR(255),
    opcion_c VARCHAR(255),
    opcion_d VARCHAR(255),
    respuesta_correcta VARCHAR(255) NOT NULL,
    tema_retroalimentacion VARCHAR(150) NOT NULL,
    FOREIGN KEY (materia_id) REFERENCES Materias(id),
    FOREIGN KEY (docente_id) REFERENCES Usuarios(id)
);

-- 6. Exámenes
CREATE TABLE IF NOT EXISTS Examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aula_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    fecha_apertura DATETIME NOT NULL,
    fecha_cierre DATETIME NOT NULL,
    tiempo_limite_minutos INT NOT NULL,
    FOREIGN KEY (aula_id) REFERENCES Aulas(id)
);

-- 7. Examen_Preguntas
CREATE TABLE IF NOT EXISTS Examen_Preguntas (
    examen_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    PRIMARY KEY (examen_id, pregunta_id),
    FOREIGN KEY (examen_id) REFERENCES Examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (pregunta_id) REFERENCES Preguntas(id)
);

-- 8. Resultados
CREATE TABLE IF NOT EXISTS Resultados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examen_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    calificacion DECIMAL(5,2) NOT NULL,
    fecha_realizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (examen_id) REFERENCES Examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES Usuarios(id)
);

-- 9. Respuestas_Alumno
CREATE TABLE IF NOT EXISTS Respuestas_Alumno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resultado_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    respuesta_dada VARCHAR(255) NOT NULL,
    es_correcta BOOLEAN NOT NULL,
    FOREIGN KEY (resultado_id) REFERENCES Resultados(id) ON DELETE CASCADE,
    FOREIGN KEY (pregunta_id) REFERENCES Preguntas(id)
);

-- 10. Datos seed
INSERT INTO Usuarios (nombre, apellido_paterno, apellido_materno, correo, password, rol, matricula) 
VALUES ('Oliver', 'Morales', 'Tilin', 'tilin@fes.com', '1234', 'docente', 'DOC-001');

INSERT INTO Usuarios (nombre, apellido_paterno, apellido_materno, correo, password, rol) 
VALUES ('Benito', 'Martinez', 'Garcia', 'tito@fes.com', '12345', 'alumno');

SELECT * FROM Usuarios;