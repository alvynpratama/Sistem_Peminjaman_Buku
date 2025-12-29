const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-auth',
    user: 'root',
    password: 'password_dosen',
    database: 'auth_db',
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = 'secret_kunci_dosen';

app.post('/register', async (req, res) => {
    const { username, password, role, full_name, email, phone_number } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username dan Password wajib diisi" });
    }

    if (role === 'user' && !email) {
        return res.status(400).json({ message: "Email wajib diisi untuk pendaftaran User" });
    }

    try {
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
                if (err.code === 'ER_DUP_ENTRY') {
                    const field = err.message.includes('email') ? 'Email' : 'Username';
                    return res.status(400).json({ message: `${field} sudah terdaftar!` });
                }
                return res.status(500).json({ message: "Database Error: " + err.message });
            }
            res.status(201).json({ message: "Registrasi Berhasil! Silakan Login." });
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal memproses data" });
    }
});

const loginHandler = (req, res, expectedRole) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "DB Error" });
        if (results.length === 0) return res.status(401).json({ message: "Username tidak ditemukan" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ message: "Password salah" });
        if (user.role !== expectedRole) return res.status(403).json({ message: `Gunakan portal ${user.role}!` });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '1h' });
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

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak" });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi habis" });
        req.user = decoded;
        next();
    });
};

app.get('/profile', authenticate, (req, res) => {
    db.query('SELECT full_name, username, email, phone_number FROM users WHERE id = ?', [req.user.id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
    });
});

app.post('/profile/update', authenticate, (req, res) => {
    const { full_name, username, phone_number } = req.body;
    db.execute('UPDATE users SET full_name = ?, username = ?, phone_number = ? WHERE id = ?', [full_name, username, phone_number, req.user.id], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Username sudah digunakan!" });
            return res.status(500).json(err);
        }
        res.json({ message: "Profil berhasil diperbarui!" });
    });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Auth Service Ready on Port ${PORT}`));