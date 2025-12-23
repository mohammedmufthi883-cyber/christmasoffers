/**
 * Global State & Constants
 */
const PRODUCTS_KEY = 'aff_products_v1';
const ADS_KEY = 'aff_ads_v1';
const AUTH_KEY = 'aff_auth_session';

/**
 * Data Management (LocalStorage)
 */
function getProducts() {
    const data = localStorage.getItem(PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function getAds() {
    const defaultAds = {
        slot1: { type: 'text', content: 'Premium Ad Spot 1' },
        slot2: { type: 'text', content: 'Premium Ad Spot 2' },
        slot3: { type: 'text', content: 'Premium Ad Spot 3' }
    };
    const data = localStorage.getItem(ADS_KEY);
    return data ? JSON.parse(data) : defaultAds;
}

function saveAds(ads) {
    localStorage.setItem(ADS_KEY, JSON.stringify(ads));
}

/**
 * Rendering Logic
 */
function renderProducts() {
    const container = document.getElementById('product-container');
    if (!container) return;

    const products = getProducts();
    container.innerHTML = '';

    if (products.length === 0) {
        const msg = document.getElementById('no-products-msg');
        if (msg) msg.style.display = 'block';
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        // Use coverImage if available, else fallback to image (thumbnail)
        const bgImage = p.coverImage || p.image || '';

        card.innerHTML = `
            <div class="product-image" style="background-image: url('${bgImage}'); background-size: cover; background-position: center;"></div>
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(p.title)}</h3>
                <p class="product-desc">${escapeHtml(p.description)}</p>
                <div class="product-price">${escapeHtml(p.price)}</div>
                <a href="${p.link}" target="_blank" class="btn-check-now">Check Now</a>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAds() {
    const ads = getAds();
    // Helper to render a single slot
    const renderSlot = (id, adData) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.innerHTML = '';
        if (adData.type === 'image' && adData.content) {
            const img = document.createElement('img');
            img.src = adData.content;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            el.appendChild(img);
        } else {
            el.innerText = adData.content || 'Ad Space';
        }
    };

    renderSlot('ad-slot-1', ads.slot1);
    renderSlot('ad-slot-2', ads.slot2);
    renderSlot('ad-slot-3', ads.slot3);
}

/**
 * Utility
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Admin Panel Logic
 */
function initAdmin() {
    if (!sessionStorage.getItem(AUTH_KEY)) {
        window.location.href = 'login.html';
        return;
    }

    renderAdminProductList();
    loadAdminAdsInputs();
    bindAdInputEvents(); // New helper to toggle file inputs

    // Add/Edit Product Form
    const addForm = document.getElementById('add-product-form');
    // Cancel Edit Button
    document.getElementById('cancel-edit-btn')?.addEventListener('click', resetForm);

    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idInput = document.getElementById('p-id');
            const title = document.getElementById('p-title').value;
            const desc = document.getElementById('p-desc').value;
            const price = document.getElementById('p-price').value;
            const link = document.getElementById('p-link').value;
            const fileInput = document.getElementById('p-image');
            const coverInput = document.getElementById('p-cover-image');

            const isEdit = idInput.value !== '';
            let products = getProducts();
            let currentProduct = isEdit ? products.find(p => p.id == idInput.value) : {};

            // Handle Image Uploads (Retain existing if not changed during edit)
            let imageBase64 = currentProduct.image || '';
            if (fileInput.files && fileInput.files[0]) {
                imageBase64 = await convertFileToBase64(fileInput.files[0]);
            }

            let coverBase64 = currentProduct.coverImage || '';
            if (coverInput.files && coverInput.files[0]) {
                coverBase64 = await convertFileToBase64(coverInput.files[0]);
            }

            const productData = {
                id: isEdit ? parseInt(idInput.value) : Date.now(),
                title,
                description: desc,
                price,
                link,
                image: imageBase64,
                coverImage: coverBase64
            };

            if (isEdit) {
                const index = products.findIndex(p => p.id == idInput.value);
                if (index !== -1) products[index] = productData;
            } else {
                products.push(productData);
            }

            saveProducts(products);

            resetForm();
            alert(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
            renderAdminProductList();
        });
    }

    // Save Ads
    document.getElementById('save-ads-btn')?.addEventListener('click', async () => {
        const processSlot = async (prefix) => {
            const type = document.getElementById(`${prefix}-type`).value;
            const textContent = document.getElementById(`${prefix}-content`).value;
            const fileInput = document.getElementById(`${prefix}-file`);

            let content = textContent;

            if (type === 'image' && fileInput.files[0]) {
                content = await convertFileToBase64(fileInput.files[0]);
            } else if (type === 'image' && !fileInput.files[0]) {
                // If it was already an image, try to preserve it? 
                // For simplicity, we might just keep what's in 'content' if it looks like a url/base64,
                // BUT here we only have the text input value. 
                // Retaining old ad image without re-upload is tricky unless we store it in a data attribute or check state.
                // Let's check current ads state.
                const currentAds = getAds();
                // Map prefix (ad1, ad2) to slot key
                const slotKey = prefix === 'ad1' ? 'slot1' : (prefix === 'ad2' ? 'slot2' : 'slot3');
                if (currentAds[slotKey].type === 'image') {
                    content = currentAds[slotKey].content;
                }
            }

            return { type, content };
        };

        const ads = {
            slot1: await processSlot('ad1'),
            slot2: await processSlot('ad2'),
            slot3: await processSlot('ad3')
        };
        saveAds(ads);
        alert('Ads updated!');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        sessionStorage.removeItem(AUTH_KEY);
        window.location.href = 'index.html';
    });
}

function resetForm() {
    const form = document.getElementById('add-product-form');
    form.reset();
    document.getElementById('p-id').value = '';
    document.getElementById('save-product-btn').innerText = 'Add Product';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.querySelector('#add-product-form .section-title').innerText = 'Add New Product'; // This selector might fail if title is outside form, it is outside form in HTML
    document.querySelector('.admin-container .section-title').innerText = 'Add / Edit Product';
}

function renderAdminProductList() {
    const listBody = document.getElementById('admin-product-list');
    if (!listBody) return;

    const products = getProducts();
    listBody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image || ''}" alt="img"></td>
            <td>${escapeHtml(p.title)}</td>
            <td>${escapeHtml(p.price)}</td>
            <td>
                <button onclick="window.editProduct(${p.id})" class="btn-check-now" style="width: auto; padding: 5px 10px; margin-right: 5px;">Edit</button>
                <button onclick="window.deleteProduct(${p.id})" class="btn-danger">Delete</button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

function loadAdminAdsInputs() {
    const ads = getAds();
    const loadSlot = (prefix, data) => {
        const typeEl = document.getElementById(`${prefix}-type`);
        const contentEl = document.getElementById(`${prefix}-content`);
        const fileEl = document.getElementById(`${prefix}-file`);

        if (typeEl) typeEl.value = data.type;
        if (contentEl && data.type === 'text') contentEl.value = data.content;

        // Trigger visibility update
        toggleAdInput(prefix, data.type);
    };

    loadSlot('ad1', ads.slot1);
    loadSlot('ad2', ads.slot2);
    loadSlot('ad3', ads.slot3);
}

function bindAdInputEvents() {
    ['ad1', 'ad2', 'ad3'].forEach(prefix => {
        document.getElementById(`${prefix}-type`)?.addEventListener('change', (e) => {
            toggleAdInput(prefix, e.target.value);
        });
    });
}

function toggleAdInput(prefix, type) {
    const textInput = document.getElementById(`${prefix}-content`);
    const fileInput = document.getElementById(`${prefix}-file`);

    if (type === 'image') {
        textInput.style.display = 'none';
        fileInput.style.display = 'block';
    } else {
        textInput.style.display = 'block';
        fileInput.style.display = 'none';
    }
}

// Global scope for onclick
window.deleteProduct = function (id) {
    if (!confirm('Are you sure?')) return;
    let products = getProducts();
    products = products.filter(p => p.id !== id);
    saveProducts(products);
    renderAdminProductList();
};

window.editProduct = function (id) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('p-id').value = product.id;
    document.getElementById('p-title').value = product.title;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-link').value = product.link;
    document.getElementById('p-desc').value = product.description;

    // Note: Can't set files programmatically for security, user has to re-upload if they want to change image.
    // If they leave empty, we keep existing logic in submit handler.

    document.getElementById('save-product-btn').innerText = 'Update Product';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';

    // Scroll to form
    document.getElementById('add-product-form').scrollIntoView({ behavior: 'smooth' });
};

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    // Determine if we are on index or admin
    if (document.getElementById('product-container')) {
        renderProducts();
        renderAds();
    } else if (document.getElementById('admin-panel')) {
        initAdmin();
    }
});
