const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak" });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded;
        next();
    });
};

// --- CRUD BOOKS (ADMIN) - SOLUSI ERROR 404 ---
app.post('/books', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Bukan Admin" });
    const { title, author, stock, cover_url } = req.body;
    db.query('INSERT INTO books (title, author, stock, cover_url) VALUES (?, ?, ?, ?)', [title, author, stock, cover_url], (err) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ message: "Buku ditambah!" });
    });
});

app.delete('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Bukan Admin" });
    db.query('DELETE FROM books WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Buku dihapus!" });
    });
});

// --- USER ENDPOINTS (GET BOOKS, BORROW, RETURN) ---
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/borrow', authenticate, (req, res) => {
    const { book_id, borrower_name, borrower_phone } = req.body;
    db.query('UPDATE books SET stock = stock - 1 WHERE id = ? AND stock > 0', [book_id], (err, result) => {
        if (result.affectedRows > 0) {
            db.query('INSERT INTO borrowings (book_id, user_id, borrower_name, borrower_phone, borrow_date) VALUES (?, ?, ?, ?, NOW())', 
            [book_id, req.user.id, borrower_name, borrower_phone]);
            res.json({ message: "Berhasil pinjam!" });
        } else { res.status(400).json({ message: "Stok habis" }); }
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Main Service Aktif di Port: ${PORT}`));
