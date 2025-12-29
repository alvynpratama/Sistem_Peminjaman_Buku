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

// Middleware untuk memproses request body berformat JSON
app.use(express.json());

// Mengizinkan Cross-Origin Resource Sharing agar Frontend dapat mengakses API ini
app.use(cors());

/**
 * KONFIGURASI DATABASE DENGAN CONNECTION POOL
 * Menggunakan Pool untuk manajemen koneksi yang lebih efisien dan skalabel.
 */
const db = mysql.createPool({
    // DB_HOST diambil dari Environment Variable (Sangat penting untuk Deployment Azure/Docker)
    host: process.env.DB_HOST || 'db-auth', 
    user: 'root',
    password: 'password_dosen',
    database: 'auth_db',
    waitForConnections: true,
    connectionLimit: 10, // Membatasi maksimal 10 koneksi simultan
    queueLimit: 0
});

// Kunci Rahasia untuk enkripsi Token JWT (Pastikan disimpan di Secret Manager pada Azure)
const JWT_SECRET = 'secret_kunci_dosen';

/**
 * ENDPOINT: REGISTER
 * Deskripsi: Mendaftarkan pengguna baru (Admin atau User).
 * Keamanan: Menggunakan Bcrypt untuk hashing password (one-way encryption).
 */
app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;

    // Validasi Input Dasar
    if (!username || !password) {
        return res.status(400).json({ message: "Username dan Password wajib diisi" });
    }

    // Validasi Bisnis: User wajib menyertakan email, Admin tidak wajib (disesuaikan dengan logic UI)
    if (role === 'user' && !email) {
        return res.status(400).json({ message: "Email wajib diisi untuk pendaftaran User" });
    }

    try {
        // Hashing password dengan salt rounds 10 (Standar keamanan industri)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(query, [
            username, 
            hashedPassword, 
            role || 'user', 
            role === 'admin' ? null : (full_name || ''), 
            role === 'admin' ? null : email, 
            role === 'admin' ? null : (phone_number || '')
        ], (err) => {
            if (err) {
                // Error Handling: Mendeteksi data duplikat (Username/Email sudah dipakai)
                if (err.code === 'ER_DUP_ENTRY') {
                    const field = err.message.includes('email') ? 'Email' : 'Username';
                    return res.status(400).json({ message: `${field} sudah terdaftar!` });
                }
                return res.status(500).json({ message: "Database Error: " + err.message });
            }
            res.status(201).json({ message: "Registrasi Berhasil! Silakan Login." });
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal memproses enkripsi data" });
    }
});

/**
 * FUNGSI REUSABLE: loginHandler
 * Logika inti untuk validasi login bagi Member maupun Admin.
 */
const loginHandler = (req, res, expectedRole) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database Error" });
        
        // Cek Keberadaan User
        if (results.length === 0) return res.status(401).json({ message: "Username tidak ditemukan" });

        const user = results[0];
        
        // Verifikasi Password (membandingkan input dengan hash di database)
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ message: "Password salah" });
        
        // RBAC (Role-Based Access Control): Mencegah User login lewat portal Admin dan sebaliknya
        if (user.role !== expectedRole) {
            return res.status(403).json({ message: `Akses ditolak. Gunakan portal ${user.role}!` });
        }

        // Generate JWT Token (Berlaku 1 Jam)
        // Payload mencakup ID, Role, dan Nama untuk kemudahan akses di Frontend
        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '1h' });
        
        // Mengembalikan data lengkap untuk disimpan di LocalStorage Frontend
        res.json({
            token,
            role: user.role,
            name: user.full_name,
            username: user.username,
            email: user.email,
            phone: user.phone_number,
            message: "Login Berhasil"
        });
    });
};

app.post('/login', (req, res) => loginHandler(req, res, 'user'));
app.post('/admin/login', (req, res) => loginHandler(req, res, 'admin'));

/**
 * MIDDLEWARE: Authenticate
 * Berfungsi untuk melindungi endpoint privat dengan memverifikasi token JWT.
 */
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Format: "Bearer <token>"
    
    if (!token) return res.status(401).json({ message: "Akses ditolak, token tidak ditemukan" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi telah berakhir, silakan login kembali" });
        
        // Menyimpan data user yang terdekripsi ke objek request agar bisa dipakai di endpoint selanjutnya
        req.user = decoded;
        next();
    });
};

/**
 * ENDPOINT: PROFILE (PRIVATE)
 */
app.get('/profile', authenticate, (req, res) => {
    db.query('SELECT full_name, username, email, phone_number FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
    });
});

/**
 * ENDPOINT: UPDATE PROFILE (PRIVATE)
 */
app.post('/profile/update', authenticate, (req, res) => {
    const { full_name, username, phone_number } = req.body;
    
    db.execute(
        'UPDATE users SET full_name = ?, username = ?, phone_number = ? WHERE id = ?', 
        [full_name, username, phone_number, req.user.id], 
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username sudah digunakan oleh orang lain!" });
                return res.status(500).json(err);
            }
            res.json({ message: "Data profil berhasil diperbarui!" });
        }
    );
});

// Jalankan Service
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(` AUTH SERVICE READY ON PORT ${PORT} `);
    console.log(`========================================`);
});