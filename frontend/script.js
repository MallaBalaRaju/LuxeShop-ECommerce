document.addEventListener('DOMContentLoaded', () => {
    let products = [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Selectors
    const productsContainer = document.getElementById('products-container');
    const cartPanel = document.getElementById('cart-panel');
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const authButtons = document.getElementById('auth-buttons');
    const toastContainer = document.getElementById('toast-container');

    // Init App
    function init() {
        updateNavbar();
        fetchProducts();
        renderCart();
        setupEventListeners();
    }

    // Toggle Cart
    function toggleCart() {
        cartPanel.classList.toggle('open');
    }

    // Toast Notification helper
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Slide out and remove
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Update Navigation based on login state
    function updateNavbar() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (token && user) {
            authButtons.innerHTML = `
                <span style="color: var(--text-secondary); font-weight: 500;">Welcome, ${user.username}</span>
                <button class="btn btn-outline" id="logout-btn">Log Out</button>
            `;
        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="btn btn-outline" id="nav-login">Login</a>
                <a href="signup.html" class="btn btn-primary" id="nav-signup">Sign Up</a>
            `;
        }
    }

    // Fetch Products from Backend
    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('Failed to fetch products');
            products = await res.json();
            renderProducts(products);
        } catch (err) {
            console.error(err);
            productsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--danger);">
                    <i class="fa-solid fa-triangle-exclamation fa-2xl" style="margin-bottom: 1rem;"></i>
                    <p>Failed to connect to LuxeShop services. Please check backend connection.</p>
                </div>
            `;
        }
    }

    // Render Products Grid
    function renderProducts(items) {
        if (items.length === 0) {
            productsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <p>No products available right now.</p>
                </div>
            `;
            return;
        }

        productsContainer.innerHTML = items.map(p => `
            <article class="product-card">
                <div class="product-image-container">
                    <img src="${p.image || 'https://via.placeholder.com/400x300?text=Luxury+Product'}" alt="${p.name}" class="product-image">
                </div>
                <div class="product-details">
                    <span class="product-category">${p.category || 'Luxury'}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-description">${p.description}</p>
                    <div class="product-footer">
                        <span class="product-price">$${p.price.toFixed(2)}</span>
                        <button class="btn btn-primary add-to-cart-btn" data-id="${p._id}">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            </article>
        `).join('');
    }

    // Render Cart Contents
    function renderCart() {
        // Count items
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = count;

        // Sum price
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalPrice.textContent = `$${total.toFixed(2)}`;

        // Render Items
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem 0; color: var(--text-secondary);">
                    <i class="fa-solid fa-bag-shopping fa-2xl" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>Your bag is empty.</p>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" data-action="decrease" data-id="${item._id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" data-action="increase" data-id="${item._id}">+</button>
                    </div>
                </div>
                <button class="remove-item-btn" data-id="${item._id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');

        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Event Delegation and Event Listeners setup
    function setupEventListeners() {
        // Toggle Cart Panel
        cartToggleBtn.addEventListener('click', toggleCart);
        closeCartBtn.addEventListener('click', toggleCart);

        // Checkout logic
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('Your bag is empty!', 'error');
                return;
            }
            showToast('Checkout successful! Thank you for shopping at LuxeShop.', 'success');
            cart = [];
            renderCart();
            toggleCart();
        });

        // Event delegation for Product Grid (Add-to-cart clicks)
        productsContainer.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-to-cart-btn');
            if (addBtn) {
                const id = addBtn.dataset.id;
                const product = products.find(p => p._id === id);
                if (product) {
                    addToCart(product);
                }
            }
        });

        // Event delegation for Cart items (Qty and Remove clicks)
        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            
            // Remove button
            const removeBtn = target.closest('.remove-item-btn');
            if (removeBtn) {
                const id = removeBtn.dataset.id;
                removeFromCart(id);
                return;
            }

            // Qty change button
            const qtyBtn = target.closest('.qty-btn');
            if (qtyBtn) {
                const id = qtyBtn.dataset.id;
                const action = qtyBtn.dataset.action;
                updateQuantity(id, action);
            }
        });

        // Logout listener (via authButtons element since it's dynamic)
        authButtons.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showToast('Logged out successfully', 'success');
                updateNavbar();
            }
        });
    }

    // Add product to cart
    function addToCart(product) {
        const existing = cart.find(item => item._id === product._id);
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({
                _id: product._id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }
        renderCart();
        showToast(`${product.name} added to bag!`, 'success');
    }

    // Remove from cart
    function removeFromCart(id) {
        const index = cart.findIndex(item => item._id === id);
        if (index > -1) {
            const name = cart[index].name;
            cart.splice(index, 1);
            renderCart();
            showToast(`${name} removed from bag`, 'success');
        }
    }

    // Update quantity
    function updateQuantity(id, action) {
        const item = cart.find(item => item._id === id);
        if (!item) return;

        if (action === 'increase') {
            item.quantity++;
        } else if (action === 'decrease') {
            item.quantity--;
            if (item.quantity === 0) {
                removeFromCart(id);
                return;
            }
        }
        renderCart();
    }

    // Initialize application
    init();
});
