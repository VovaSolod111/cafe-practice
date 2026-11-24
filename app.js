const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const dbConfig = require("./config/db.config.js");

const app = express();
const PORT = 3000;

// Пул соединений для стабильной работы с облачной БД filess.io
const pool = mysql.createPool({
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    waitForConnections: true,
    connectionLimit: 5
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "cafe_secret_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 час
}));

// Middleware: проверка активной сессии пользователя
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Необходима авторизация" });
    }
    next();
}

// 1. Регистрация с шифрованием пароля (bcryptjs)
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Заполните все поля" });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [name, email, hash],
            (err) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({ error: "Этот email уже зарегистрирован" });
                    }
                    console.error(err);
                    return res.status(500).json({ error: "Ошибка базы данных" });
                }
                res.json({ message: "Регистрация прошла успешно! Теперь войдите в аккаунт." });
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка шифрования пароля" });
    }
});

// 2. Авторизация и создание сессии
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    pool.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка базы данных" });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: "Неверный email или пароль" });
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Неверный email или пароль" });
        }
        req.session.user = { id: user.id, name: user.name, email: user.email };
        res.json({ message: "Вход выполнен", user: req.session.user });
    });
});

// 3. Проверка текущей сессии и выход
app.get("/api/me", (req, res) => {
    res.json({ user: req.session.user || null });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Вы вышли из системы" }));
});

// 4. Бронирование столика (доступно ТОЛЬКО авторизованным)
app.post("/api/bookings", requireAuth, (req, res) => {
    const { booking_date, booking_time, guests, comment } = req.body;
    pool.query(
        "INSERT INTO bookings (user_id, booking_date, booking_time, guests, comment) VALUES (?, ?, ?, ?, ?)",
        [req.session.user.id, booking_date, booking_time, guests, comment || ""],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Ошибка при сохранении брони" });
            }
            res.json({ message: "Столик успешно забронирован!" });
        }
    );
});

// Просмотр своих бронирований
app.get("/api/bookings", requireAuth, (req, res) => {
    pool.query(
        "SELECT booking_date, booking_time, guests, comment FROM bookings WHERE user_id = ? ORDER BY booking_date DESC",
        [req.session.user.id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Ошибка загрузки броней" });
            }
            res.json(results);
        }
    );
});

// Обработчик ошибки 404
app.use((req, res) => {
    res.status(404).send("Ошибка 404! Такой страницы не существует");
});

app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
