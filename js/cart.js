// =========================================================
// Hamsa Pharmacy - Cart System
// Step 1: Basic Cart
// =========================================================

const Cart = {

  translate(key, fallback, values = {}) {
    let text = typeof I18n !== 'undefined' ? I18n.t(key) : fallback;
    Object.entries(values).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, value);
    });
    return text;
  },

  // =======================================================
  // INIT
  // =======================================================

  init() {

    console.log('🛒 Cart system starting...');

    this.createCartUI();
    this.bindEvents();
    this.load();

    console.log('✅ Cart system ready');
  },


  // =======================================================
  // SYNC WITH APP
  // =======================================================

  load() {
    try {
      const saved = localStorage.getItem('hamsa_cart');
      const parsed = saved ? JSON.parse(saved) : [];

      this.cart = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.cart = [];
    }

    if (typeof App !== 'undefined') {
      App.cart = this.cart;
    }

    this.updateCount();
  },


  // =======================================================
  // SAVE
  // =======================================================

  save() {

    try {

      localStorage.setItem(
        'hamsa_cart',
        JSON.stringify(this.cart)
      );

      if (
        typeof App !== 'undefined'
      ) {
        App.cart = this.cart;
      }

      this.updateCount();

      if (typeof App !== 'undefined') {
        App.refreshProductCards?.();
      }

    } catch (error) {

      console.error(
        '❌ Cart save error:',
        error
      );
    }
  },


  // =======================================================
  // ADD PRODUCT
  // =======================================================

  add(productId) {

    if (
      typeof App === 'undefined' ||
      !Array.isArray(App.products)
    ) {
      alert(this.translate('loadingProducts', 'جاري تحميل المنتجات، برجاء المحاولة مرة أخرى'));
      return;
    }

    const product =
      App.products.find(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {

      console.error(
        '❌ Product not found:',
        productId
      );

      return;
    }


    const stock =
      Number(product.stock) || 0;

    if (stock <= 0) {

      alert(this.translate('outOfStock', 'هذا المنتج غير متوفر حاليًا'));
      return;
    }


    let cart =
      [...this.cart];


    const existingIndex =
      cart.findIndex(
        item =>
          String(item.id) ===
          String(product.id)
      );


    // =====================================================
    // PRODUCT ALREADY IN CART
    // =====================================================

    if (existingIndex !== -1) {

      const currentQuantity =
        Number(
          cart[existingIndex].quantity
        ) || 0;

      if (currentQuantity >= stock) {

        alert(this.translate('maxProduct', `لا يمكن إضافة أكثر من ${stock} قطعة من هذا المنتج`, { stock }));

        return;
      }

      cart[existingIndex].quantity =
        currentQuantity + 1;

    }


    // =====================================================
    // NEW PRODUCT
    // =====================================================

    else {

      cart.push({

        id: product.id,

        sku:
          product.sku || null,

        name:
          product.name || 'منتج',

        price:
          Number(product.price) || 0,

        old_price:
          Number(product.old_price) || 0,

        stock:
          stock,

        points:
          Number(product.points) || 0,

        is_offer:
          Boolean(product.is_offer),

        image:
          product.image || '',

        quantity: 1

      });

    }


    this.cart = cart;

    this.save();

    this.render();

    if (typeof App !== 'undefined') {
      App.refreshProductCards?.();
    }

    this.open();

    console.log(
      '🛒 Product added:',
      product.name
    );
  },


  // =======================================================
  // INCREASE
  // =======================================================

  increase(productId) {

    const cart =
      [...this.cart];

    const index =
      cart.findIndex(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (index === -1) return;


    const currentQuantity =
      Number(
        cart[index].quantity
      ) || 0;

    const stock =
      Number(
        cart[index].stock
      ) || 0;


    if (
      stock > 0 &&
      currentQuantity >= stock
    ) {

      alert(this.translate('maxQuantity', `لا يمكن إضافة أكثر من ${stock} قطعة`, { stock }));

      return;
    }


    cart[index].quantity =
      currentQuantity + 1;


    this.cart = cart;

    this.save();

    this.render();

    if (typeof App !== 'undefined') {
      App.refreshProductCards?.();
    }
  },


  // =======================================================
  // DECREASE
  // =======================================================

  decrease(productId) {

    const cart =
      [...this.cart];

    const index =
      cart.findIndex(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (index === -1) return;


    const quantity =
      Number(
        cart[index].quantity
      ) || 0;


    if (quantity <= 1) {

      this.remove(productId);

      return;
    }


    cart[index].quantity =
      quantity - 1;


    this.cart = cart;

    this.save();

    this.render();

    if (typeof App !== 'undefined') {
      App.refreshProductCards?.();
    }
  },


  // =======================================================
  // REMOVE
  // =======================================================

  remove(productId) {

    this.cart =
      this.cart.filter(
        item =>
          String(item.id) !==
          String(productId)
      );

    this.save();

    this.render();

    if (typeof App !== 'undefined') {
      App.refreshProductCards?.();
    }
  },


  // =======================================================
  // TOTAL ITEMS
  // =======================================================

  getItemsTotal() {

    return this.cart.reduce(
      (total, item) => {

        const price =
          Number(item.price) || 0;

        const quantity =
          Number(item.quantity) || 0;

        return total +
          (price * quantity);

      },
      0
    );
  },


  // =======================================================
  // TOTAL QUANTITY
  // =======================================================

  getQuantity() {

    return this.cart.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 0),
      0
    );
  },


  // =======================================================
  // UPDATE COUNT
  // =======================================================

  updateCount() {

    const count =
      document.getElementById(
        'cart-count'
      );

    if (!count) return;

    count.textContent =
      this.getQuantity();
  },


  // =======================================================
  // CREATE CART UI
  // =======================================================

  createCartUI() {

    if (
      document.getElementById(
        'cart-modal'
      )
    ) {
      return;
    }


    const modal =
      document.createElement('div');

    modal.id =
      'cart-modal';

    modal.hidden = true;


    modal.innerHTML = `

      <div
        class="cart-overlay"
        data-cart-close
      ></div>

      <div
        class="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >

        <div class="cart-header">

          <h2 id="cart-title">
            🛒 ${this.translate('cartTitle', 'سلة المشتريات')}
          </h2>

          <button
            type="button"
            class="cart-close"
            data-cart-close
            aria-label="${this.translate('closeCart', 'إغلاق السلة')}"
          >
            ✕
          </button>

        </div>


        <div
          id="cart-items"
          class="cart-items"
        ></div>


        <div
          class="cart-summary"
        >

          <div class="cart-summary-row">

            <span>
              ${this.translate('totalItems', 'إجمالي الأصناف')}
            </span>

            <strong
              id="cart-subtotal"
            >
              0.00 ${this.translate('currency', 'ج.م')}
            </strong>

          </div>

          <div class="cart-summary-row">
            <span>${this.translate('productCount', 'عدد المنتجات')}</span>
            <strong id="cart-quantity">0</strong>
          </div>

          <div class="cart-summary-row cart-summary-muted">
            <span>${this.translate('promoDiscount', 'خصم الكود')}</span>
            <strong id="cart-promo-discount">0.00 ${this.translate('currency', 'ج.م')}</strong>
          </div>

          <div class="cart-summary-row cart-summary-muted">
            <span>${this.translate('pointsDiscount', 'خصم النقاط')}</span>
            <strong id="cart-loyalty-discount">0.00 ${this.translate('currency', 'ج.م')}</strong>
          </div>

          <div class="cart-summary-row cart-summary-muted">
            <span>${this.translate('delivery', 'التوصيل')}</span>
            <strong id="cart-delivery-fee">0.00 ${this.translate('currency', 'ج.م')}</strong>
          </div>

          <div class="cart-summary-row cart-summary-total">
            <span>${this.translate('grandTotal', 'الإجمالي النهائي')}</span>
            <strong id="cart-grand-total">0.00 ${this.translate('currency', 'ج.م')}</strong>
          </div>


          <button
            type="button"
            id="cart-checkout-button"
            class="cart-checkout-button"
            disabled
          >
            ${this.translate('continueOrder', 'متابعة الطلب')}
          </button>

        </div>

      </div>
    `;


    document.body.appendChild(modal);
  },


  // =======================================================
  // EVENTS
  // =======================================================

  bindEvents() {


    // -----------------------------------------------------
    // ADD TO CART
    // -----------------------------------------------------

    document.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            '[data-add-to-cart]'
          );

        if (!button) return;


        const productId =
          button.dataset.addToCart;


        this.add(productId);
      }
    );


    // -----------------------------------------------------
    // CART BUTTON
    // -----------------------------------------------------

    document
      .getElementById('cart-button')
      ?.addEventListener(
        'click',
        () => {

          this.render();

          this.open();
        }
      );

