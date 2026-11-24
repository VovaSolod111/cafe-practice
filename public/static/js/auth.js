const alertBox = document.getElementById("pm02-alert");
const authBox = document.getElementById("pm02-auth-box");
const cabinetBox = document.getElementById("pm02-cabinet-box");
const usernameEl = document.getElementById("pm02-username");
const navAuthLink = document.getElementById("nav-auth-link");
const bookingsList = document.getElementById("bookings-list");

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const bookingForm = document.getElementById("booking-form");
const logoutBtn = document.getElementById("logout-btn");

function showAlert(text, type = "success") {
    alertBox.textContent = text;
    alertBox.className = `alert alert-${type === "error" ? "danger" : "success"}`;
}

function hideAlert() {
    alertBox.className = "alert d-none";
}

// Переключение вкладок Вход / Регистрация
tabLogin.addEventListener("click", () => {
    hideAlert();
    tabLogin.className = "btn btn-warning fw-semibold";
    tabRegister.className = "btn btn-outline-light";
    loginForm.classList.remove("d-none");
    registerForm.classList.add("d-none");
});

tabRegister.addEventListener("click", () => {
    hideAlert();
    tabRegister.className = "btn btn-warning fw-semibold";
    tabLogin.className = "btn btn-outline-light";
    registerForm.classList.remove("d-none");
    loginForm.classList.add("d-none");
});

// Проверка активной сессии при загрузке страницы
async function checkSession() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (data.user) {
        authBox.classList.add("d-none");
        cabinetBox.classList.remove("d-none");
        usernameEl.textContent = `${data.user.name} (${data.user.email})`;
        navAuthLink.textContent = `Кабинет (${data.user.name})`;
        loadBookings();
    } else {
        authBox.classList.remove("d-none");
        cabinetBox.classList.add("d-none");
        navAuthLink.textContent = "Бронирование / Войти";
    }
}

// Загрузка списка броней пользователя
async function loadBookings() {
    const res = await fetch("/api/bookings");
    if (!res.ok) return;
    const rows = await res.json();

    if (rows.length === 0) {
        bookingsList.innerHTML = `<p class="text-secondary mb-0">У вас пока нет активных бронирований.</p>`;
        return;
    }

    bookingsList.innerHTML = rows.map(b => {
        const date = String(b.booking_date).slice(0, 10);
        const comment = b.comment ? `<div class="small text-secondary mt-1">${b.comment}</div>` : "";
        return `
            <div class="p-3 rounded bg-secondary bg-opacity-25 border-start border-warning border-4">
                <div><strong>${date} в ${b.booking_time}</strong> — гостей: ${b.guests}</div>
                ${comment}
            </div>
        `;
    }).join("");
}

// Регистрация
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(registerForm));
    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
        showAlert(data.message, "success");
        registerForm.reset();
        tabLogin.click();
    } else {
        showAlert(data.error || "Ошибка регистрации", "error");
    }
});

// Авторизация
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(loginForm));
    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
        showAlert(data.message, "success");
        loginForm.reset();
        checkSession();
    } else {
        showAlert(data.error || "Ошибка входа", "error");
    }
});

// Выход
logoutBtn.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    showAlert("Вы вышли из аккаунта", "success");
    checkSession();
});

// Бронирование столика
bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(bookingForm));
    const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
        showAlert(data.message, "success");
        bookingForm.reset();
        loadBookings();
    } else {
        showAlert(data.error || "Ошибка бронирования", "error");
    }
});

checkSession();
