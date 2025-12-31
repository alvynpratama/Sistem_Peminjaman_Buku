/**
 * API.JS - Client-Side API Gateway & Service Connector (VERSI FINAL)
 * Mengatur komunikasi antara Frontend dan Microservices di Azure.
 */

// 1. KONFIGURASI ENDPOINT (Pastikan URL ini sesuai dengan portal Azure Anda)
const AUTH_URL = 'https://auth-peminjaman-cloud-cxc8c5dfebfmeyhf.koreacentral-01.azurewebsites.net';
const MAIN_URL = 'https://main-peminjaman-cloud-eqfjc5drcydfcta4.koreacentral-01.azurewebsites.net';

/**
 * FUNGSI GLOBAL: callAPI
 * Wrapper fetch untuk menangani request, token, dan error handling.
 */
async function callAPI(url, method, body, roleContext = 'user') {
    // SECURITY: Mengambil token berdasarkan konteks (admin_token atau user_token)
    const token = localStorage.getItem(`${roleContext}_token`);
    
    const headers = { 'Content-Type': 'application/json' };
    
    // AUTHORIZATION: Sisipkan Bearer token jika tersedia
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(url, { 
            method, 
            headers, 
            body: body ? JSON.stringify(body) : null 
        });

        let data = {};
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        }

        if (!res.ok) {
            // Jika 401/403 (Unauthorized), abaikan log warn agar tidak mengotori konsol
            if (res.status !== 401 && res.status !== 403) {
                console.warn(`API Warning (${res.status}):`, data.message || "Server Error");
            }
            return { status: res.status, data };
        }

        return { status: res.status, data };

    } catch (err) {
        console.error("Critical API Error:", err);
        return { 
            status: 500, 
            data: { message: "Gagal terhubung ke Azure. Cek koneksi internet dan status Web App." } 
        };
    }
}

/**
 * FUNGSI PEMBANTU (HELPER): Manajemen Sesi & Profil
 * Digunakan untuk mengatasi bug "Guest" dan "Data Telepon/Email Hilang"
 */

// 1. Simpan Sesi Login (Dipanggil setelah login berhasil)
function saveSession(data, role = 'user') {
    localStorage.setItem(`${role}_token`, data.token);
    localStorage.setItem(`${role}_name`, data.name);
    localStorage.setItem(`${role}_username`, data.username);
    localStorage.setItem(`${role}_email`, data.email || '');
    localStorage.setItem(`${role}_phone`, data.phone_number || ''); // Simpan phone_number
}

// 2. Ambil Data Sesi (Digunakan untuk mengisi UI/Nama di Header)
function getSession(role = 'user') {
    return {
        token: localStorage.getItem(`${role}_token`),
        name: localStorage.getItem(`${role}_name`) || 'Guest',
        username: localStorage.getItem(`${role}_username`),
        email: localStorage.getItem(`${role}_email`),
        phone: localStorage.getItem(`${role}_phone`)
    };
}

// 3. Hapus Sesi (Logout)
function clearSession(role = 'user') {
    localStorage.removeItem(`${role}_token`);
    localStorage.removeItem(`${role}_name`);
    localStorage.removeItem(`${role}_username`);
    localStorage.removeItem(`${role}_email`);
    localStorage.removeItem(`${role}_phone`);
}

// 4. Update UI Profile (Fungsi agar input di halaman profile langsung terisi)
async function syncProfileUI(role = 'user') {
    const { status, data } = await callAPI(`${AUTH_URL}/profile`, 'GET', null, role);
    if (status === 200) {
        // Update LocalStorage agar data terbaru tetap tersimpan setelah logout-login
        localStorage.setItem(`${role}_name`, data.full_name || data.username);
        localStorage.setItem(`${role}_email`, data.email || '');
        localStorage.setItem(`${role}_phone`, data.phone_number || '');

        // Isi otomatis field di HTML jika elemennya ada
        const fields = {
            'profile-fullname': data.full_name,
            'profile-username': data.username,
            'profile-email': data.email,
            'profile-phone': data.phone_number // Menggunakan phone_number
        };

        for (const [id, value] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        }
    }
}
