const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. KONFIGURASI CORS
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. KONEKSI DATABASE (SSL Aktif untuk Azure)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'taufiq',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'auth_db',
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

/**
 * 3. ENDPOINTS
 */

// --- REGISTER (Fix Email NULL & Duplicate Error) ---
app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
        
        // Gunakan || '' agar data tidak NULL di database
        db.query(query, [username, hashedPassword, role || 'user', full_name || '', email || '', phone_number || ''], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username atau Email sudah terdaftar!" });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "Registrasi Berhasil!" });
        });
    } catch (e) { res.status(500).json({ message: "Server Error" }); }
});

// --- LOGIN (Kirim semua data profil) ---
const loginHandler = (req, res, expectedRole) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: "User tidak ditemukan" });
        const user = results[0];

        if (expectedRole && user.role !== expectedRole) return res.status(403).json({ message: "Akses ditolak!" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Password salah" });
        
        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name || user.username }, JWT_SECRET, { expiresIn: '1d' });
        
        // Mengirim data lengkap agar bisa disimpan di localStorage frontend
        res.json({ 
            token, 
            role: user.role, 
            name: user.full_name || user.username, 
            username: user.username, 
            email: user.email || '', 
            phone_number: user.phone_number || '' 
        });
    });
};

app.post('/login', (req, res) => loginHandler(req, res, 'user'));
app.post('/admin/login', (req, res) => loginHandler(req, res, 'admin'));

// --- PROFILE (Ambil data terbaru) ---
app.get('/profile', authenticate, (req, res) => {
    db.query('SELECT id, username, full_name, email, phone_number, role FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
        res.json(results[0]);
    });
});

// --- UPDATE PROFILE (FIX: Logika Anti-Overwriting) ---
app.post('/profile/update', authenticate, (req, res) => {
    const { full_name, username, email, phone_number } = req.body;

    // Ambil data lama terlebih dahulu
    db.query('SELECT * FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
        
        const currentData = results[0];

        // Jika data baru tidak dikirim (kosong/null), gunakan data lama agar tidak terhapus
        const final_full_name = full_name || currentData.full_name;
        const final_username = username || currentData.username;
        const final_email = email || currentData.email;
        const final_phone = phone_number || currentData.phone_number;

        const query = 'UPDATE users SET full_name = ?, username = ?, email = ?, phone_number = ? WHERE id = ?';
        
        db.query(query, [final_full_name, final_username, final_email, final_phone, req.user.id], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username sudah digunakan!" });
                return res.status(500).json({ message: "Gagal simpan ke database" });
            }
            res.json({ message: "Profil berhasil diperbarui!" });
        });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Auth Service Ready on Port ${PORT}`));
