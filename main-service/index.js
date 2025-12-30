const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. PERBAIKAN CORS: Hanya izinkan domain frontend Anda
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. PERBAIKAN DATABASE: Gunakan Environment Variables & SSL
 */
const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-main',
    user: process.env.DB_USER || 'taufiq', //
    password: process.env.DB_PASSWORD || 'password_dosen',
    database: process.env.DB_NAME || 'project_db',
    waitForConnections: true,
    connectionLimit: 10,
    // WAJIB UNTUK AZURE MYSQL
    ssl: {
        rejectUnauthorized: false
    }
});

// Gunakan secret dari env atau default
const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

const getJakartaTime = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 19).replace('T', ' ');
};

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak, token hilang" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded;
        next();
    });
};

// ... (Endpoint /books, /borrow, /borrowings/all, /return tetap sama seperti logika Anda)

/**
 * 3. PERBAIKAN PORT: Gunakan process.env.PORT agar bisa berjalan di Azure
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Main Service Aktif di Port ${PORT}`);
});
