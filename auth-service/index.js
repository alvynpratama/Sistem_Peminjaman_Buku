/**
 * AUTH SERVICE - PERBAIKAN REGISTER & PROFILE
 */
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. KONFIGURASI CORS (Sinkron dengan domain Frontend)
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. KONFIGURASI DATABASE
 * Menambahkan SSL agar koneksi ke Azure MySQL tidak ditolak
 */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'taufiq', 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'auth_db',
    port: 3306,
    ssl: { rejectUnauthorized: false }, // Wajib untuk Azure MySQL
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

/**
 * 3. ENDPOINTS
 */

// --- REGISTER (PERBAIKAN: Menghapus logika null agar data tersimpan) ---
app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ message: "Data wajib diisi (Username, Password, Email)" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Perbaikan: Simpan data apa pun yang dikirimkan tanpa mengecek role
        const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(query, [
            username, 
            hashedPassword, 
            role || 'user', 
            full_name || '', 
            email, 
            phone_number || ''
        ], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username/Email sudah ada!" });
                return res.status(500).json({ message: "Database Error: " + err.message });
            }
            res.status(201).json({ message: "Registrasi Berhasil!" });
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal enkripsi data" });
    }
});

// --- LOGIN ---
const loginHandler = (req, res, expectedRole) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: "Akun tidak ditemukan" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Password salah" });
        if (user.role !== expectedRole) return res.status(403).json({ message: "Akses ditolak" });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, role: user.role, name: user.full_name });
    });
};

app.post('/login', (req, res) => loginHandler(req, res, 'user'));
app.post('/admin/login', (req, res) => loginHandler(req, res, 'admin'));

// --- GET PROFILE (PERBAIKAN: Menampilkan semua kolom untuk Edit Profile) ---
app.get('/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token hilang" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi habis" });

        // Mengambil data lengkap username, full_name, email, dan phone_number
        db.query('SELECT id, username, full_name, email, phone_number, role FROM users WHERE id = ?', [decoded.id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
            res.json(results[0]); 
        });
    });
});

/**
 * 4. LISTEN - Penyesuaian untuk Azure Windows
 * Menghapus '0.0.0.0' agar tidak konflik dengan Named Pipes Azure
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`AUTH SERVICE RUNNING ON PORT ${PORT}`);
});