// -----------------------------------------------------
// CHECKOUT BUTTON
// -----------------------------------------------------

document
  .getElementById('cart-checkout-button')
  ?.addEventListener(
    'click',
    () => {

      if (!this.cart || this.cart.length === 0) {
        alert(this.translate('cartEmptyAlert', 'السلة فارغة'));
        return;
      }

      window.location.href = 'checkout.html';

    }
  );
    // -----------------------------------------------------
    // CART INTERNAL BUTTONS
    // -----------------------------------------------------

    document.addEventListener(
      'click',
      event => {


        const increaseButton =
          event.target.closest(
            '[data-cart-increase]'
          );

        if (increaseButton) {

          this.increase(
            increaseButton.dataset.cartIncrease
          );

          return;
        }


        const decreaseButton =
          event.target.closest(
            '[data-cart-decrease]'
          );

        if (decreaseButton) {

          this.decrease(
            decreaseButton.dataset.cartDecrease
          );

          return;
        }


        const removeButton =
          event.target.closest(
            '[data-cart-remove]'
          );

        if (removeButton) {

          this.remove(
            removeButton.dataset.cartRemove
          );

          return;
        }


        const closeButton =
          event.target.closest(
            '[data-cart-close]'
          );

        if (closeButton) {

          this.close();

          return;
        }
      }
    );
  },


  // =======================================================
  // RENDER
  // =======================================================

  render() {

    const container =
      document.getElementById(
        'cart-items'
      );

    const subtotalElement =
      document.getElementById(
        'cart-subtotal'
      );

    const quantityElement =
      document.getElementById('cart-quantity');

    const checkoutButton =
      document.getElementById('cart-checkout-button');

    const grandTotalElement =
      document.getElementById('cart-grand-total');


    if (!container) return;


    if (
      this.cart.length === 0
    ) {

      container.innerHTML = `

        <div class="cart-empty">
          <div class="cart-empty-icon">
            🛒
          </div>

          <p>
            ${this.translate('emptyCart', 'السلة فارغة حاليًا')}
          </p>

          <small>
            ${this.translate('emptyCartHint', 'أضيفي المنتجات التي تريدين شراءها')}
          </small>

        </div>
      `;


      if (subtotalElement) {

        subtotalElement.textContent =
          `0.00 ${this.translate('currency', 'ج.م')}`;
      }

          if (quantityElement) quantityElement.textContent = '0';
          if (grandTotalElement) grandTotalElement.textContent = `0.00 ${this.translate('currency', 'ج.م')}`;
          if (checkoutButton) checkoutButton.disabled = true;

      return;
    }


    container.innerHTML =
      this.cart.map(item => {


        const price =
          Number(item.price) || 0;

        const quantity =
          Number(item.quantity) || 0;

        const total =
          price * quantity;


        const image =
          item.image || '';


        return `

          <div
            class="cart-item"
            data-cart-item="${this.escape(item.id)}"
          >

            <div class="cart-item-image">

              ${
                image

                  ? `

                    <img
                      src="${this.escape(image)}"
                      alt="${this.escape(item.name)}"
                    >

                  `

                  : `

                    <div
                      class="cart-item-placeholder"
                    >
                      💊
                    </div>

                  `
              }

            </div>


            <div class="cart-item-info">

              <h3>
                ${this.escape(item.name)}
              </h3>


              ${
                item.is_offer
                  ? `
                    <span class="cart-offer-badge">
                      ${this.translate('offer', 'عرض')}
                    </span>
                  `
                  : ''
              }


              <div class="cart-item-price">

                ${price.toFixed(2)}
                ${this.translate('currency', 'ج.م')}

              </div>


              <div class="cart-quantity">

                <button
                  type="button"
                  data-cart-decrease="${this.escape(item.id)}"
                  aria-label="${this.translate('decrease', 'تقليل الكمية')}"
                >
                  −
                </button>


                <span>
                  ${quantity}
                </span>

                <button
                  type="button"
                  data-cart-increase="${this.escape(item.id)}"
                  aria-label="${this.translate('increase', 'زيادة الكمية')}"
                >
                  +
                </button>

              </div>

            </div>


            <div class="cart-item-side">

              <strong>
                ${total.toFixed(2)}
                ${this.translate('currency', 'ج.م')}
              </strong>


              <button
                type="button"
                class="cart-remove"
                data-cart-remove="${this.escape(item.id)}"
              >
                ${this.translate('remove', 'حذف')}
              </button>

            </div>

          </div>

        `;

      }).join('');


    if (subtotalElement) {

      subtotalElement.textContent =
        `${this.getItemsTotal().toFixed(2)} ${this.translate('currency', 'ج.م')}`;
    }

    if (grandTotalElement) {
      grandTotalElement.textContent =
        `${this.getItemsTotal().toFixed(2)} ${this.translate('currency', 'ج.م')}`;
    }

    if (quantityElement) {
      quantityElement.textContent = this.getQuantity();
    }

    if (checkoutButton) {
      checkoutButton.disabled = false;
    }
  },


  // =======================================================
  // OPEN
  // =======================================================

  open() {

    const modal =
      document.getElementById(
        'cart-modal'
      );

    if (!modal) return;

    modal.hidden = false;

    document.body.classList.add(
      'cart-open'
    );
  },


  // =======================================================
  // CLOSE
  // =======================================================

  close() {

    const modal =
      document.getElementById(
        'cart-modal'
      );

    if (!modal) return;

    modal.hidden = true;

    document.body.classList.remove(
      'cart-open'
    );
  },


  // =======================================================
  // ESCAPE
  // =======================================================

  escape(value) {

    return String(value ?? '')
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }
};


// =========================================================
// START CART
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    Cart.init();

  }
);
