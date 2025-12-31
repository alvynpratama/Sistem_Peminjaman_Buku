const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. PERBAIKAN CORS: Perhatikan penulisan 'koreacentral'
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. KONEKSI DATABASE
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

// Middleware Otentikasi
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Sesi habis" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token tidak valid" });
        req.user = decoded;
        next();
    });
};

// --- REGISTER ---
app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Simpan semua kolom tanpa kecuali
        const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [username, hashedPassword, role || 'user', full_name || '', email || '', phone_number || ''], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Registrasi Berhasil!" });
        });
    } catch (e) { res.status(500).json({ message: "Error enkripsi" }); }
});

// --- LOGIN: Kirim data lengkap agar tidak muncul "Guest" ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: "Akun tidak ditemukan" });
        
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Password salah" });

        const displayName = user.full_name || user.username;
        const token = jwt.sign({ id: user.id, role: user.role, name: displayName }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            token, 
            role: user.role, 
            name: displayName, 
            username: user.username,
            phone_number: user.phone_number // Kirim no telp saat login
        });
    });
});

// --- AMBIL PROFIL ---
app.get('/profile', authenticate, (req, res) => {
    db.query('SELECT id, username, full_name, email, phone_number, role FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
        res.json(results[0]);
    });
});

// --- UPDATE PROFIL: Pastikan variabel sesuai dengan database ---
app.post('/profile/update', authenticate, (req, res) => {
    const { full_name, username, email, phone_number } = req.body;
    const query = 'UPDATE users SET full_name = ?, username = ?, email = ?, phone_number = ? WHERE id = ?';
    
    db.query(query, [full_name, username, email, phone_number, req.user.id], (err) => {
        if (err) return res.status(500).json({ message: "Gagal simpan", error: err.message });
        res.json({ message: "Profil berhasil diperbarui!" });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Auth Service Aktif di Port ${PORT}`));
