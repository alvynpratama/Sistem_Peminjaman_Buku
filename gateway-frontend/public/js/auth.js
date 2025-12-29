/**
 * AUTH.JS - Manajemen Sesi & Otentikasi Client-Side
 * * File ini berfungsi untuk mengatur siklus hidup login pengguna,
 * memvalidasi token JWT di LocalStorage, dan menangani proses logout
 * secara terpisah antara role 'Admin' dan 'User'.
 */

/**
 * Memeriksa status otentikasi saat halaman dimuat.
 * Fungsi ini menentukan apakah pengguna memiliki session aktif
 * berdasarkan path URL yang sedang diakses.
 */
function checkAuth() {
    // Mengambil path URL saat ini (misal: /admin atau /)
    const path = window.location.pathname;
    
    // Menentukan target role berdasarkan routing path
    const currentRole = path.includes('admin') ? 'admin' : 'user';
    
    // Mencoba mengambil JWT token yang tersimpan di LocalStorage sesuai role
    // Penggunaan key yang spesifik (admin_token vs user_token) mencegah kebocoran sesi antar role
    const token = localStorage.getItem(`${currentRole}_token`);

    // Jika token ditemukan, sistem mengasumsikan sesi masih valid (validasi asli dilakukan di backend via api.js)
    if (token) {
        // Memeriksa apakah fungsi showDashboard tersedia di global scope (index.html/admin.html)
        if (typeof showDashboard === "function") {
            // Memindahkan tampilan dari Form Login ke Dashboard Utama
            showDashboard(currentRole);
        }
    }
}

/**
 * Menangani proses pengakhiran sesi (Logout).
 * Menghapus data sensitif dari penyimpanan lokal dan mengembalikan state aplikasi ke awal.
 */
function logout() {
    const path = window.location.pathname;
    
    // Deteksi role aktif saat ini untuk menentukan data mana yang harus dihapus
    const currentRole = path.includes('admin') ? 'admin' : 'user';
    
    // Pembersihan LocalStorage: Menghapus token dan informasi role
    localStorage.removeItem(`${currentRole}_token`);
    localStorage.removeItem(`${currentRole}_role`);
    
    // Menghapus data profil tambahan untuk menjaga privasi pengguna
    localStorage.removeItem(`${currentRole}_full_name`);
    localStorage.removeItem(`${currentRole}_username`);
    localStorage.removeItem(`${currentRole}_email`);
    localStorage.removeItem(`${currentRole}_phone`);

    // Reload halaman untuk memicu checkAuth() kembali dan menampilkan layar login
    location.reload();
}

/**
 * Event Listener: Menjalankan pengecekan otentikasi otomatis
 * setiap kali jendela browser selesai memuat seluruh resource.
 */
window.onload = checkAuth;