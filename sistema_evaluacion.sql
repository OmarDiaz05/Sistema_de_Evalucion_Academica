-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS sistema_evaluacion;
USE sistema_evaluacion;

-- 2. Tabla de Usuarios (Alumnos y Maestros)
CREATE TABLE Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(50) NOT NULL,
    rol ENUM('alumno', 'docente') NOT NULL,
    matricula VARCHAR(50) UNIQUE NULL -- Solo se llena si es docente
);
ALTER TABLE Usuarios MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- 3. Tabla de Materias (Las 3 materias iniciales por el momento)
CREATE TABLE Materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

INSERT INTO Materias (nombre) VALUES ('Matemáticas'), ('Biología'), ('Historia');

-- 4. Tabla de Aulas (Creadas por los docentes)
CREATE TABLE Aulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_clase VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    docente_id INT NOT NULL,
    materia_id INT NOT NULL,
    FOREIGN KEY (docente_id) REFERENCES Usuarios(id),
    FOREIGN KEY (materia_id) REFERENCES Materias(id)
);

-- Solicitudes y Miembros de Aulas
CREATE TABLE Estudiantes_Aulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aula_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    estado ENUM('pendiente', 'aceptado', 'rechazado') DEFAULT 'pendiente',
    FOREIGN KEY (aula_id) REFERENCES Aulas(id),
    FOREIGN KEY (estudiante_id) REFERENCES Usuarios(id)
);

-- 6. Banco de Preguntas
CREATE TABLE Preguntas (
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
    tema_retroalimentacion VARCHAR(150) NOT NULL, -- Para decirle al alumno qué debe estudiar
    FOREIGN KEY (materia_id) REFERENCES Materias(id),
    FOREIGN KEY (docente_id) REFERENCES Usuarios(id)
);

-- 7. Exámenes
CREATE TABLE Examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aula_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    fecha_apertura DATETIME NOT NULL,
    fecha_cierre DATETIME NOT NULL,
    tiempo_limite_minutos INT NOT NULL,
    FOREIGN KEY (aula_id) REFERENCES Aulas(id)
);

-- Relación Exámenes 
CREATE TABLE Examen_Preguntas (
    examen_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    PRIMARY KEY (examen_id, pregunta_id),
    FOREIGN KEY (examen_id) REFERENCES Examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (pregunta_id) REFERENCES Preguntas(id)
);

-- Resultados e Historial
CREATE TABLE Resultados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examen_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    calificacion DECIMAL(5,2) NOT NULL,
    fecha_realizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (examen_id) REFERENCES Examenes(id),
    FOREIGN KEY (estudiante_id) REFERENCES Usuarios(id)
);

USE sistema_evaluacion;
INSERT INTO Usuarios (nombre, apellido_paterno, apellido_materno, correo, password, rol, matricula) 
VALUES ('Oliver', 'Morales', 'Tilin', 'tilin@fes.com', '1234', 'docente', 'DOC-001');

SELECT * FROM Usuarios;
