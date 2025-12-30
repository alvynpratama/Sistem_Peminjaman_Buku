/**
 * API.JS - Client-Side API Gateway & Service Connector
 * File ini bertanggung jawab untuk mengatur seluruh komunikasi HTTP antara 
 * Frontend dan ekosistem Microservices (Auth Service & Main Service).
 */

/** * KONFIGURASI ENDPOINT MICROSERVICES
 * PENTING: Ganti URL di bawah ini dengan URL Web App Azure yang Anda buat nanti.
 * localhost tidak bisa diakses dari internet (Azure).
 */

const AUTH_URL = 'https://auth-peminjaman-cloud-cxc8c5dfebfmeyhf.koreacentral-01.azurewebsites.net';
const MAIN_URL = 'https://main-peminjaman-cloud-eqfjc5drcydfcta4.koreacentral-01.azurewebsites.net';

/**
 * FUNGSI GLOBAL: callAPI
 * Sebuah wrapper fungsi fetch yang distandarisasi untuk menangani permintaan API.
 */
async function callAPI(url, method, body, roleContext = 'user') {
    // 1. SECURITY: Mengambil JWT Token dari LocalStorage sesuai konteks peran (Admin/User)
    const token = localStorage.getItem(`${roleContext}_token`);
    
    // 2. HEADERS: Inisialisasi header standar untuk format data JSON
    const headers = { 'Content-Type': 'application/json' };
    
    // 3. AUTHORIZATION: Jika token tersedia, sisipkan ke header menggunakan standar 'Bearer Token'
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
            if (res.status !== 401 && res.status !== 403) {
                console.warn(`API Warning (${res.status}):`, data.message || "Terjadi kesalahan pada server.");
            }
            return { status: res.status, data };
        }

        // 7. SUCCESS: Mengembalikan data hasil olahan dari server
        return { status: res.status, data };

    } catch (err) {
        // 8. LOGGING: Menangani kegagalan koneksi fisik (server mati atau URL salah)
        console.error("Critical API Error:", err);
        return { 
            status: 500, 
            data: { message: "Gagal terhubung ke API Cloud. Pastikan Service Backend di Azure sudah aktif dan CORS diizinkan." } 
        };
    }
}
