// =========================================================
// Hamsa Pharmacy - Main App
// Supabase → Website
// =========================================================

const App = {

  products: [],
  categories: [],
  cart: [],
  imagesBySku: {},

  async init() {
    console.log('🚀 Hamsa Pharmacy starting...');

    this.updateYear();
    this.loadCart();
    this.bindEvents();

    window.addEventListener('hamsaLanguageChanged', () => {
      this.renderCategories();
      const categoryId =
        new URLSearchParams(window.location.search).get('category_id');
      const category = this.categories.find(item =>
        String(item.id) === String(categoryId)
      );
      const products = categoryId
        ? this.getProductsForCategory(categoryId, category)
        : this.products;
      this.renderProducts(products);
      if (typeof Cart !== 'undefined') Cart.render();
    });

    await this.loadCategories();
    await this.loadProducts();
    await this.loadProductImages();

    this.renderCategories();

    const categoryId =
      new URLSearchParams(window.location.search).get('category_id');

    if (categoryId) {
      const category = this.categories.find(item =>
        String(item.id) === String(categoryId)
      );

      const categoryProducts = this.getProductsForCategory(categoryId, category);

      const title = document.getElementById('products-title');
      if (title) {
        title.textContent = category?.name || this.translate('products', 'المنتجات');
      }

      this.renderProducts(categoryProducts);
    } else {
      this.renderProducts();
    }

    console.log('✅ Hamsa Pharmacy ready');
  },


  // =======================================================
  // SUPABASE
  // =======================================================

  getSupabase() {
    if (
      typeof supabaseClient === 'undefined' ||
      !supabaseClient
    ) {
      console.error('❌ Supabase client not found');
      return null;
    }

    return supabaseClient;
  },


  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  async loadCategories() {

    const sb = this.getSupabase();

    if (!sb) {
      this.showError(
        'categories-container',
        this.translate('databaseUnavailable', 'تعذر الاتصال بقاعدة البيانات')
      );
      return;
    }

    try {

      const { data, error } = await sb
        .from('categories')
        .select('*')
        .order('sort_order', {
          ascending: true
        });

      if (error) {
        throw error;
      }

      this.categories = Array.isArray(data)
        ? data
        : [];

      console.log(
        '✅ Categories loaded:',
        this.categories.length
      );

    } catch (error) {

      console.error(
        '❌ Categories loading error:',
        error
      );

      this.showError(
        'categories-container',
        this.translate('categoriesError', 'حدث خطأ أثناء تحميل التصنيفات')
      );
    }
  },


  // =======================================================
  // LOAD PRODUCTS
  // =======================================================

  async loadProducts() {
  const sb = this.getSupabase();

  if (!sb) {
    this.showError(
      'products-container',
      this.translate('databaseUnavailable', 'تعذر الاتصال بقاعدة البيانات')
    );
    return;
  }

  try {
    const pageSize = 1000;
    let from = 0;
    let allProducts = [];

    while (true) {
      const { data, error } = await sb
        .from('products')
        .select(`
          id,
          sku,
          name,
          price,
          stock,
          points,
          split_parts,
          is_offer,
          old_price,
          description,
          image,
          category
        `)
        .order('name', {
          ascending: true
        })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const products = Array.isArray(data) ? data : [];

      allProducts.push(...products);

      console.log(
        `📦 Products batch loaded: ${products.length} | Total: ${allProducts.length}`
      );

      if (products.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    this.products = allProducts;

    console.log(
      '✅ All products loaded:',
      this.products.length
    );

    console.table(this.products);

  } catch (error) {

    console.error(
      '❌ Products loading error:',
      error
    );

    this.showError(
      'products-container',
      this.translate(
        'productsError',
        'حدث خطأ أثناء تحميل المنتجات'
      )
    );
  }
},

  async loadProductImages() {
    this.imagesBySku = {};

    const sb = this.getSupabase();
    if (!sb) return;

    try {
      const { data, error } = await sb
        .from('product_images')
        .select('sku,image_url,is_primary,sort_order')
        .not('sku', 'is', null)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      (Array.isArray(data) ? data : []).forEach(image => {
        const sku = String(image.sku || '').trim();
        const imageUrl = String(image.image_url || '').trim();
        if (!sku || !imageUrl) return;

        if (!this.imagesBySku[sku]) {
          this.imagesBySku[sku] = [];
        }

        this.imagesBySku[sku].push(image);
      });

      this.products = this.products.map(product => {
        const images = this.imagesBySku[String(product.sku || '').trim()] || [];
        const primaryImage = images
          .filter(image => Boolean(image.is_primary))
          .sort((first, second) => Number(first.sort_order || 0) - Number(second.sort_order || 0))[0]
          || images[0];

        return {
          ...product,
          images,
          image: primaryImage?.image_url || product.image || ''
        };
      });
    } catch (error) {
      console.warn('Product images unavailable; using products.image fallback.', error);
    }
  },


  // =======================================================
  // RENDER CATEGORIES
  // =======================================================

  renderCategories() {

    const container =
      document.getElementById(
        'categories-container'
      );

    if (!container) return;

    if (this.categories.length === 0) {

      container.innerHTML = `
        <div class="empty-state">
          ${this.translate('noCategories', 'لا توجد تصنيفات حاليًا')}
        </div>
      `;

      return;
    }

    container.innerHTML =
      this.categories.map(category => {

        return `
          <a
            href="category.html?category_id=${encodeURIComponent(category.id)}"
            class="category-card"
            data-category-id="${this.escape(
              category.id
            )}"
          >

            <div class="category-icon">
              ${this.escape(
                category.icon || '📦'
              )}
            </div>

            <div class="category-name">
              ${this.escape(
                category.name || category.id
              )}
            </div>

          </a>
        `;

      }).join('');
  },


  // =======================================================
  // RENDER PRODUCTS
  // =======================================================
  getProductCartQuantity(productId) {
    const cart =
      typeof Cart !== 'undefined' && Array.isArray(Cart.cart)
        ? Cart.cart
        : this.cart;

    const item = cart.find(entry =>
      String(entry.id) === String(productId)
    );

    return Number(item?.quantity) || 0;
  },

  renderProductActions(product) {
    const stock = Number(product.stock) || 0;
    const quantity = this.getProductCartQuantity(product.id);
    const productId = this.escape(product.id);

    if (stock <= 0) {
      return `<span class="product-unavailable-label">${this.translate('unavailable', 'غير متوفر')}</span>`;
    }

    if (quantity > 0) {
      return `
        <div class="product-quantity-control" aria-label="${this.translate('adjustQuantity', 'تعديل كمية المنتج')}">
          <button type="button" class="quantity-button" data-cart-decrease="${productId}" aria-label="${this.translate('decrease', 'تقليل الكمية')}">−</button>
          <span class="product-quantity-value">${quantity}</span>
          <button type="button" class="quantity-button" data-cart-increase="${productId}" aria-label="${this.translate('increase', 'زيادة الكمية')}">+</button>
        </div>
      `;
    }

    return `
      <button type="button" class="add-cart-btn" data-add-to-cart="${productId}" aria-label="${this.translate('addToCart', 'إضافة للسلة')} ${this.escape(product.name || 'المنتج')}">
        <span aria-hidden="true">🛒</span>
        <span>أضف للسلة</span>
      </button>
    `;
  },

  refreshProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
      const product = this.products.find(item =>
        String(item.id) === String(card.dataset.productId)
      );
      const actions = card.querySelector('.product-card-actions');

      if (product && actions) {
        actions.innerHTML = this.renderProductActions(product);
      }
    });
  },

