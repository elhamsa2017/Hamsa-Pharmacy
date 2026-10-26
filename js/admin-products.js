const AdminProducts = {
  products: [],
  imagesBySku: {},
  currentImageSku: null,

  async load() {
    const state = document.getElementById('products-state');
    const table = document.getElementById('products-table');
    try {
      Admin.showState(state, 'جاري تحميل المنتجات...');
      const result = await Admin.query('products', 'id,sku,name,price,stock,points,split_parts,is_offer,old_price,description,image,category', { order: 'name' });
      this.products = result.data || [];
      await this.loadProductImages();
      this.render();
      state.hidden = true;
      table.hidden = false;
    } catch (error) {
      Admin.showState(state, `تعذر تحميل المنتجات: ${error.message || 'تحقق من RLS'}`, true);
      table.hidden = true;
    }
  },

  async loadProductImages() {
    this.imagesBySku = {};
    try {
      const result = await Admin.query(
        'product_images',
        'id,sku,image_url,is_primary,sort_order',
        { order: 'sort_order' }
      );

      (result.data || []).forEach(image => {
        const sku = String(image.sku || '').trim();
        if (!sku) return;
        if (!this.imagesBySku[sku]) this.imagesBySku[sku] = [];
        this.imagesBySku[sku].push(image);
      });
    } catch (error) {
      console.warn('Product images could not be loaded:', error);
    }
  },

  getImages(product) {
    return this.imagesBySku[String(product.sku || '').trim()] || [];
  },

  getPrimaryImage(product) {
    const images = this.getImages(product);
    return images
      .filter(image => Boolean(image.is_primary))
      .sort((first, second) => Number(first.sort_order || 0) - Number(second.sort_order || 0))[0]
      || images[0]
      || null;
  },

  filtered() {
    const search = document.getElementById('product-search').value.trim().toLowerCase();
    const filter = document.getElementById('product-filter').value;
    return this.products.filter(product => {
      const matchesSearch = !search || String(product.name || '').toLowerCase().includes(search) || String(product.sku || '').toLowerCase().includes(search);
      const offer = Boolean(product.is_offer) && Number(product.old_price) > Number(product.price);
      const matchesFilter = filter === 'all' || (filter === 'available' && Number(product.stock) > 0) || (filter === 'unavailable' && Number(product.stock) <= 0) || (filter === 'offers' && offer) || (filter === 'regular' && !offer);
      return matchesSearch && matchesFilter;
    });
  },

  render() {
    const body = document.querySelector('#products-table tbody');
    const rows = this.filtered();
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="11"><div class="admin-state">لا توجد منتجات مطابقة</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(product => {
      const offer = Boolean(product.is_offer) && Number(product.old_price) > Number(product.price);
      const primaryImage = this.getPrimaryImage(product);
      const imageUrl = primaryImage?.image_url || product.image;
      const image = imageUrl ? `<img class="admin-thumb" src="${Admin.escape(imageUrl)}" alt="${Admin.escape(product.name)}">` : '-';
      const imageCount = this.getImages(product).length;
      return `<tr><td>${image}</td><td>${Admin.escape(product.name)}</td><td>${Admin.escape(product.sku || '-')}</td><td>${Admin.formatMoney(product.price)}</td><td>${product.old_price ? Admin.formatMoney(product.old_price) : '-'}</td><td><input class="admin-input stock-input" data-id="${Admin.escape(product.id)}" value="${Number(product.stock) || 0}" type="number" min="0" step="1" aria-label="مخزون ${Admin.escape(product.name)}"></td><td>${Number(product.points) || 0}</td><td>${Admin.escape(product.category || '-')}</td><td><span class="admin-badge ${offer ? 'warning' : 'success'}">${offer ? 'عرض' : 'عادي'}</span></td><td>${imageCount}</td><td><button class="admin-button secondary edit-product" data-id="${Admin.escape(product.id)}" type="button">تعديل</button><button class="admin-button secondary manage-images" data-sku="${Admin.escape(product.sku || '')}" type="button">الصور</button></td></tr>`;
    }).join('');
    body.querySelectorAll('.stock-input').forEach(input => input.addEventListener('change', event => this.saveStock(event.target)));
    body.querySelectorAll('.edit-product').forEach(button => button.addEventListener('click', () => this.openEdit(button.dataset.id)));
    body.querySelectorAll('.manage-images').forEach(button => button.addEventListener('click', () => this.openImages(button.dataset.sku)));
  },

  openImages(sku) {
    if (!sku) {
      Admin.toast('لا يمكن إدارة الصور بدون SKU', true);
      return;
    }

    this.currentImageSku = sku;
    document.getElementById('image-sku').textContent = sku;
    this.renderImageManager();
    document.getElementById('image-modal').hidden = false;
  },

  renderImageManager() {
    const list = document.getElementById('product-images-list');
    if (!list) return;

    const images = this.imagesBySku[this.currentImageSku] || [];
    list.innerHTML = images.length
      ? images.map(image => `
          <div class="product-image-admin-row">
            <img class="admin-thumb" src="${Admin.escape(image.image_url)}" alt="صورة المنتج">
            <input class="admin-input image-sort-input" data-image-id="${Admin.escape(image.id)}" type="number" min="0" value="${Number(image.sort_order) || 0}" aria-label="ترتيب الصورة">
            <span class="admin-badge ${image.is_primary ? 'success' : ''}">${image.is_primary ? 'أساسية' : 'إضافية'}</span>
            <button class="admin-button secondary set-primary-image" data-image-id="${Admin.escape(image.id)}" type="button">${image.is_primary ? 'الصورة الأساسية' : 'تعيين كأساسية'}</button>
            <button class="admin-button danger delete-product-image" data-image-id="${Admin.escape(image.id)}" type="button">حذف</button>
          </div>
        `).join('')
      : '<div class="admin-state">لا توجد صور إضافية لهذا المنتج. سيتم استخدام products.image.</div>';

    list.querySelectorAll('.image-sort-input').forEach(input => {
      input.addEventListener('change', event => this.updateImageSort(event.target));
    });
    list.querySelectorAll('.set-primary-image').forEach(button => {
      button.addEventListener('click', () => this.setPrimaryImage(button.dataset.imageId));
    });
    list.querySelectorAll('.delete-product-image').forEach(button => {
      button.addEventListener('click', () => this.deleteImage(button.dataset.imageId));
    });
  },

  async addImage(event) {
    event.preventDefault();
    const urlInput = document.getElementById('new-image-url');
    const imageUrl = urlInput.value.trim();
    if (!this.currentImageSku || !imageUrl) return;

    const images = this.imagesBySku[this.currentImageSku] || [];
    const { error } = await Admin.sb.from('product_images').insert({
      sku: this.currentImageSku,
      image_url: imageUrl,
      is_primary: images.length === 0,
      sort_order: images.reduce((max, image) => Math.max(max, Number(image.sort_order) || 0), -1) + 1
    });

    if (error) {
      Admin.toast(`فشل إضافة الصورة: ${error.message || 'تحقق من RLS'}`, true);
      return;
    }

    urlInput.value = '';
    await this.loadProductImages();
    this.renderImageManager();
    this.render();
  },

  async setPrimaryImage(imageId) {
    const images = this.imagesBySku[this.currentImageSku] || [];
    try {
      for (const image of images) {
        await Admin.update('product_images', image.id, {
          is_primary: String(image.id) === String(imageId)
        });
      }
    } catch (error) {
      Admin.toast(`فشل تحديد الصورة الأساسية: ${error.message || 'تحقق من RLS'}`, true);
      return;
    }
    await this.loadProductImages();
    this.renderImageManager();
    this.render();
  },

  async updateImageSort(input) {
    const sortOrder = Number(input.value);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) return;
    try {
      await Admin.update('product_images', input.dataset.imageId, { sort_order: sortOrder });
    } catch (error) {
      Admin.toast(`فشل تحديث ترتيب الصورة: ${error.message || 'تحقق من RLS'}`, true);
      return;
    }
    await this.loadProductImages();
    this.renderImageManager();
    this.render();
  },

  async deleteImage(imageId) {
    if (!window.confirm('هل تريد حذف هذه الصورة؟')) return;
    const { error } = await Admin.sb.from('product_images').delete().eq('id', imageId);
    if (error) {
      Admin.toast(`فشل حذف الصورة: ${error.message || 'تحقق من RLS'}`, true);
      return;
    }
    await this.loadProductImages();
    this.renderImageManager();
    this.render();
  },

  async saveStock(input) {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 0) { Admin.toast('المخزون يجب أن يكون رقمًا صحيحًا غير سالب', true); return; }
    try {
      await Admin.update('products', input.dataset.id, { stock: value });
      const product = this.products.find(item => String(item.id) === String(input.dataset.id));
      if (product) product.stock = value;
      Admin.toast('تم تحديث المخزون');
      this.render();
    } catch (error) { Admin.toast(`فشل تحديث المخزون: ${error.message || 'تحقق من RLS'}`, true); }
  },

  openEdit(id) {
    const product = this.products.find(item => String(item.id) === String(id));
    if (!product) return;
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name || '';
    document.getElementById('edit-sku').value = product.sku || '';
    document.getElementById('edit-price').value = product.price ?? 0;
    document.getElementById('edit-old-price').value = product.old_price ?? 0;
    document.getElementById('edit-stock').value = product.stock ?? 0;
    document.getElementById('edit-points').value = product.points ?? 0;
    document.getElementById('edit-category').value = product.category || '';
    document.getElementById('edit-image').value = product.image || '';
    document.getElementById('edit-description').value = product.description || '';
    document.getElementById('edit-split-parts').value = product.split_parts ?? 0;
    document.getElementById('edit-is-offer').checked = Boolean(product.is_offer);
    document.getElementById('product-modal').hidden = false;
  },

  async save(event) {
    event.preventDefault();
    const id = document.getElementById('edit-id').value;
    const values = { name: document.getElementById('edit-name').value.trim(), sku: document.getElementById('edit-sku').value.trim() || null, price: Number(document.getElementById('edit-price').value), old_price: Number(document.getElementById('edit-old-price').value) || 0, stock: Number(document.getElementById('edit-stock').value), points: Number(document.getElementById('edit-points').value) || 0, category: document.getElementById('edit-category').value.trim() || null, image: document.getElementById('edit-image').value.trim() || null, description: document.getElementById('edit-description').value.trim() || null, split_parts: Number(document.getElementById('edit-split-parts').value) || 0, is_offer: document.getElementById('edit-is-offer').checked };
    if (!values.name || values.price < 0 || values.stock < 0) { Admin.toast('راجع بيانات المنتج', true); return; }
    try { await Admin.update('products', id, values); Admin.toast('تم حفظ المنتج'); document.getElementById('product-modal').hidden = true; await this.load(); } catch (error) { Admin.toast(`فشل حفظ المنتج: ${error.message || 'تحقق من RLS'}`, true); }
  }
};
AdminProducts.importExcel = async function (file) {
  const status = document.getElementById('import-excel-status');
  const button = document.getElementById('import-excel-button');

  const showStatus = (message, isError = false) => {
    status.hidden = false;
    status.textContent = message;
    status.style.color = isError ? '#b91c1c' : 'inherit';
  };

  if (!file) return;

  if (!window.XLSX) {
    showStatus('تعذر تحميل مكتبة Excel. أعيدي تحميل الصفحة.', true);
    return;
  }

  button.disabled = true;

  try {
    showStatus('جاري قراءة ملف Excel...');

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) throw new Error('الملف لا يحتوي على ورقة بيانات.');

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false
    });

    if (!rows.length) throw new Error('ملف Excel فارغ.');

    const normalize = value =>
      String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');

    const headers = Object.keys(rows[0]);
    const findHeader = names =>
      headers.find(header => names.includes(normalize(header)));

    const skuHeader = findHeader(['sku']);
    const priceHeader = findHeader(['salesprice', 'price']);
    const stockHeader = findHeader(['packs', 'stock', 'quantity']);
    const splitHeader = findHeader(['splitparts']);

    if (!skuHeader || !priceHeader || !stockHeader || !splitHeader) {
      throw new Error(
        'تأكدي من وجود الأعمدة: SKU وSales Price وPacks وsplit_parts.'
      );
    }

    const seen = new Set();

    const products = rows.map((row, index) => {
      const sku = String(row[skuHeader] ?? '').trim();
      const priceText = String(row[priceHeader] ?? '').trim();
      const stockText = String(row[stockHeader] ?? '').trim();
      const splitText = String(row[splitHeader] ?? '').trim();

      if (!sku || !priceText || !stockText || !splitText) {
        throw new Error(`بيانات ناقصة في الصف ${index + 2}.`);
      }

      if (seen.has(sku)) {
        throw new Error(`كود SKU مكرر في الصف ${index + 2}: ${sku}`);
      }
      seen.add(sku);

      const price = Number(priceText);
      const stock = Number(stockText);
      const split_parts = Number(splitText);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`السعر غير صحيح في الصف ${index + 2}.`);
      }

      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(`المخزون غير صحيح في الصف ${index + 2}.`);
      }

      if (!Number.isInteger(split_parts) || split_parts < 1) {
        throw new Error(`split_parts غير صحيح في الصف ${index + 2}.`);
      }

      return { sku, price, stock, split_parts };
    });

    if (products.length > 4000) {
      throw new Error('الحد الأقصى 4000 منتج في الملف الواحد.');
    }

    if (!window.confirm(
      `سيتم تحديث السعر والمخزون وsplit_parts لـ ${products.length} منتج. هل تريدين المتابعة؟`
    )) {
      showStatus('تم إلغاء الاستيراد.');
      return;
    }

    const { data: sessionData, error: sessionError } =
      await Admin.sb.auth.getSession();

    if (sessionError) throw sessionError;

    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('انتهت جلسة الدخول. سجّلي الدخول مرة أخرى.');
    }

    showStatus('جاري إرسال البيانات إلى Supabase...');

    const { data: result, error } = await Admin.sb.functions.invoke(
      'import-products',
      {
        body: { products },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (error) {
      let details = error.message || 'تعذر الاتصال بالدالة.';
      try {
        const response = error.context;
        if (response && typeof response.json === 'function') {
          const body = await response.json();
          if (body.error) details = body.error;
        }
      } catch (_) {}
      throw new Error(details);
    }

    if (result?.missingSkus?.length) {
      throw new Error(
        `لم يتم التحديث. أكواد SKU غير الموجودة: ${result.missingSkus.join(', ')}`
      );
    }

    if (result?.failedSkus?.length) {
      showStatus(
        `تم تحديث ${result.updated} منتج، وفشل تحديث: ${result.failedSkus.join(', ')}`,
        true
      );
      return;
    }

    if (result?.updated !== products.length) {
      throw new Error(result?.message || 'لم يتم تأكيد تحديث كل المنتجات.');
    }

    showStatus(`تم تحديث ${result.updated} منتج بنجاح.`);
    await this.load();

  } catch (error) {
    showStatus(`فشل الاستيراد: ${error.message || 'خطأ غير معروف'}`, true);
  } finally {
    button.disabled = false;
  }
};
document.addEventListener('DOMContentLoaded', () => {
  AdminProducts.load();
  document.getElementById('product-search').addEventListener('input', () => AdminProducts.render());
  document.getElementById('product-filter').addEventListener('change', () => AdminProducts.render());
  document.getElementById('reload-products').addEventListener('click', () => AdminProducts.load());
  document.getElementById('close-product-modal').addEventListener('click', () => { document.getElementById('product-modal').hidden = true; });
  document.getElementById('product-form').addEventListener('submit', event => AdminProducts.save(event));
  document.getElementById('close-image-modal').addEventListener('click', () => { document.getElementById('image-modal').hidden = true; });
  document.getElementById('add-image-form').addEventListener('submit', event => AdminProducts.addImage(event));
  document.getElementById('import-excel-button').addEventListener('click', () => {
  document.getElementById('import-excel-file').click(); });
  document.getElementById('import-excel-file').addEventListener('change', async event => {
  await AdminProducts.importExcel(event.target.files[0]);
  event.target.value = '';
  });
});
