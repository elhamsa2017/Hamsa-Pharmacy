// =========================================================
// Hamsa Pharmacy - Main App
// Supabase → Website
// =========================================================

const App = {

  products: [],
  categories: [],
  cart: [],

  async init() {
    console.log('🚀 Hamsa Pharmacy starting...');

    this.updateYear();
    this.loadCart();
    this.bindEvents();

    await this.loadCategories();
    await this.loadProducts();

    this.renderCategories();
    this.renderProducts();

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
        'تعذر الاتصال بقاعدة البيانات'
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
        'حدث خطأ أثناء تحميل التصنيفات'
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
        'تعذر الاتصال بقاعدة البيانات'
      );
      return;
    }

    try {

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
          category,
          created_at,
          updated_at
        `)
        .order('name', {
          ascending: true
        });

      if (error) {
        throw error;
      }

      this.products = Array.isArray(data)
        ? data
        : [];

      console.log(
        '✅ Products loaded:',
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
        'حدث خطأ أثناء تحميل المنتجات'
      );
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
          لا توجد تصنيفات حاليًا
        </div>
      `;

      return;
    }

    container.innerHTML =
      this.categories.map(category => {

        return `
          <button
            type="button"
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

          </button>
        `;

      }).join('');
  },


  // =======================================================
  // RENDER PRODUCTS
  // =======================================================

  renderProducts(products = this.products) {

    const container =
      document.getElementById(
        'products-container'
      );

    if (!container) return;

    if (!Array.isArray(products) || products.length === 0) {

      container.innerHTML = `
        <div class="empty-state">
          لا توجد منتجات حاليًا
        </div>
      `;

      return;
    }

    container.innerHTML =
      products.map(product => {

        const stock =
          Number(product.stock) || 0;

        const price =
          Number(product.price) || 0;

        const oldPrice =
          Number(product.old_price) || 0;

        const image =
          product.image || '';

        return `
          <article
            class="product-card"
            data-product-id="${this.escape(
              product.id
            )}"
          >

            <div class="product-image-wrapper">

              ${
                image
                  ? `
                    <img
                      class="product-image"
                      src="${this.escape(image)}"
                      alt="${this.escape(
                        product.name
                      )}"
                      loading="lazy"
                    >
                  `
                  : `
                    <div class="product-image">
                      💊
                    </div>
                  `
              }

            </div>

            <div class="product-info">

              <h3 class="product-name">
                ${this.escape(
                  product.name
                )}
              </h3>

              <div class="product-sku">
                SKU:
                ${this.escape(
                  product.sku || '-'
                )}
              </div>

              <div>

                <span class="product-price">
                  ${price.toFixed(2)}
                </span>

                ${
                  product.is_offer && oldPrice > price
                    ? `
                      <span class="product-old-price">
                        ${oldPrice.toFixed(2)}
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

        const categoryButton =
          event.target.closest(
            '[data-category-id]'
          );

        if (categoryButton) {

          const categoryId =
            categoryButton.dataset.categoryId;

          this.filterByCategory(
            categoryId
          );

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
          console.log(
            'Cart clicked'
          );
        }
      );


    document
      .getElementById('account-button')
      ?.addEventListener(
        'click',
        () => {
          console.log(
            'Account clicked'
          );
        }
      );
  },


  // =======================================================
  // CATEGORY FILTER
  // =======================================================

  filterByCategory(categoryId) {

    const products =
      this.products.filter(
        product =>
          String(product.category) ===
          String(categoryId)
      );

    const category =
      this.categories.find(
        item =>
          String(item.id) ===
          String(categoryId)
      );

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