
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // МУЗЫКА И ВРАЩЕНИЕ ПЛАСТИНОК
    // =====================================

    const tracks = {
        "Abbey Road": "/track1.mp3",
        "Random Access Memories": "/track2.mp3",
        "Thriller": "/track3.mp3"
    };

    let currentAudio = null;
    let currentRecord = null;

    function stopMusic() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }

        if (currentRecord) {
            currentRecord.classList.remove("playing");
            currentRecord = null;
        }
    }

    // =====================================
    // ИНФОРМАЦИЯ О ПЛАСТИНКЕ
    // =====================================

    const vinylInfoModal =
        document.getElementById("vinyl-info-modal");

    const closeVinylInfo =
        document.getElementById("close-vinyl-info");

    const infoTitle =
        document.getElementById("vinyl-info-title");

    const infoArtist =
        document.getElementById("vinyl-info-artist");

    const infoYear =
        document.getElementById("vinyl-info-year");

    const infoGenre =
        document.getElementById("vinyl-info-genre");

    const infoCondition =
        document.getElementById("vinyl-info-condition");

    const infoPrice =
        document.getElementById("vinyl-info-price");

    function openVinylInfo(card) {
        if (!vinylInfoModal) return;

        infoTitle.textContent = card.dataset.title || "";
        infoArtist.textContent = card.dataset.artist || "";
        infoYear.textContent = card.dataset.year || "";
        infoGenre.textContent = card.dataset.genre || "Не указан";
        infoCondition.textContent =
            card.dataset.condition || "Не указано";

        infoPrice.textContent =
            Number(card.dataset.price || 0).toLocaleString("ru-RU")
            + " тг";

        vinylInfoModal.classList.add("active");
    }

    function closeVinylWindow() {
        if (vinylInfoModal) {
            vinylInfoModal.classList.remove("active");
        }

        stopMusic();
    }

    if (closeVinylInfo) {
        closeVinylInfo.addEventListener(
            "click",
            closeVinylWindow
        );
    }

    if (vinylInfoModal) {
        vinylInfoModal.addEventListener("click", event => {
            if (event.target === vinylInfoModal) {
                closeVinylWindow();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeVinylWindow();
        }
    });

    // =====================================
    // НАЖАТИЕ НА КАРТОЧКУ ПЛАСТИНКИ
    // =====================================

    document.querySelectorAll(".card").forEach(card => {

        card.addEventListener("click", event => {

            // Не открываем окно при нажатии на кнопки
            if (event.target.closest("button, a, input")) {
                return;
            }

            openVinylInfo(card);

            const title = card.dataset.title;
            const audioPath = tracks[title];

            // Если у пластинки нет музыки
            if (!audioPath) {
                stopMusic();
                return;
            }

            const vinyl = card.querySelector(".vinyl-record");

            if (!vinyl) return;

            // Повторное нажатие останавливает музыку
            if (currentRecord === vinyl) {
                stopMusic();
                return;
            }

            // Останавливаем предыдущую музыку
            stopMusic();

            // Создаём новый аудиофайл
            const audio = new Audio(audioPath);

            audio.preload = "auto";
            audio.volume = 1;

            currentAudio = audio;
            currentRecord = vinyl;

            vinyl.classList.add("playing");

            // Запуск непосредственно после нажатия
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error(
                        "Ошибка воспроизведения музыки:",
                        error
                    );

                    if (currentAudio === audio) {
                        stopMusic();
                    }
                });
            }

            // Останавливаем вращение после окончания музыки
            audio.addEventListener("ended", () => {
                if (currentAudio === audio) {
                    stopMusic();
                }
            });

        });

    });

    // =====================================
    // КОРЗИНА
    // =====================================

    const cart = [];

    const cartModal =
        document.getElementById("cart-modal");

    const checkoutModal =
        document.getElementById("checkout-modal");

    const cartCount =
        document.getElementById("cart-count");

    const cartItems =
        document.getElementById("cart-items-container");

    const cartTotal =
        document.getElementById("cart-total");

    const checkoutTotal =
        document.getElementById("checkout-total");

    const openCartBtn =
        document.getElementById("open-cart-btn");

    const closeCartBtn =
        document.getElementById("close-cart");

    const closeCheckoutBtn =
        document.getElementById("close-checkout");

    const checkoutBtn =
        document.getElementById("go-to-checkout");

    const backBtn =
        document.getElementById("back-to-cart");

    const orderForm =
        document.getElementById("order-form");

    function formatPrice(price) {
        return Number(price).toLocaleString("ru-RU") + " тг";
    }

    function updateCart() {

        const count = cart.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const total = cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        if (cartCount) cartCount.textContent = count;

        if (cartTotal) {
            cartTotal.textContent = formatPrice(total);
        }

        if (checkoutTotal) {
            checkoutTotal.textContent = formatPrice(total);
        }

        if (!cartItems) return;

        cartItems.innerHTML = "";

        if (cart.length === 0) {
            cartItems.innerHTML =
                "<p>Ваша корзина пока пуста</p>";
            return;
        }

        cart.forEach(item => {

            const div = document.createElement("div");
            div.className = "cart-item";

            const title = document.createElement("strong");
            title.textContent = item.title;

            const artist = document.createElement("p");
            artist.textContent = item.artist;

            const price = document.createElement("p");

            price.textContent =
                formatPrice(item.price) + " × " + item.quantity;

            const removeBtn = document.createElement("button");

            removeBtn.textContent = "Удалить";
            removeBtn.type = "button";

            removeBtn.addEventListener("click", () => {

                const index = cart.findIndex(
                    product => product.id === item.id
                );

                if (index !== -1) {
                    cart.splice(index, 1);
                }

                updateCart();
            });

            div.append(title, artist, price, removeBtn);

            cartItems.appendChild(div);
        });
    }

    // Добавление пластинки в корзину
    document.querySelectorAll(".fav-btn").forEach(button => {

        button.addEventListener("click", event => {

            event.stopPropagation();

            const card = button.closest(".card");

            if (!card) return;

            const id = card.dataset.id;
            const title = card.dataset.title;
            const artist = card.dataset.artist;
            const price = Number(card.dataset.price);

            const existing = cart.find(
                item => item.id === id
            );

            if (existing) {
                existing.quantity++;
            } else {
                cart.push({
                    id,
                    title,
                    artist,
                    price,
                    quantity: 1
                });
            }

            updateCart();

            button.classList.add("active");
        });

    });

    // Открыть корзину
    if (openCartBtn) {
        openCartBtn.addEventListener("click", () => {
            stopMusic();

            if (vinylInfoModal) {
                vinylInfoModal.classList.remove("active");
            }

            cartModal.classList.add("active");
        });
    }

    // Закрыть корзину
    if (closeCartBtn) {
        closeCartBtn.addEventListener("click", () => {
            cartModal.classList.remove("active");
        });
    }

    // Перейти к оформлению
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {

            if (cart.length === 0) {
                alert("Сначала добавьте пластинки в корзину!");
                return;
            }

            cartModal.classList.remove("active");
            checkoutModal.classList.add("active");
        });
    }

    // Закрыть оформление
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener("click", () => {
            checkoutModal.classList.remove("active");
        });
    }

    // Назад в корзину
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            checkoutModal.classList.remove("active");
            cartModal.classList.add("active");
        });
    }

    // Оформление заказа
    if (orderForm) {
        orderForm.addEventListener("submit", event => {

            event.preventDefault();

            if (cart.length === 0) {
                alert("Корзина пуста!");
                return;
            }

            alert("Спасибо за заказ! Мы свяжемся с вами.");

            cart.length = 0;

            orderForm.reset();

            document.querySelectorAll(".fav-btn").forEach(button => {
                button.classList.remove("active");
            });

            updateCart();

            checkoutModal.classList.remove("active");
        });
    }

    updateCart();

});
