const AUTH_URL = 'http://localhost:5001';
const MAIN_URL = 'http://localhost:5002';

async function callAPI(url, method, body, roleContext = 'user') {
    const token = localStorage.getItem(`${roleContext}_token`);
    const headers = { 'Content-Type': 'application/json' };
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
            if (res.status !== 401 && res.status !== 403) {
                alert(data.message || "Terjadi kesalahan server");
            }
            return { status: res.status, data };
        }

        return { status: res.status, data };
    } catch (err) {
        console.error("API Error:", err);
        return { status: 500, data: { message: "Gagal terhubung ke server" } };
    }
}