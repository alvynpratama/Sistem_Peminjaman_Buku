/**
 * AUTH SERVICE - MICROSERVICE CORE
 * Tanggung Jawab: Menangani pendaftaran, otentikasi (JWT), dan manajemen profil pengguna.
 */

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// 1. PERBAIKAN CORS: Hanya mengizinkan permintaan dari URL Frontend Azure Anda
// Ini mencegah error "No 'Access-Control-Allow-Origin' header is present"
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net', // Ganti dengan domain frontend Anda
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

/**
 * 2. KONFIGURASI DATABASE
 * Selalu gunakan process.env agar kredensial database tidak terekspos di GitHub.
 */
const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-auth', 
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password_dosen',
    database: process.env.DB_NAME || 'auth_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Gunakan secret dari environment variable untuk keamanan tinggi
const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

// --- ENDPOINT REGISTER & LOGIN (Tetap seperti logika Anda, sudah bagus) ---

app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username dan Password wajib diisi" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(query, [
            username, hashedPassword, role || 'user', 
            role === 'admin' ? null : (full_name || ''), 
            role === 'admin' ? null : email, 
            role === 'admin' ? null : (phone_number || '')
        ], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username/Email sudah terdaftar!" });
                return res.status(500).json({ message: "Database Error: " + err.message });
            }
            res.status(201).json({ message: "Registrasi Berhasil! Silakan Login." });
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal memproses enkripsi data" });
    }
});

const loginHandler = (req, res, expectedRole) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        if (results.length === 0) return res.status(401).json({ message: "Username tidak ditemukan" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Password salah" });
        if (user.role !== expectedRole) return res.status(403).json({ message: `Akses ditolak. Gunakan portal ${user.role}!` });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role, name: user.full_name, message: "Login Berhasil" });
    });
};

app.post('/login', (req, res) => loginHandler(req, res, 'user'));
app.post('/admin/login', (req, res) => loginHandler(req, res, 'admin'));

// --- MIDDLEWARE & PROFILE ENDPOINTS (Tetap seperti logika Anda) ---

/**
 * 3. PERBAIKAN PORT UNTUK AZURE
 * Azure Web App pada Windows/Linux secara dinamis memberikan port melalui process.env.PORT.
 * Jangan mematok port 5000 secara statis.
 */
const PORT = process.env.PORT || 8080; // Azure menyukai port 8080 atau dinamis
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(` AUTH SERVICE RUNNING ON PORT ${PORT} `);
    console.log(`========================================`);
});
