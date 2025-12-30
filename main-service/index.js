const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. PENANGANAN CORS (Handled via Code)
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. KONFIGURASI DATABASE
 * Pastikan variabel lingkungan (DB_HOST, dkk) sudah diisi di Azure Portal
 */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'taufiq', 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'project_db',
    port: 3306,
    ssl: { rejectUnauthorized: false }, // WAJIB untuk Azure MySQL Flexible Server
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

// Utilitas Waktu Jakarta
const getJakartaTime = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 19).replace('T', ' ');
};

// Middleware Otentikasi Token
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak, token hilang" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded; // Menyimpan ID dan Role user
        next();
    });
};

/**
 * 3. ENDPOINTS
 */

// Health Check
app.get('/', (req, res) => {
    res.send('<h1>Main Service Berhasil Jalan di Azure!</h1>');
});

// Menampilkan daftar buku
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- PERBAIKAN: ENDPOINT PINJAM BUKU (Sering menyebabkan "undefined" jika hilang) ---
app.post('/borrow', authenticate, (req, res) => {
    const { book_id, borrower_name, borrower_phone } = req.body;
    const user_id = req.user.id;
    const date = getJakartaTime();

    // Cek stok buku terlebih dahulu
    db.query('SELECT stock FROM books WHERE id = ?', [book_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error saat cek stok", error: err });
        
        if (results && results.length > 0 && results[0].stock > 0) {
            // Simpan data ke tabel borrowings
            const query = 'INSERT INTO borrowings (book_id, user_id, borrower_name, borrower_phone, borrow_date) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [book_id, user_id, borrower_name, borrower_phone, date], (err) => {
                if (err) return res.status(500).json({ message: "Gagal menyimpan data pinjaman", detail: err });
                
                // Kurangi stok buku secara otomatis
                db.query('UPDATE books SET stock = stock - 1 WHERE id = ?', [book_id]);
                res.json({ message: "Buku berhasil dipinjam!" });
            });
        } else {
            res.status(400).json({ message: "Stok buku habis atau buku tidak ditemukan" });
        }
    });
});

// Monitoring Peminjaman (Admin & User)
app.get('/borrowings/all', authenticate, (req, res) => {
    let query = `SELECT b.id, bk.title, b.borrow_date, b.return_date, b.borrower_name 
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

// Tambah atau Update Buku (Admin)
app.post('/books', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });
    const { id, title, author, year, genre, cover_url, stock } = req.body;

    if (id) {
        const query = 'UPDATE books SET title=?, author=?, year=?, genre=?, cover_url=?, stock=? WHERE id=?';
        db.query(query, [title, author, year, genre, cover_url, stock, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Buku diperbarui" });
        });
    } else {
        const query = 'INSERT INTO books (title, author, year, genre, cover_url, stock) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [title, author, year, genre, cover_url || '', stock], (err) => {
            if (err) return res.status(500).json(err);
            res.status(201).json({ message: "Buku ditambahkan" });
        });
    }
});

// Hapus Buku (Admin)
app.delete('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });
    db.query('DELETE FROM books WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Buku dihapus" });
    });
});

/**
 * 4. LISTEN - Penyesuaian untuk Named Pipes Azure
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Main Service Aktif di Port: ${PORT}`);
});
