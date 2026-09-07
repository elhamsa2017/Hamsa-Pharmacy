document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-product-form').addEventListener('submit', async event => {
    event.preventDefault();
    const values = { name: document.getElementById('add-name').value.trim(), sku: document.getElementById('add-sku').value.trim() || null, price: Number(document.getElementById('add-price').value), old_price: Number(document.getElementById('add-old-price').value) || 0, stock: Number(document.getElementById('add-stock').value) || 0, points: Number(document.getElementById('add-points').value) || 0, category: document.getElementById('add-category').value.trim() || null, image: document.getElementById('add-image').value.trim() || null, description: document.getElementById('add-description').value.trim() || null, split_parts: Number(document.getElementById('add-split-parts').value) || 0, is_offer: document.getElementById('add-is-offer').checked };
    if (!values.name || values.price < 0 || values.stock < 0) { Admin.toast('راجع بيانات المنتج', true); return; }
    try { await Admin.sb.from('products').insert(values); Admin.toast('تمت إضافة المنتج'); event.target.reset(); } catch (error) { Admin.toast(`فشل إضافة المنتج: ${error.message || 'تحقق من RLS'}`, true); }
  });
});
