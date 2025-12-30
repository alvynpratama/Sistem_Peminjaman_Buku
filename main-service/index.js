const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. CORS - Gunakan konfigurasi yang sudah kita sepakati
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. KONEKSI DATABASE (Pastikan DB_HOST dkk sudah ada di portal)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

// 3. RUTE PENGETESAN (Health Check)
// Buka URL utama Anda tanpa tambahan apa pun. Jika muncul tulisan ini, Backend AMAN.
app.get('/', (req, res) => {
    res.send('<h1>Backend Main Service Berhasil Jalan!</h1>');
});

/**
 * 4. ENDPOINT BOOKS
 * Pastikan penulisan '/books' kecil semua.
 */
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ... (Masukkan rute /borrow, /borrowings/all, /return di sini)

// 5. PORT AZURE
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Main Service Aktif di Port: ${PORT}`);
});
