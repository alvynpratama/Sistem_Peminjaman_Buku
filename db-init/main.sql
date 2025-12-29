CREATE DATABASE IF NOT EXISTS project_db;
USE project_db;

-- Tabel Buku (Katalog Perpustakaan)
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    year INT,
    genre VARCHAR(100),
    cover_url TEXT,
    stock INT DEFAULT 0
);

-- Tabel Peminjaman 
CREATE TABLE IF NOT EXISTS borrowings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT,
    user_id INT,                      -- ID dari Auth Service
    borrower_name VARCHAR(255) NULL,   -- Penambahan kolom Nama Peminjam
    borrower_phone VARCHAR(20) NULL,   -- Penambahan kolom HP Peminjam
    borrow_date DATETIME NOT NULL,     -- Menggunakan DATETIME untuk presisi waktu
    return_date DATETIME NULL,         -- NULL jika belum dikembalikan
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);