/**
 * GATEWAY FRONTEND / STATIC FILE SERVER
 * Tanggung Jawab: Menyajikan aset statis (HTML, CSS, JS) kepada browser pengguna.
 * Komponen ini memastikan routing sisi server untuk halaman-halaman utama aplikasi.
 */

const express = require('express');
const path = require('path');
const app = express();

/**
 * MIDDLEWARE: Static Files
 * Menginstruksikan Express untuk melayani file statis (seperti js/api.js, js/auth.js, dll)
 * yang berada di dalam direktori 'public'.
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * ROUTING: Member Portal (Root)
 * Mengarahkan akses root ke halaman utama Member Dashboard.
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * ROUTING: Admin Portal
 * Menyediakan akses ke antarmuka manajemen untuk Administrator.
 */
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/**
 * ROUTING: Registration Portal
 * Mengarahkan pengguna ke formulir pendaftaran akun baru.
 */
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

/**
 * KONFIGURASI SERVER & DEPLOYMENT
 * Menggunakan Port 80 (Standard HTTP) agar aplikasi dapat diakses langsung 
 * tanpa menuliskan nomor port pada URL di lingkungan Azure.
 */
const PORT = process.env.PORT || 80;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(` GATEWAY FRONTEND AKTIF PADA PORT ${PORT} `);
    console.log(` Akses: http://localhost:${PORT}          `);
    console.log(`==========================================`);
});