renderProducts(products = this.products) {

  const container =
    document.getElementById('products-container');

  if (!container) return;

  if (!Array.isArray(products) || products.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
          ${this.translate('noProducts', 'لا توجد منتجات حاليًا')}
      </div>
    `;

    return;
  }

  container.innerHTML = products.map(product => {

    const stock =
      Number(product.stock) || 0;

    const price =
      Number(product.price) || 0;

    const oldPrice =
      Number(product.old_price) || 0;

    const image =
      product.image || '';

    const isOffer =
      Boolean(product.is_offer) &&
      oldPrice > price;

    const discount =
      isOffer
        ? Math.round(
            ((oldPrice - price) / oldPrice) * 100
          )
        : 0;

    return `
      <article
        class="product-card"
        data-product-id="${this.escape(product.id)}"
      >

        <div class="product-image-box">

          <span class="product-sku product-sku-top">
            id: ${this.escape(product.sku || product.id || '-')}
          </span>

          ${
            isOffer
              ? `
                <span class="product-badge">
                  -${discount}%
                </span>
              `
              : ''
          }

          ${
            image
              ? `
                <img
                  class="product-image"
                  src="${this.escape(image)}"
                  alt="${this.escape(product.name || 'منتج')}"
                  loading="lazy"
                >
              `
              : `
                <div class="product-image product-placeholder">
                  💊
                </div>
              `
          }

        </div>


        <div class="product-card-body">

          <h3 class="product-name">
            ${this.escape(product.name || 'منتج')}
          </h3>

          <!-- السعر -->
          <div class="product-price-row">

            <span class="product-price">
              ${price.toFixed(2)}
              <small>ج.م</small>
            </span>

            ${
              isOffer
                ? `
                  <span class="product-old-price">
                    ${oldPrice.toFixed(2)} ج.م
                  </span>
                `
                : ''
            }

          </div>


          <div
            class="product-stock ${
              stock > 0
                ? 'stock-available'
                : 'stock-unavailable'
            }"
          >
            ${
              stock > 0
                ? `متوفر (${stock})`
                : 'غير متوفر'
            }
          </div>


          <div class="product-card-actions">
            ${this.renderProductActions(product)}
          </div>

        </div>

      </article>
    `;

  }).join('');
},


  // =======================================================
  // EVENTS
  // =======================================================

  bindEvents() {

    document.addEventListener(
      'click',
      event => {

        if (event.target.closest('[data-add-to-cart], [data-cart-increase], [data-cart-decrease]')) {
          return;
        }

        const productCard =
          event.target.closest(
            '[data-product-id]'
          );

        if (productCard) {

          const productId =
            productCard.dataset.productId;

          console.log(
            'Product selected:',
            productId
          );

          return;
        }

      }
    );


    const searchButton =
      document.getElementById(
        'search-button'
      );

    if (searchButton) {

      searchButton.addEventListener(
        'click',
        () => {

          const section =
            document.getElementById(
              'search-section'
            );

          if (!section) return;

          section.hidden =
            !section.hidden;

          if (!section.hidden) {

            document
              .getElementById(
                'search-input'
              )
              ?.focus();
          }
        }
      );
    }


    const searchInput =
      document.getElementById(
        'search-input'
      );

    if (searchInput) {

      searchInput.addEventListener(
        'input',
        event => {

          this.searchProducts(
            event.target.value
          );

        }
      );
    }


   document
  .getElementById('cart-button')
  ?.addEventListener(
    'click',
    () => {

      if (
        typeof Cart !== 'undefined'
      ) {

        Cart.render();
        Cart.open();

      } else {

        console.error(
          '❌ Cart system not loaded'
        );

      }

    }
  );

    document
      .getElementById('account-button')
      ?.addEventListener(
        'click',
        () => {
          if (typeof Auth !== 'undefined') {
            Auth.goToCustomerPage();
          }
        }
      );
  },


  // =======================================================
  // CATEGORY FILTER
  // =======================================================

  filterByCategory(categoryId) {

    const category =
      this.categories.find(
        item =>
          String(item.id) ===
          String(categoryId)
      );

        const products = this.getProductsForCategory(categoryId, category);

    const title =
      document.getElementById(
        'products-title'
      );

    if (title) {

      title.textContent =
        category?.name ||
        'المنتجات';
    }

    this.renderProducts(products);

    document
      .querySelector('.products-section')
      ?.scrollIntoView({
        behavior: 'smooth'
      });
  },

  getProductsForCategory(categoryId, category = null) {
    const requestedId = String(categoryId ?? '').trim().toLowerCase();
    const requestedName = String(category?.name ?? '').trim().toLowerCase();

    return this.products.filter(product => {
      const productCategory = String(product.category ?? '').trim().toLowerCase();
      return productCategory === requestedId
        || (requestedName && productCategory === requestedName)
        || (requestedName && productCategory.replace(/\s+/g, ' ') === requestedName.replace(/\s+/g, ' '));
    });
  },


  // =======================================================
  // SEARCH
  // =======================================================

  searchProducts(value) {

    const query =
      String(value || '')
        .trim()
        .toLowerCase();

    if (!query) {

      this.renderProducts(
        this.products
      );

      return;
    }

    const filtered =
      this.products.filter(
        product => {

          const name =
            String(
              product.name || ''
            ).toLowerCase();

          const sku =
            String(
              product.sku || ''
            ).toLowerCase();

          return (
            name.includes(query) ||
            sku.includes(query)
          );
        }
      );

    this.renderProducts(filtered);
  },


  // =======================================================
  // CART
  // =======================================================

  loadCart() {

    try {

      const saved =
        localStorage.getItem(
          'hamsa_cart'
        );

      this.cart =
        saved
          ? JSON.parse(saved)
          : [];

      if (!Array.isArray(this.cart)) {
        this.cart = [];
      }

    } catch {

      this.cart = [];
    }

    this.updateCartCount();
  },


  updateCartCount() {

    const count =
      document.getElementById(
        'cart-count'
      );

    if (!count) return;

    count.textContent =
      this.cart.reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0),
        0
      );
  },


  // =======================================================
  // HELPERS
  // =======================================================

  updateYear() {

    const year =
      document.getElementById(
        'current-year'
      );

    if (year) {
      year.textContent =
        new Date().getFullYear();
    }
  },

  translate(key, fallback) {
    return typeof I18n !== 'undefined' ? I18n.t(key) : fallback;
  },


  showError(id, message) {

    const container =
      document.getElementById(id);

    if (!container) return;

    container.innerHTML = `
      <div class="error-state">
        ${this.escape(message)}
      </div>
    `;
  },


  escape(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};


// =========================================================
// START APP
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    App.init();
  }
);
