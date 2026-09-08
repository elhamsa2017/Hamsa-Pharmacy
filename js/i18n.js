const I18n = {
  key: 'hamsa_language',
  language: localStorage.getItem('hamsa_language') || 'ar',
  translations: {
    ar: {
      language: 'اللغة',
      arabic: 'العربية',
      english: 'English',
      search: 'البحث',
      cart: 'السلة',
      account: 'حسابي',
      insurance: 'التأمين',
      searchPlaceholder: 'ابحث عن اسم المنتج أو الكود...',
      welcome: 'أهلًا بكم في صيدليات الهمسة',
      priority: 'صحتك وراحتك أولويتنا',
      categories: 'التصنيفات',
      products: 'المنتجات',
      loadingCategories: 'جاري تحميل التصنيفات...',
      loadingProducts: 'جاري تحميل المنتجات...',
      noCategories: 'لا توجد تصنيفات حاليًا',
      noProducts: 'لا توجد منتجات حاليًا',
      databaseUnavailable: 'تعذر الاتصال بقاعدة البيانات',
      categoriesError: 'حدث خطأ أثناء تحميل التصنيفات',
      productsError: 'حدث خطأ أثناء تحميل المنتجات',
      unavailable: 'غير متوفر',
      available: 'متوفر',
      adjustQuantity: 'تعديل كمية المنتج',
      decrease: 'تقليل الكمية',
      increase: 'زيادة الكمية',
      offer: 'عرض',
      remove: 'حذف',
      currency: 'ج.م',
      addToCart: 'إضافة للسلة',
      cartTitle: 'سلة المشتريات',
      closeCart: 'إغلاق السلة',
      totalItems: 'إجمالي الأصناف',
      productCount: 'عدد المنتجات',
      promoDiscount: 'خصم الكود',
      pointsDiscount: 'خصم النقاط',
      delivery: 'التوصيل',
      grandTotal: 'الإجمالي النهائي',
      continueOrder: 'متابعة الطلب',
      emptyCart: 'السلة فارغة حاليًا',
      emptyCartHint: 'أضيفي المنتجات التي تريدين شراءها',
      loadingProducts: 'جاري تحميل المنتجات، برجاء المحاولة مرة أخرى',
      outOfStock: 'هذا المنتج غير متوفر حاليًا',
      maxProduct: 'لا يمكن إضافة أكثر من {stock} قطعة من هذا المنتج',
      maxQuantity: 'لا يمكن إضافة أكثر من {stock} قطعة',
      cartEmptyAlert: 'السلة فارغة'
    },
    en: {
      language: 'Language',
      arabic: 'العربية',
      english: 'English',
      search: 'Search',
      cart: 'Cart',
      account: 'Account',
      insurance: 'Insurance',
      searchPlaceholder: 'Search by product name or code...',
      welcome: 'Welcome to Hamsa Pharmacies',
      priority: 'Your health and comfort are our priority',
      categories: 'Categories',
      products: 'Products',
      loadingCategories: 'Loading categories...',
      loadingProducts: 'Loading products...',
      noCategories: 'No categories available',
      unavailable: 'Unavailable',
      available: 'Available',
      adjustQuantity: 'Adjust product quantity',
      addToCart: 'Add to cart',
      cartTitle: 'Shopping cart',
      closeCart: 'Close cart',
      totalItems: 'Subtotal',
      productCount: 'Items',
      promoDiscount: 'Promo discount',
      pointsDiscount: 'Points discount',
      delivery: 'Delivery',
      grandTotal: 'Grand total',
      continueOrder: 'Continue to checkout',
      emptyCart: 'Your cart is empty',
      emptyCartHint: 'Add products you would like to buy',
      loadingProducts: 'Products are loading, please try again',
      outOfStock: 'This product is currently unavailable',
      maxProduct: 'You cannot add more than {stock} units of this product',
      maxQuantity: 'You cannot add more than {stock} units',
      noProducts: 'No products available',
      databaseUnavailable: 'Unable to connect to the database',
      categoriesError: 'An error occurred while loading categories',
      productsError: 'An error occurred while loading products',
      decrease: 'Decrease quantity',
      increase: 'Increase quantity',
      offer: 'Offer',
      remove: 'Remove',
      currency: 'EGP',
      cartEmptyAlert: 'Your cart is empty'
    }
  },

  t(key) {
    return this.translations[this.language]?.[key]
      || this.translations.ar[key]
      || key;
  },

  apply() {
    document.documentElement.lang = this.language;
    document.documentElement.dir = this.language === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = this.t(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = this.t(element.dataset.i18nPlaceholder);
    });

    const selector = document.getElementById('language-select');
    if (selector) selector.value = this.language;
  },

  init() {
    const selector = document.getElementById('language-select');
    selector?.addEventListener('change', event => {
      this.language = event.target.value === 'en' ? 'en' : 'ar';
      localStorage.setItem(this.key, this.language);
      this.apply();
      window.dispatchEvent(new CustomEvent('hamsaLanguageChanged'));
    });

    this.apply();
  }
};

document.addEventListener('DOMContentLoaded', () => I18n.init());
