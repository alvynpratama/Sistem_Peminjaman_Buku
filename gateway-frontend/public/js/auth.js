function checkAuth() {
    const path = window.location.pathname;
    const currentRole = path === '/admin' ? 'admin' : 'user';
    const token = localStorage.getItem(`${currentRole}_token`);

    if (token) {
        if (typeof showDashboard === "function") {
            showDashboard(currentRole);
        }
    }
}

function logout() {
    const path = window.location.pathname;
    const currentRole = path === '/admin' ? 'admin' : 'user';
    
    localStorage.removeItem(`${currentRole}_token`);
    localStorage.removeItem(`${currentRole}_role`);
    location.reload();
}

window.onload = checkAuth;