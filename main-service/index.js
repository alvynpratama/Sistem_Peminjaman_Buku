const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. CORS CONFIG - Sesuaikan dengan domain frontend Azure Anda
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. DATABASE CONNECTION
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'taufiq', 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'project_db',
    port: 3306,
    ssl: { rejectUnauthorized: false }, 
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

// Helper: Mendapatkan waktu Jakarta (WIB) karena server Azure biasanya UTC
const getJakartaTime = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 19).replace('T', ' ');
};

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded;
        next();
    });
};

/**
 * 3. ENDPOINTS
 */

// --- CATALOG BOOKS ---
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

/**
 * ADMIN: CRUD BOOKS (DIPERBAIKI)
 */

// TAMBAH BUKU - Menambahkan year dan genre agar data lengkap
app.post('/books', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Bukan Admin" });
    const { title, author, year, genre, stock, cover_url } = req.body;
    const query = 'INSERT INTO books (title, author, year, genre, stock, cover_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [title, author, year || null, genre || '', stock || 0, cover_url || ''], (err) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ message: "Buku berhasil ditambah!" });
    });
});

// UPDATE BUKU - Solusi agar Edit tidak membuat buku baru
app.put('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Bukan Admin" });
    const { title, author, year, genre, stock, cover_url } = req.body;
    const query = 'UPDATE books SET title = ?, author = ?, year = ?, genre = ?, stock = ?, cover_url = ? WHERE id = ?';
    db.query(query, [title, author, year, genre, stock, cover_url, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Buku berhasil diperbarui!" });
    });
});

app.delete('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Bukan Admin" });
    db.query('DELETE FROM books WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Buku berhasil dihapus!" });
    });
});

// --- USER: BORROW BOOK ---
app.post('/borrow', authenticate, (req, res) => {
    const { book_id, borrower_name, borrower_phone } = req.body;
    const date = getJakartaTime();

    db.query('SELECT stock FROM books WHERE id = ?', [book_id], (err, results) => {
        if (results && results.length > 0 && results[0].stock > 0) {
            const query = 'INSERT INTO borrowings (book_id, user_id, borrower_name, borrower_phone, borrow_date) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [book_id, req.user.id, borrower_name, borrower_phone, date], (err) => {
                if (err) return res.status(500).json(err);
                db.query('UPDATE books SET stock = stock - 1 WHERE id = ?', [book_id]);
                res.json({ message: "Buku berhasil dipinjam!" });
            });
        } else {
            res.status(400).json({ message: "Stok buku habis" });
        }
    });
});

// --- USER/ADMIN: RETURN BOOK ---
app.post('/return', authenticate, (req, res) => {
    const { borrowing_id } = req.body;
    const date = getJakartaTime();

    db.query('SELECT book_id FROM borrowings WHERE id = ?', [borrowing_id], (err, results) => {
        if (results && results.length > 0) {
            const book_id = results[0].book_id;
            db.query('UPDATE borrowings SET return_date = ? WHERE id = ?', [date, borrowing_id], (err) => {
                if (err) return res.status(500).json(err);
                db.query('UPDATE books SET stock = stock + 1 WHERE id = ?', [book_id]);
                res.json({ message: "Buku telah dikembalikan!" });
            });
        } else {
            res.status(404).json({ message: "Data peminjaman tidak ditemukan" });
        }
    });
});

// --- HISTORY: GET ALL BORROWINGS ---
app.get('/borrowings/all', authenticate, (req, res) => {
    let query = `
        SELECT b.*, bk.title, bk.cover_url 
        FROM borrowings b 
        JOIN books bk ON b.book_id = bk.id`;
    
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Main Service Aktif di Port: ${PORT}`));
