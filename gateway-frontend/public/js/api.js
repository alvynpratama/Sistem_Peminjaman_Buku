/**
 * API.JS - Client-Side API Gateway & Service Connector
 * * File ini bertanggung jawab untuk mengatur seluruh komunikasi HTTP antara 
 * Frontend dan ekosistem Microservices (Auth Service & Main Service).
 */

/** * KONFIGURASI ENDPOINT MICROSERVICES
 * Memisahkan URL berdasarkan tanggung jawab layanan (Separation of Concerns).
 */
const AUTH_URL = 'http://localhost:5001'; // Microservice untuk Autentikasi (Login/Register/Profile)
const MAIN_URL = 'http://localhost:5002'; // Microservice Utama (Katalog Buku/Peminjaman)

/**
 * FUNGSI GLOBAL: callAPI
 * Sebuah wrapper fungsi fetch yang distandarisasi untuk menangani permintaan API.
 * * @param {string} url - Endpoint tujuan.
 * @param {string} method - HTTP Method (GET, POST, DELETE, dll).
 * @param {object} body - Data yang akan dikirim (opsional).
 * @param {string} roleContext - Konteks pengguna ('user' atau 'admin') untuk pengambilan token.
 * @returns {object} - Objek berisi status kode HTTP dan data respon.
 */
async function callAPI(url, method, body, roleContext = 'user') {
    // 1. SECURITY: Mengambil JWT Token dari LocalStorage sesuai konteks peran (Admin/User)
    const token = localStorage.getItem(`${roleContext}_token`);
    
    // 2. HEADERS: Inisialisasi header standar untuk format data JSON
    const headers = { 'Content-Type': 'application/json' };
    
    // 3. AUTHORIZATION: Jika token tersedia, sisipkan ke header menggunakan standar 'Bearer Token'
    // Ini krusial untuk melewati middleware otentikasi di sisi backend.
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        // 4. NETWORK REQUEST: Melakukan pemanggilan ke server
        const res = await fetch(url, { 
            method, 
            headers, 
            body: body ? JSON.stringify(body) : null 
        });

        // 5. PARSING: Mengecek tipe konten respon. Jika JSON, maka lakukan parsing.
        let data = {};
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        }

        // 6. ERROR HANDLING: Menangani respon yang tidak sukses (status selain 2xx)
        if (!res.ok) {
            // Hindari menampilkan alert jika error adalah 401 (Unauthorized) atau 403 (Forbidden)
            // karena biasanya ini ditangani secara otomatis oleh logika redirect auth.js
            if (res.status !== 401 && res.status !== 403) {
                // Menampilkan pesan error spesifik dari backend atau pesan standar
                console.warn(`API Warning (${res.status}):`, data.message);
                // Catatan: Anda bisa memanggil showNotify() di sini jika ingin seragam.
            }
            return { status: res.status, data };
        }

        // 7. SUCCESS: Mengembalikan data hasil olahan dari server
        return { status: res.status, data };

    } catch (err) {
        // 8. LOGGING: Menangani kegagalan koneksi fisik (jaringan terputus atau server mati)
        console.error("Critical API Error:", err);
        return { status: 500, data: { message: "Gagal terhubung ke server. Pastikan backend aktif." } };
    }
}