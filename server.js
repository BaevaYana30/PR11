
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Проверка настроек
if (
  !process.env.MONGO_URI ||
  !process.env.ADMIN_LOGIN ||
  !process.env.ADMIN_HASH ||
  !process.env.SESSION_SECRET
) {
  throw new Error("Не заполнены настройки в файле .env");
}

// Настройка EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Статические файлы
app.use(express.static(path.join(__dirname, "public")));

// Обработка JSON и форм
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000,
    sameSite: "lax"
  }
}));

// Модель виниловой пластинки
const vinylSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    default: "Не указано"
  },
  genre: {
    type: String,
    required: true,
    trim: true
  }
});

const Vinyl = mongoose.model("Vinyl", vinylSchema);

// Проверка авторизации для страниц
function requireAuth(req, res, next) {
  if (!req.session.isAdmin) {
    return res.redirect("/login");
  }
  next();
}

// Проверка авторизации для API
function requireApiAuth(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: "Требуется вход администратора"
    });
  }
  next();
}

// Проверка данных пластинки
function validateVinyl(data) {
  const errors = [];

  if (
    typeof data.title !== "string" ||
    !data.title.trim()
  ) {
    errors.push("Укажите название");
  }

  if (
    typeof data.artist !== "string" ||
    !data.artist.trim()
  ) {
    errors.push("Укажите исполнителя");
  }

  if (
    !Number.isInteger(Number(data.year)) ||
    Number(data.year) < 1
  ) {
    errors.push("Некорректный год");
  }

  if (
    data.price === undefined ||
    data.price === null ||
    String(data.price).trim() === "" ||
    !Number.isFinite(Number(data.price)) ||
    Number(data.price) < 0
  ) {
    errors.push("Некорректная цена");
  }

  if (
    typeof data.genre !== "string" ||
    !data.genre.trim()
  ) {
    errors.push("Укажите жанр");
  }

  return errors;
}

// Подготовка данных
function prepareVinyl(data) {
  return {
    title: data.title.trim(),
    artist: data.artist.trim(),
    year: Number(data.year),
    price: Number(data.price),
    condition: data.condition || "Не указано",
    genre: data.genre.trim()
  };
}

// Создание новой пластинки
async function createVinyl(data) {
  const errors = validateVinyl(data);

  if (errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.status = 400;
    throw error;
  }

  const lastVinyl = await Vinyl.findOne()
    .sort({ id: -1 });

  const nextId = lastVinyl ? lastVinyl.id + 1 : 1;

  return Vinyl.create({
    id: nextId,
    ...prepareVinyl(data)
  });
}

// =====================================
// ГЛАВНАЯ СТРАНИЦА
// =====================================

app.get("/", async (req, res, next) => {
  try {
    const items = await Vinyl.find()
      .sort({ id: 1 });

    res.render("index", {
      items,
      isAdmin: Boolean(req.session.isAdmin)
    });
  } catch (error) {
    next(error);
  }
});

// =====================================
// АВТОРИЗАЦИЯ
// =====================================

// Страница входа
app.get("/login", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/add");
  }

  res.render("login", { error: null });
});

// Вход администратора
app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const validLogin =
      username === process.env.ADMIN_LOGIN;

    const validPassword =
      typeof password === "string" &&
      await bcrypt.compare(
        password,
        process.env.ADMIN_HASH
      );

    if (!validLogin || !validPassword) {
      return res.status(401).render("login", {
        error: "Неверный логин или пароль"
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.isAdmin = true;

      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.redirect("/add");
      });
    });
  } catch (error) {
    next(error);
  }
});

// Выход
app.post("/logout", requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// =====================================
// ДОБАВЛЕНИЕ ЧЕРЕЗ ФОРМУ
// =====================================

app.get("/add", requireAuth, (req, res) => {
  res.render("add", { error: null });
});

app.post("/add", requireAuth, async (req, res) => {
  try {
    await createVinyl(req.body);
    res.redirect("/");
  } catch (error) {
    res.status(error.status || 500).render("add", {
      error: error.status
        ? error.message
        : "Не удалось добавить пластинку"
    });
  }
});

// =====================================
// ЧАСТЬ 1. GET — 40 БАЛЛОВ
// ФИЛЬТРАЦИЯ И ПАГИНАЦИЯ
// =====================================

async function getVinylList(req, res, next) {
  try {
    const filter = {};

    // Фильтр по жанру
    if (req.query.genre) {
      const genre = String(req.query.genre)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.genre = new RegExp(
        "^" + genre + "$",
        "i"
      );
    }

    // Фильтр по году
    if (req.query.year !== undefined) {
      const year = Number(req.query.year);

      if (
        !Number.isInteger(year) ||
        year < 1
      ) {
        return res.status(400).json({
          error: "Некорректный год"
        });
      }

      filter.year = year;
    }

    // Фильтр по исполнителю
    if (req.query.artist) {
      const artist = String(req.query.artist)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.artist = new RegExp(artist, "i");
    }

    // Пагинация
    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 10
      : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        error: "page должен быть от 1, limit от 1 до 50"
      });
    }

    const skip = (page - 1) * limit;

    const total = await Vinyl.countDocuments(filter);

    const items = await Vinyl.find(filter)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      total,
      page,
      limit,
      items
    });
  } catch (error) {
    next(error);
  }
}

