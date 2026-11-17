
document.addEventListener("DOMContentLoaded", () => {
    const cart = [];

    const cartModal = document.getElementById("cart-modal");
    const checkoutModal = document.getElementById("checkout-modal");

    const cartCount = document.getElementById("cart-count");
    const cartItems = document.getElementById("cart-items-container");
    const cartTotal = document.getElementById("cart-total");
    const checkoutTotal = document.getElementById("checkout-total");

    const openCartBtn = document.getElementById("open-cart-btn");
    const closeCartBtn = document.getElementById("close-cart");
    const closeCheckoutBtn = document.getElementById("close-checkout");
    const checkoutBtn = document.getElementById("go-to-checkout");
    const backBtn = document.getElementById("back-to-cart");
    const orderForm = document.getElementById("order-form");

    function formatPrice(price) {
        return price.toLocaleString("ru-RU") + " тг";
    }

    function updateCart() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce(
            (sum, item) => sum + item.price * item.quantity, 0
        );

        cartCount.textContent = count;
        cartTotal.textContent = formatPrice(total);
        checkoutTotal.textContent = formatPrice(total);

        cartItems.innerHTML = "";

        if (cart.length === 0) {
            cartItems.innerHTML = "<p>Ваша корзина пока пуста</p>";
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

    document.querySelectorAll(".fav-btn").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".card");

            const id = card.dataset.id;
            const title = card.dataset.title;
            const artist = card.dataset.artist;
            const price = Number(card.dataset.price);

            const existing = cart.find(item => item.id === id);

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

    openCartBtn.addEventListener("click", () => {
        cartModal.classList.add("active");
    });

    closeCartBtn.addEventListener("click", () => {
        cartModal.classList.remove("active");
    });

    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Сначала добавьте пластинки в корзину!");
            return;
        }

        cartModal.classList.remove("active");
        checkoutModal.classList.add("active");
    });

    closeCheckoutBtn.addEventListener("click", () => {
        checkoutModal.classList.remove("active");
    });

    backBtn.addEventListener("click", () => {
        checkoutModal.classList.remove("active");
        cartModal.classList.add("active");
    });

    orderForm.addEventListener("submit", event => {
        event.preventDefault();

        if (cart.length === 0) {
            alert("Корзина пуста!");
            return;
        }

        alert("Спасибо за заказ! Мы свяжемся с вами.");

        cart.length = 0;
        orderForm.reset();

        updateCart();

        checkoutModal.classList.remove("active");
    });

    updateCart();
});
