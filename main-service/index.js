const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createPool({
    host: process.env.DB_HOST || 'db-main',
    user: 'root',
    password: 'password_dosen',
    database: 'project_db',
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = 'secret_kunci_dosen';

const getJakartaTime = () => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 19).replace('T', ' ');
};

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak, token hilang" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Sesi kadaluarsa" });
        req.user = decoded;
        next();
    });
};

app.get('/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/books', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });

    const { id, title, author, year, genre, cover_url, stock } = req.body;

    if (id) {
        const query = 'UPDATE books SET title=?, author=?, year=?, genre=?, cover_url=?, stock=? WHERE id=?';
        db.execute(query, [title, author, year, genre, cover_url, stock, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Data buku berhasil diperbarui" });
        });
    } else {
        const query = 'INSERT INTO books (title, author, year, genre, cover_url, stock) VALUES (?, ?, ?, ?, ?, ?)';
        db.execute(query, [title, author, year, genre, cover_url || '', stock], (err) => {
            if (err) return res.status(500).json(err);
            res.status(201).json({ message: "Buku baru berhasil ditambahkan" });
        });
    }
});

app.delete('/books/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses khusus Admin" });
    const bookId = req.params.id;

    db.query('SELECT * FROM borrowings WHERE book_id = ? AND return_date IS NULL', [bookId], (err, results) => {
        if (results.length > 0) {
            return res.status(400).json({ message: "Buku tidak bisa dihapus karena sedang dipinjam!" });
        }

        db.execute('DELETE FROM books WHERE id = ?', [bookId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Buku berhasil dihapus dari sistem" });
        });
    });
});

app.post('/borrow', authenticate, (req, res) => {
    const { book_id, borrower_name, borrower_phone } = req.body;
    const user_id = req.user.id;
    const date = getJakartaTime();

    db.query('SELECT stock FROM books WHERE id = ?', [book_id], (err, results) => {
        if (results.length > 0 && results[0].stock > 0) {
            db.execute('INSERT INTO borrowings (book_id, user_id, borrower_name, borrower_phone, borrow_date) VALUES (?, ?, ?, ?, ?)',
                [book_id, user_id, borrower_name, borrower_phone, date], (err) => {
                    if (err) return res.status(500).json(err);
                    db.execute('UPDATE books SET stock = stock - 1 WHERE id = ?', [book_id]);
                    res.json({ message: "Buku berhasil dipinjam!" });
                });
        } else {
            res.status(400).json({ message: "Stok buku tidak tersedia" });
        }
    });
});

app.get('/borrowings/all', authenticate, (req, res) => {
    let query = `
        SELECT b.id, bk.title, bk.cover_url, b.borrow_date, b.return_date, b.user_id, b.borrower_name, b.borrower_phone 
        FROM borrowings b
        JOIN books bk ON b.book_id = bk.id`;

    let params = [];
    if (req.user.role !== 'admin') {
        query += " WHERE b.user_id = ?";
        params.push(req.user.id);
    }

    query += " ORDER BY b.id DESC";

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/return', authenticate, (req, res) => {
    const { borrowing_id } = req.body;
    const return_date = getJakartaTime();

    db.query('SELECT book_id FROM borrowings WHERE id = ?', [borrowing_id], (err, results) => {
        if (results.length > 0) {
            const book_id = results[0].book_id;
            db.execute('UPDATE borrowings SET return_date = ? WHERE id = ?', [return_date, borrowing_id], () => {
                db.execute('UPDATE books SET stock = stock + 1 WHERE id = ?', [book_id]);
                res.json({ message: "Buku telah dikembalikan" });
            });
        } else {
            res.status(404).json({ message: "Data tidak ditemukan" });
        }
    });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Main Service Aktif di Port ${PORT}`));