// Основной адрес и дополнительный адрес
app.get("/api/items", getVinylList);
app.get("/items", getVinylList);

// =====================================
// GET — ОДНА ПЛАСТИНКА
// =====================================

async function getOneVinyl(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Некорректный ID"
      });
    }

    const item = await Vinyl.findOne({ id });

    if (!item) {
      return res.status(404).json({
        error: "Пластинка не найдена"
      });
    }

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

app.get("/api/items/:id", getOneVinyl);
app.get("/items/:id", getOneVinyl);

// =====================================
// ЧАСТЬ 2. POST 
// ДОБАВЛЕНИЕ ПЛАСТИНКИ
// =====================================

async function postVinyl(req, res, next) {
  try {
    const item = await createVinyl(req.body);

    res.status(201).json({
      message: "Пластинка успешно добавлена",
      item
    });
  } catch (error) {
    next(error);
  }
}

app.post("/api/items", requireApiAuth, postVinyl);
app.post("/items", requireApiAuth, postVinyl);

// =====================================
// ЧАСТЬ 3. PUT — ИЗМЕНЕНИЕ
// =====================================

async function putVinyl(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Некорректный ID"
      });
    }

    const errors = validateVinyl(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Проверьте заполнение полей",
        details: errors
      });
    }

    const updated = await Vinyl.findOneAndUpdate(
      { id },
      { $set: prepareVinyl(req.body) },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      return res.status(404).json({
        error: "Пластинка не найдена"
      });
    }

    res.status(200).json({
      message: "Пластинка успешно обновлена",
      item: updated
    });
  } catch (error) {
    next(error);
  }
}

app.put("/api/items/:id", requireApiAuth, putVinyl);
app.put("/items/:id", requireApiAuth, putVinyl);

// =====================================
// ЧАСТЬ 3. DELETE — УДАЛЕНИЕ
// =====================================

async function deleteVinyl(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Некорректный ID"
      });
    }

    const deleted = await Vinyl.findOneAndDelete({
      id
    });

    if (!deleted) {
      return res.status(404).json({
        error: "Пластинка не найдена"
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

app.delete(
  "/api/items/:id",
  requireApiAuth,
  deleteVinyl
);

app.delete(
  "/items/:id",
  requireApiAuth,
  deleteVinyl
);

// =====================================
// НЕИЗВЕСТНЫЕ API-МАРШРУТЫ
// =====================================

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API-маршрут не найден"
  });
});

// =====================================
// ОШИБКА 404
// =====================================

app.use((req, res) => {
  res.status(404).render("error", {
    message: "Страница не найдена"
  });
});

// =====================================
// ОБРАБОТКА ОШИБОК
// =====================================

app.use((err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;
  const message = err.status
    ? err.message
    : "Внутренняя ошибка сервера";

  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/items")
  ) {
    return res.status(status).json({
      error: message
    });
  }

  res.status(status).render("error", {
    message
  });
});

// =====================================
// ПОДКЛЮЧЕНИЕ MONGODB
// =====================================

async function startServer() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB подключена!");

  const count = await Vinyl.countDocuments();

  // Перенос старых записей из JSON
  if (count === 0) {
    const dataPath = path.join(
      __dirname,
      "data.json"
    );

    if (fs.existsSync(dataPath)) {
      const oldItems = JSON.parse(
        fs.readFileSync(dataPath, "utf8")
      );

      if (
        Array.isArray(oldItems) &&
        oldItems.length > 0
      ) {
        await Vinyl.insertMany(oldItems);

        console.log(
          "Пластинки перенесены:",
          oldItems.length
        );
      }
    }
  }

  app.listen(PORT, () => {
    console.log(
      `Сервер запущен: http://localhost:${PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error(
    "Ошибка запуска:",
    error.message
  );

  process.exit(1);
});
