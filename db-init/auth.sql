CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    full_name VARCHAR(255) NULL,    -- Menambah kolom nama lengkap
    email VARCHAR(255) NULL,        -- Menambah kolom email
    phone_number VARCHAR(20) NULL   -- Menambah kolom nomor telepon
);

