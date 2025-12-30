/**
 * MAIN SERVICE - PERBAIKAN FINAL AZURE
 */
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. KONFIGURASI CORS (Pastikan sinkron dengan domain Frontend)
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. KONFIGURASI DATABASE (Menggunakan SSL & Environment Variables)
 */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'taufiq', 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'project_db',
    port: 3306,
    ssl: {
        rejectUnauthorized: false // Wajib untuk Azure MySQL Flexible Server
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Secret key untuk validasi token (Harus sama dengan Auth Service)
const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

const getJakartaTime = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 19).replace('T', ' ');
};

// Middleware Otentikasi
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak, token hilang" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded;
        next();
    });
};

/** * --- ENDPOINTS ---
 */

// Menampilkan daftar buku
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error("Database Error:", err); // Log ke Aliran Log Azure
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Menambah atau Update Buku
app.post('/books', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });
    const { id, title, author, year, genre, cover_url, stock } = req.body;

    if (id) {
        const query = 'UPDATE books SET title=?, author=?, year=?, genre=?, cover_url=?, stock=? WHERE id=?';
        db.query(query, [title, author, year, genre, cover_url, stock, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Data buku berhasil diperbarui" });
        });
    } else {
        const query = 'INSERT INTO books (title, author, year, genre, cover_url, stock) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [title, author, year, genre, cover_url || '', stock], (err) => {
            if (err) return res.status(500).json(err);
            res.status(201).json({ message: "Buku baru berhasil ditambahkan" });
        });
    }
});

// Menghapus Buku
app.delete('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });
    const bookId = req.params.id;

    db.query('SELECT * FROM borrowings WHERE book_id = ? AND return_date IS NULL', [bookId], (err, results) => {
        if (results && results.length > 0) {
            return res.status(400).json({ message: "Buku sedang dipinjam!" });
        }
        db.query('DELETE FROM books WHERE id = ?', [bookId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Buku berhasil dihapus" });
        });
    });
});

// Monitoring Peminjaman (Admin & User)
app.get('/borrowings/all', authenticate, (req, res) => {
    let query = `SELECT b.id, bk.title, bk.cover_url, b.borrow_date, b.return_date, b.user_id, b.borrower_name 
                 FROM borrowings b JOIN books bk ON b.book_id = bk.id`;
    let params = [];
    if (req.user.role !== 'admin') {
        query += " WHERE b.user_id = ?";
        params.push(req.user.id);
    }
    db.query(query + " ORDER BY b.id DESC", params, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

/**
 * 3. PERBAIKAN LISTEN: Azure Windows menggunakan Named Pipes, bukan nomor port biasa.
 * Jangan tambahkan IP '0.0.0.0' karena akan menyebabkan error pada Named Pipe Azure.
 */
const PORT = process.env.PORT || 8080; 
app.listen(PORT, () => {
    console.log(`Main Service Aktif di Port: ${PORT}`);
});
