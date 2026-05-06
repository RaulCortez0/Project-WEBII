-- Ejecutar este script en tu base de datos PWII antes de probar el OAuth

-- 1. Permitir que password sea NULL (usuarios OAuth no tienen contraseña)
ALTER TABLE Usuarios MODIFY COLUMN password VARCHAR(255) NULL;

-- 2. Agregar columna para la foto de perfil del proveedor OAuth
ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL;

-- 3. Agregar columna para saber qué proveedor usó el usuario (google / github)
ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50) NULL;
