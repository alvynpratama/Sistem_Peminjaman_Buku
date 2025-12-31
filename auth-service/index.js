const express = require('express');



const mysql = require('mysql2');



const bcrypt = require('bcryptjs'); // Gunakan bcryptjs untuk kompatibilitas Azure Windows



const jwt = require('jsonwebtoken');



const cors = require('cors');







const app = express();



app.use(express.json());







// 1. KOREKSI CORS: Pastikan domain benar (koreacentral)



app.use(cors({



origin: 'https://peminjaman-buku-cxbrajbnh9cdemgu.koreacentral-01.azurewebsites.net',



methods: ['GET', 'POST', 'PUT', 'DELETE'],



allowedHeaders: ['Content-Type', 'Authorization']



}));







// 2. KONEKSI DATABASE: Menambahkan SSL



const db = mysql.createPool({



host: process.env.DB_HOST,



user: process.env.DB_USER || 'taufiq',



password: process.env.DB_PASSWORD,



database: process.env.DB_NAME || 'auth_db',



port: 3306,



ssl: { rejectUnauthorized: false }, // WAJIB untuk Azure



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







// REGISTER - PERBAIKAN: Menghapus logika 'null' agar data tersimpan



app.post('/register', async (req, res) => {



const { username, password, role, full_name, email, phone_number } = req.body;



try {



const hashedPassword = await bcrypt.hash(password, 10);



const query = 'INSERT INTO users (username, password, role, full_name, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)';






// Simpan data apa adanya tanpa mempedulikan role admin/user



db.query(query, [



username,



hashedPassword,



role || 'user',



full_name || '',



email || '',



phone_number || ''



], (err) => {



if (err) return res.status(500).json({ error: err.message });



res.status(201).json({ message: "Registrasi Berhasil!" });



});



} catch (e) { res.status(500).json({ message: "Error enkripsi" }); }



});







// LOGIN - PERBAIKAN: Mengirim semua data agar Frontend bisa mengisi form



app.post('/login', (req, res) => {



const { username, password } = req.body;



db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {



if (err || results.length === 0) return res.status(401).json({ message: "User tidak ditemukan" });
