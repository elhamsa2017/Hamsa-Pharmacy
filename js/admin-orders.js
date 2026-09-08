const AdminOrders = {
  orders: [],
  statuses: ['new', 'processing', 'ready', 'delivered', 'completed', 'rejected', 'cancelled'],
  async load() {
    const state = document.getElementById('orders-state');
    const table = document.getElementById('orders-table');
    try {
     const result = await Admin.query('orders','id,customer_name,customer_phone,customer_address,items,subtotal,total,delivery_fee,payment_method,notes,status,created_at',
  {
    order: 'created_at',
    ascending: false
  }
);
      this.orders = result.data || [];
      this.render();
      state.hidden = true;
      table.hidden = false;
    } catch (error) { Admin.showState(state, `تعذر تحميل الطلبات: ${error.message || 'تحقق من RLS'}`, true); table.hidden = true; }
  },
  render() {
    const body = document.querySelector('#orders-table tbody');
    if (!this.orders.length) { body.innerHTML = '<tr><td colspan="9"><div class="admin-state">لا توجد طلبات حاليًا</div></td></tr>'; return; }
    body.innerHTML = this.orders.map(order => `<tr><td>${Admin.escape(order.id)}</td><td>${Admin.escape(order.customer_name || '-')}</td><td>${Admin.escape(JSON.stringify(order.items || []))}</td><td>${Admin.formatMoney(order.total ?? order.subtotal)}</td><td>${Admin.formatMoney(order.delivery_fee)}</td><td>${Admin.escape(order.payment_method || '-')}</td><td><select class="admin-select order-status" data-id="${Admin.escape(order.id)}">${this.statuses.map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td><td>${Admin.formatDate(order.created_at)}</td><td><button type="button" class="admin-button secondary order-details" data-id="${Admin.escape(order.id)}">عرض</button></td></tr>`).join('');
    body.querySelectorAll('.order-status').forEach(select => select.addEventListener('change', event => this.updateStatus(event.target)));
    body.querySelectorAll('.order-details').forEach(button => button.addEventListener('click', () => this.details(button.dataset.id)));
  },
  async updateStatus(select) {
    try { await Admin.update('orders', select.dataset.id, { status: select.value }); Admin.toast('تم تحديث حالة الطلب'); } catch (error) { Admin.toast(`فشل تحديث الحالة: ${error.message || 'تحقق من RLS'}`, true); }
  },
  details(id) {
    const order = this.orders.find(item => String(item.id) === String(id));
    if (!order) return;
    document.getElementById('order-details').textContent = JSON.stringify(order, null, 2);
    document.getElementById('order-modal').hidden = false;
  }
};
document.addEventListener('DOMContentLoaded', () => { AdminOrders.load(); document.getElementById('reload-orders').addEventListener('click', () => AdminOrders.load()); document.getElementById('close-order-modal').addEventListener('click', () => { document.getElementById('order-modal').hidden = true; }); });
