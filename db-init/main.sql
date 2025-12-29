CREATE DATABASE IF NOT EXISTS project_db;
USE project_db;

-- Tabel Buku dengan kolom Penulis dan Gambar
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,      -- Penulis Buku
    year INT,                          -- Tahun Terbit
    genre VARCHAR(100),                -- Kategori
    cover_url TEXT,                   -- URL Gambar Sampul
    stock INT DEFAULT 0               -- Stok (Jika 0, otomatis tidak tersedia)
);

-- Tabel Peminjaman
CREATE TABLE IF NOT EXISTS borrowings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT,
    user_id INT,                      -- Diambil dari ID User di Auth Service
    borrow_date DATE NOT NULL,
    return_date DATE NULL,            -- Jika NULL berarti masih dipinjam
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);