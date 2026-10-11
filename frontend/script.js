/**
 * LuxeShop Modern Frontend Application Logic
 * Supports real-time filtering, searching, wishlist, dynamic cart, promo discounts
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let allProducts = [];
    let displayedProducts = [];
    let cart = JSON.parse(localStorage.getItem('luxeshop_cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('luxeshop_wishlist')) || [];
    let activeCategory = 'all';
    let searchQuery = '';
    let sortOrder = 'featured';
    let discountRate = 0; // 0.10 for 10%

    // DOM Elements
    const productsContainer = document.getElementById('products-container');
    const globalSearchInput = document.getElementById('global-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const categoryPillsContainer = document.getElementById('category-pills');
    const sortSelect = document.getElementById('sort-select');

    // Cart Elements
    const cartPanel = document.getElementById('cart-panel');
    const cartBackdrop = document.getElementById('cart-backdrop');
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const cartItemsTag = document.getElementById('cart-items-tag');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartDiscount = document.getElementById('cart-discount');
    const discountRow = document.getElementById('discount-row');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const promoInput = document.getElementById('promo-input');
    const promoApplyBtn = document.getElementById('promo-apply-btn');
    const checkoutBtn = document.getElementById('checkout-btn');

    // Wishlist Elements
    const wishlistPanel = document.getElementById('wishlist-panel');
    const wishlistBackdrop = document.getElementById('wishlist-backdrop');
    const wishlistToggleBtn = document.getElementById('wishlist-toggle-btn');
    const closeWishlistBtn = document.getElementById('close-wishlist-btn');
    const wishlistItemsContainer = document.getElementById('wishlist-items-container');
    const wishlistCount = document.getElementById('wishlist-count');
    const wishlistItemsTag = document.getElementById('wishlist-items-tag');

    // Auth & Utilities
    const authButtons = document.getElementById('auth-buttons');
    const toastContainer = document.getElementById('toast-container');

    // Fallback catalog if backend is not yet populated
    const fallbackProducts = [
        {
            _id: 'prod-1',
            name: 'Apex Mechanical Keyboard',
            description: 'Custom mechanical switches, solid CNC aluminum frame, and per-key reactive RGB illumination.',
            price: 129.99,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80'
        },
        {
            _id: 'prod-2',
            name: 'Zenith Wireless Pro Mouse',
            description: 'Precision 26K DPI optical sensor with lag-free ultra-low latency wireless connectivity.',
            price: 79.99,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80'
        },
        {
            _id: 'prod-3',
            name: 'Nebula Spatial ANC Headphones',
            description: 'Studio-grade acoustic drivers with active adaptive noise cancellation and 40-hour playback.',
            price: 299.99,
            category: 'Audio',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
        },
        {
            _id: 'prod-4',
            name: 'Eclipse Smartwatch Titanium',
            description: 'Aerospace-grade titanium chassis, bright LTPO AMOLED display, and biometric tracking.',
            price: 399.99,
            category: 'Wearables',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
        },
        {
            _id: 'prod-5',
            name: 'Titan Ergonomic Mesh Chair',
            description: 'Breathable dual-zone mesh lumbar contouring with multi-directional 4D armrest adjustment.',
            price: 349.99,
            category: 'Furniture',
            image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=600&q=80'
        },
        {
            _id: 'prod-6',
            name: 'Aura Smart Ambient Light Bar',
            description: 'Smart ambient backlight syncing seamlessly with screen colors, smart home, and soundwaves.',
            price: 49.99,
            category: 'Home Decor',
            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80'
        }
    ];

    // ==========================================
    // Initialization
    // ==========================================
    function init() {
        updateNavbarAuth();
        fetchProducts();
        renderCart();
        renderWishlist();
        setupEventListeners();
    }

    // ==========================================
    // Toast Notification System
    // ==========================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // ==========================================
    // Navigation Auth State
    // ==========================================
    function updateNavbarAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (token && user) {
            authButtons.innerHTML = `
                <span style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500;">
                    <i class="fa-solid fa-circle-user" style="color: var(--accent-primary);"></i> ${user.username || 'User'}
                </span>
                <button class="btn btn-outline btn-sm" id="logout-btn">Log Out</button>
            `;
        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="btn btn-outline btn-sm" id="nav-login">Sign In</a>
                <a href="signup.html" class="btn btn-primary btn-sm" id="nav-signup">Sign Up</a>
            `;
        }
    }

    // ==========================================
    // Fetch Products from Backend
    // ==========================================
    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();

            // Support both array response and paginated { products: [...] }
            allProducts = Array.isArray(data) ? data : (data.products || fallbackProducts);
            if (allProducts.length === 0) {
                allProducts = fallbackProducts;
            }
        } catch (err) {
            console.warn('Backend unavailable, utilizing cached demonstration catalog:', err);
            allProducts = fallbackProducts;
        }

        applyFilters();
    }

    // ==========================================
    // Filter & Sort Logic
    // ==========================================
    function applyFilters() {
        let filtered = [...allProducts];

        // 1. Search Query Filter
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
            );
        }

        // 2. Category Filter
        if (activeCategory !== 'all') {
            filtered = filtered.filter(p => 
                p.category && p.category.toLowerCase() === activeCategory.toLowerCase()
            );
        }

        // 3. Sort Order
        if (sortOrder === 'price_asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'price_desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sortOrder === 'name_asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        displayedProducts = filtered;
        renderProducts(displayedProducts);
    }

    // ==========================================
    // Render Products Grid
    // ==========================================
    function renderProducts(items) {
        if (!items || items.length === 0) {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-magnifying-glass fa-2xl" style="margin-bottom: 1rem; color: var(--text-muted);"></i>
                    <h3>No products found</h3>
                    <p style="margin-top: 0.5rem;">Try modifying your search query or switching categories.</p>
                </div>
            `;
            return;
        }

        productsContainer.innerHTML = items.map(p => {
            const isWishlisted = wishlist.some(item => item._id === p._id);
            return `
                <article class="product-card">
                    <div class="product-image-container">
                        <img src="${p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}" alt="${p.name}" class="product-image" loading="lazy">
                        <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${p._id}" aria-label="Save to wishlist">
                            <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
                        </button>
                    </div>
                    <div class="product-details">
                        <span class="product-category-tag">${p.category || 'Luxury'}</span>
                        <h3 class="product-title">${p.name}</h3>
                        <p class="product-description">${p.description || ''}</p>
                        <div class="product-footer">
                            <span class="product-price">$${Number(p.price).toFixed(2)}</span>
                            <button class="btn btn-primary add-to-cart-btn" data-id="${p._id}">
                                <i class="fa-solid fa-plus"></i> Add to Bag
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    // ==========================================
    // Cart Functionality
    // ==========================================
    function renderCart() {
        const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItemsCount;
        cartItemsTag.textContent = `${totalItemsCount} item${totalItemsCount === 1 ? '' : 's'}`;

        const rawSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = rawSubtotal * discountRate;
        const finalTotal = Math.max(0, rawSubtotal - discountAmount);

        cartSubtotal.textContent = `$${rawSubtotal.toFixed(2)}`;
        cartDiscount.textContent = `-$${discountAmount.toFixed(2)}`;
        discountRow.style.display = discountRate > 0 ? 'flex' : 'none';
        cartTotalPrice.textContent = `$${finalTotal.toFixed(2)}`;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-bag-shopping fa-2xl" style="opacity: 0.35; margin-bottom: 1rem;"></i>
                    <p>Your luxury bag is currently empty.</p>
                </div>
            `;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item-card">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="cart-item-thumb">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="cart-item-actions">
                            <div class="qty-stepper">
                                <button class="qty-btn" data-action="dec" data-id="${item._id}">-</button>
                                <span class="qty-value">${item.quantity}</span>
                                <button class="qty-btn" data-action="inc" data-id="${item._id}">+</button>
                            </div>
                            <button class="item-remove-btn" data-id="${item._id}" aria-label="Remove item">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        localStorage.setItem('luxeshop_cart', JSON.stringify(cart));
    }

    function addToCart(product) {
        const existing = cart.find(i => i._id === product._id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                _id: product._id,
                name: product.name,
                price: Number(product.price),
                image: product.image,
                quantity: 1
            });
        }
        renderCart();
        showToast(`Added "${product.name}" to your bag`);
    }

    function updateCartQuantity(id, action) {
        const item = cart.find(i => i._id === id);
        if (!item) return;

        if (action === 'inc') {
            item.quantity += 1;
        } else if (action === 'dec') {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                cart = cart.filter(i => i._id !== id);
            }
        }
        renderCart();
    }

    function removeCartItem(id) {
        const item = cart.find(i => i._id === id);
        cart = cart.filter(i => i._id !== id);
        renderCart();
        if (item) showToast(`Removed "${item.name}" from bag`, 'error');
    }

    // ==========================================
    // Wishlist Functionality
    // ==========================================
    function renderWishlist() {
        wishlistCount.textContent = wishlist.length;
        wishlistItemsTag.textContent = `${wishlist.length} item${wishlist.length === 1 ? '' : 's'}`;

        if (wishlist.length === 0) {
            wishlistItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-heart fa-2xl" style="opacity: 0.35; margin-bottom: 1rem;"></i>
                    <p>No saved products in wishlist.</p>
                </div>
            `;
        } else {
            wishlistItemsContainer.innerHTML = wishlist.map(item => `
                <div class="cart-item-card">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="cart-item-thumb">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
                        <div class="cart-item-actions">
                            <button class="btn btn-primary btn-sm move-to-cart-btn" data-id="${item._id}">
                                <i class="fa-solid fa-bag-shopping"></i> Move to Bag
                            </button>
                            <button class="item-remove-btn remove-wishlist-btn" data-id="${item._id}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        localStorage.setItem('luxeshop_wishlist', JSON.stringify(wishlist));
    }

    function toggleWishlist(product) {
        const index = wishlist.findIndex(i => i._id === product._id);
        if (index > -1) {
            wishlist.splice(index, 1);
            showToast(`Removed from wishlist`, 'error');
        } else {
            wishlist.push({
                _id: product._id,
                name: product.name,
                price: Number(product.price),
                image: product.image
            });
            showToast(`Saved "${product.name}" to wishlist`);
        }
        renderWishlist();
        renderProducts(displayedProducts);
    }

    // ==========================================
    // Event Listeners Setup
    // ==========================================
    function setupEventListeners() {
        // Search Input with Debounce
        let searchTimeout;
        globalSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchQuery = e.target.value;
            searchClearBtn.style.display = searchQuery ? 'block' : 'none';
            searchTimeout = setTimeout(applyFilters, 250);
        });

        searchClearBtn.addEventListener('click', () => {
            globalSearchInput.value = '';
            searchQuery = '';
            searchClearBtn.style.display = 'none';
            applyFilters();
        });

        // Category Pills
        categoryPillsContainer.addEventListener('click', (e) => {
            const pill = e.target.closest('.category-pill');
            if (!pill) return;

            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.dataset.category;
            applyFilters();
        });

        // Sort Selection
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            applyFilters();
        });

        // Drawer Toggles
        const toggleCartDrawer = () => {
            cartPanel.classList.toggle('open');
            cartBackdrop.classList.toggle('open');
        };
        cartToggleBtn.addEventListener('click', toggleCartDrawer);
        closeCartBtn.addEventListener('click', toggleCartDrawer);
        cartBackdrop.addEventListener('click', toggleCartDrawer);

        const toggleWishlistDrawer = () => {
            wishlistPanel.classList.toggle('open');
            wishlistBackdrop.classList.toggle('open');
        };
        wishlistToggleBtn.addEventListener('click', toggleWishlistDrawer);
        closeWishlistBtn.addEventListener('click', toggleWishlistDrawer);
        wishlistBackdrop.addEventListener('click', toggleWishlistDrawer);

        // Product Grid Delegated Events
        productsContainer.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-to-cart-btn');
            if (addBtn) {
                const id = addBtn.dataset.id;
                const prod = allProducts.find(p => p._id === id);
                if (prod) addToCart(prod);
                return;
            }

            const wishBtn = e.target.closest('.card-wishlist-btn');
            if (wishBtn) {
                const id = wishBtn.dataset.id;
                const prod = allProducts.find(p => p._id === id);
                if (prod) toggleWishlist(prod);
            }
        });

        // Cart Items Delegated Events
        cartItemsContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.item-remove-btn');
            if (removeBtn) {
                removeCartItem(removeBtn.dataset.id);
                return;
            }

            const qtyBtn = e.target.closest('.qty-btn');
            if (qtyBtn) {
                updateCartQuantity(qtyBtn.dataset.id, qtyBtn.dataset.action);
            }
        });

        // Wishlist Items Delegated Events
        wishlistItemsContainer.addEventListener('click', (e) => {
            const moveBtn = e.target.closest('.move-to-cart-btn');
            if (moveBtn) {
                const id = moveBtn.dataset.id;
                const prod = wishlist.find(p => p._id === id);
                if (prod) {
                    addToCart(prod);
                    wishlist = wishlist.filter(p => p._id !== id);
                    renderWishlist();
                    renderProducts(displayedProducts);
                }
                return;
            }

            const removeBtn = e.target.closest('.remove-wishlist-btn');
            if (removeBtn) {
                const id = removeBtn.dataset.id;
                wishlist = wishlist.filter(p => p._id !== id);
                renderWishlist();
                renderProducts(displayedProducts);
            }
        });

        // Promo Code
        promoApplyBtn.addEventListener('click', () => {
            const code = promoInput.value.trim().toUpperCase();
            if (code === 'CLOUD10') {
                discountRate = 0.10;
                showToast('Promo code applied! 10% discount added.', 'success');
                renderCart();
            } else if (code === '') {
                showToast('Please enter a promo code', 'error');
            } else {
                showToast('Invalid promo code. Try "CLOUD10"', 'error');
            }
        });

        // Checkout Button
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('Your shopping bag is empty!', 'error');
                return;
            }
            showToast('Order confirmed! Processing on Kubernetes cluster...', 'success');
            cart = [];
            discountRate = 0;
            promoInput.value = '';
            renderCart();
            toggleCartDrawer();
        });

        // Logout
        authButtons.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showToast('Signed out successfully');
                updateNavbarAuth();
            }
        });
    }

    // Run Init
    init();
});
