const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. PENANGANAN CORS (Handled via Code)
// Pastikan tidak ada URL di menu CORS Azure Portal agar tidak bentrok
app.use(cors({
    origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 2. KONFIGURASI DATABASE
 */
const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-peminjaman-buku.mysql.database.azure.com',
    user: process.env.DB_USER || 'taufiq', 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'project_db',
    port: 3306,
    ssl: { rejectUnauthorized: false }, // Wajib untuk Azure MySQL
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret_kunci_dosen';

// Route pengetesan (Health Check)
// Buka URL utama Anda di browser. Jika muncul tulisan ini, berarti 403 sudah hilang.
app.get('/', (req, res) => {
    res.send('Main Service is running perfectly on Azure!');
});

// ... (Logic getJakartaTime, authenticate, /books, /borrow, /borrowings/all tetap sama)

/**
 * 3. PENYESUAIAN LISTEN UNTUK AZURE WINDOWS
 * Menggunakan process.env.PORT tanpa IP '0.0.0.0' untuk mendukung Named Pipes
 */
const PORT = process.env.PORT || 8080; 
app.listen(PORT, () => {
    console.log(`Main Service Aktif di Port: ${PORT}`);
});
