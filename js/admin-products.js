const AdminProducts = {
  products: [],

  async load() {
    const state = document.getElementById('products-state');
    const table = document.getElementById('products-table');
    try {
      Admin.showState(state, 'جاري تحميل المنتجات...');
      const result = await Admin.query('products', 'id,sku,name,price,stock,points,split_parts,is_offer,old_price,description,image,category', { order: 'name' });
      this.products = result.data || [];
      this.render();
      state.hidden = true;
      table.hidden = false;
    } catch (error) {
      Admin.showState(state, `تعذر تحميل المنتجات: ${error.message || 'تحقق من RLS'}`, true);
      table.hidden = true;
    }
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
      body.innerHTML = '<tr><td colspan="10"><div class="admin-state">لا توجد منتجات مطابقة</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(product => {
      const offer = Boolean(product.is_offer) && Number(product.old_price) > Number(product.price);
      const image = product.image ? `<img class="admin-thumb" src="${Admin.escape(product.image)}" alt="${Admin.escape(product.name)}">` : '-';
      return `<tr><td>${image}</td><td>${Admin.escape(product.name)}</td><td>${Admin.escape(product.sku || '-')}</td><td>${Admin.formatMoney(product.price)}</td><td>${product.old_price ? Admin.formatMoney(product.old_price) : '-'}</td><td><input class="admin-input stock-input" data-id="${Admin.escape(product.id)}" value="${Number(product.stock) || 0}" type="number" min="0" step="1" aria-label="مخزون ${Admin.escape(product.name)}"></td><td>${Number(product.points) || 0}</td><td>${Admin.escape(product.category || '-')}</td><td><span class="admin-badge ${offer ? 'warning' : 'success'}">${offer ? 'عرض' : 'عادي'}</span></td><td><button class="admin-button secondary edit-product" data-id="${Admin.escape(product.id)}" type="button">تعديل</button></td></tr>`;
    }).join('');
    body.querySelectorAll('.stock-input').forEach(input => input.addEventListener('change', event => this.saveStock(event.target)));
    body.querySelectorAll('.edit-product').forEach(button => button.addEventListener('click', () => this.openEdit(button.dataset.id)));
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

document.addEventListener('DOMContentLoaded', () => {
  AdminProducts.load();
  document.getElementById('product-search').addEventListener('input', () => AdminProducts.render());
  document.getElementById('product-filter').addEventListener('change', () => AdminProducts.render());
  document.getElementById('reload-products').addEventListener('click', () => AdminProducts.load());
  document.getElementById('close-product-modal').addEventListener('click', () => { document.getElementById('product-modal').hidden = true; });
  document.getElementById('product-form').addEventListener('submit', event => AdminProducts.save(event));
});
