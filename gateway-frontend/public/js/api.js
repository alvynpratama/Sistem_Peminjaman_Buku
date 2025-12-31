/**
 * API.JS - Client-Side API Gateway & Service Connector (VERSI TEROPTIMAL)
 * Mengatur komunikasi antara Frontend dan Microservices di Azure.
 */

// 1. KONFIGURASI ENDPOINT
const AUTH_URL = 'https://auth-peminjaman-cloud-cxc8c5dfebfmeyhf.koreacentral-01.azurewebsites.net';
const MAIN_URL = 'https://main-peminjaman-cloud-eqfjc5drcydfcta4.koreacentral-01.azurewebsites.net';

/**
 * FUNGSI GLOBAL: callAPI
 * Digunakan untuk melakukan request ke backend dengan penanganan token otomatis.
 */
async function callAPI(url, method, body, roleContext = 'user') {
    const token = localStorage.getItem(`${roleContext}_token`); //
    const headers = { 'Content-Type': 'application/json' };
    
    if (token) headers['Authorization'] = `Bearer ${token}`; //

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
            data: { message: "Gagal terhubung ke server Azure." } 
        };
    }
}

/**
 * FUNGSI PEMBANTU (HELPER): Manajemen Sesi & Profil
 */

// 1. Simpan Sesi Login (Dipanggil setelah login berhasil)
function saveSession(data, role = 'user') {
    localStorage.setItem(`${role}_token`, data.token);
    localStorage.setItem(`${role}_name`, data.name || data.username);
    localStorage.setItem(`${role}_username`, data.username);
    localStorage.setItem(`${role}_email`, data.email || '');
    // Konsistensi: Selalu gunakan data.phone_number dari backend
    localStorage.setItem(`${role}_phone`, data.phone_number || ''); 
}

// 2. Ambil Data Sesi (Digunakan untuk mengisi UI Dashboard/Profile)
function getSession(role = 'user') {
    return {
        token: localStorage.getItem(`${role}_token`),
        name: localStorage.getItem(`${role}_name`) || 'Guest',
        username: localStorage.getItem(`${role}_username`),
        email: localStorage.getItem(`${role}_email`) || '',
        phone: localStorage.getItem(`${role}_phone`) || ''
    };
}

// 3. Hapus Sesi (Logout)
function clearSession(role = 'user') {
    const keys = ['token', 'name', 'username', 'email', 'phone'];
    keys.forEach(key => localStorage.removeItem(`${role}_${key}`));
    window.location.href = role === 'admin' ? '/admin' : '/'; // Redirect otomatis
}

// 4. Update UI Profile (Penting agar data nomor telepon/email tidak kosong di form)
async function syncProfileUI(role = 'user') {
    const { status, data } = await callAPI(`${AUTH_URL}/profile`, 'GET', null, role);
    
    if (status === 200) {
        // Sinkronkan ulang localStorage dengan data asli database
        saveSession({
            token: localStorage.getItem(`${role}_token`), // Token tetap sama
            name: data.full_name,
            username: data.username,
            email: data.email,
            phone_number: data.phone_number //
        }, role);

        // Isi otomatis field HTML berdasarkan ID
        // Pastikan ID ini ada di file profile.html Anda!
        const mapping = {
            'profile-fullname': data.full_name,
            'profile-username': data.username,
            'profile-email': data.email,
            'profile-phone': data.phone_number
        };

        for (const [id, value] of Object.entries(mapping)) {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        }
    }
}
