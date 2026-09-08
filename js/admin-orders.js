const AdminOrders = {
orders: [],

statuses: [
'new',
'processing',
'ready',
'delivered',
'completed',
'rejected',
'cancelled'
],

async load() {
const state = document.getElementById('orders-state');
const table = document.getElementById('orders-table');


try {
  const result = await Admin.query(
    'orders',
    'id,customer_name,customer_phone,customer_address,items,subtotal,total,delivery_fee,payment_method,notes,status,created_at',
    {
      order: 'created_at',
      ascending: false
    }
  );

  this.orders = result.data || [];

  this.render();

  state.hidden = true;
  table.hidden = false;

} catch (error) {
  Admin.showState(
    state,
    `تعذر تحميل الطلبات: ${error.message || 'تحقق من RLS'}`,
    true
  );

  table.hidden = true;
}


},

render() {
const body = document.querySelector('#orders-table tbody');


if (!this.orders.length) {
  body.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="admin-state">
          لا توجد طلبات حاليًا
        </div>
      </td>
    </tr>
  `;
  return;
}

body.innerHTML = this.orders.map(order => `
  <tr>
    <td>${Admin.escape(order.id)}</td>

    <td>
      ${Admin.escape(order.customer_name || '-')}
    </td>

    <td>
      ${this.getItemsSummary(order.items)}
    </td>

    <td>
      ${Admin.formatMoney(order.total ?? order.subtotal)}
    </td>

    <td>
      ${Admin.formatMoney(order.delivery_fee)}
    </td>

    <td>
      ${Admin.escape(this.getPaymentName(order.payment_method))}
    </td>

    <td>
      <select
        class="admin-select order-status"
        data-id="${Admin.escape(order.id)}"
      >
        ${this.statuses.map(status => `
          <option
            value="${status}"
            ${status === order.status ? 'selected' : ''}
          >
            ${this.getStatusName(status)}
          </option>
        `).join('')}
      </select>
    </td>

    <td>
      ${Admin.formatDate(order.created_at)}
    </td>

    <td>
      <button
        type="button"
        class="admin-button secondary order-details"
        data-id="${Admin.escape(order.id)}"
      >
        عرض
      </button>
    </td>
  </tr>
`).join('');

body.querySelectorAll('.order-status').forEach(select => {
  select.addEventListener('change', event => {
    this.updateStatus(event.target);
  });
});

body.querySelectorAll('.order-details').forEach(button => {
  button.addEventListener('click', () => {
    this.details(button.dataset.id);
  });
});


},

getItemsSummary(items) {
if (!Array.isArray(items) || !items.length) {
return '-';
}


return items.map(item => {
  const name = item.name || 'منتج';
  const quantity = Number(item.quantity || 1);

  return `${Admin.escape(name)} × ${quantity}`;
}).join('<br>');


},

getPaymentName(payment) {
const names = {
cash: 'الدفع عند الاستلام',
card: 'بطاقة',
online: 'دفع إلكتروني'
};


return names[payment] || payment || '-';


},

getStatusName(status) {
const names = {
new: 'جديد',
processing: 'جاري التجهيز',
ready: 'جاهز للتوصيل',
delivered: 'تم التوصيل',
completed: 'مكتمل',
rejected: 'مرفوض',
cancelled: 'ملغي'
};


return names[status] || status || '-';


},

async updateStatus(select) {
const orderId = select.dataset.id;
const newStatus = select.value;


try {
  await Admin.update(
    'orders',
    orderId,
    {
      status: newStatus
    }
  );

  const order = this.orders.find(
    item => String(item.id) === String(orderId)
  );

  if (order) {
    order.status = newStatus;
  }

  Admin.toast('تم تحديث حالة الطلب');

} catch (error) {
  Admin.toast(
    `فشل تحديث الحالة: ${error.message || 'تحقق من RLS'}`,
    true
  );

  await this.load();
}

},

details(id) {
const order = this.orders.find(
item => String(item.id) === String(id)
);


if (!order) return;

const items = Array.isArray(order.items)
  ? order.items
  : [];

const notes = order.notes || '';

const detailsHTML = `
  <div class="order-details-content">

    <div class="order-detail-section">
      <h3>📋 بيانات الطلب</h3>

      <div class="order-detail-grid">

        <div>
          <strong>رقم الطلب</strong>
          <span>${Admin.escape(order.id || '-')}</span>
        </div>

        <div>
          <strong>التاريخ</strong>
          <span>${Admin.formatDate(order.created_at)}</span>
        </div>

        <div>
          <strong>الحالة</strong>
          <span>${Admin.escape(this.getStatusName(order.status))}</span>
        </div>

        <div>
          <strong>طريقة الدفع</strong>
          <span>${Admin.escape(this.getPaymentName(order.payment_method))}</span>
        </div>

      </div>
    </div>

    <div class="order-detail-section">
      <h3>👤 بيانات العميل</h3>

      <div class="order-detail-grid">

        <div>
          <strong>الاسم</strong>
          <span>${Admin.escape(order.customer_name || '-')}</span>
        </div>

        <div>
          <strong>رقم الهاتف</strong>
          <span>${Admin.escape(order.customer_phone || '-')}</span>
        </div>

        <div class="full-width">
          <strong>العنوان</strong>
          <span>${Admin.escape(order.customer_address || '-')}</span>
        </div>

      </div>
    </div>

    <div class="order-detail-section">
      <h3>🛒 المنتجات</h3>

      <div class="order-products">

        ${
          items.length
            ? items.map((item, index) => `
                <div class="order-product">

                  <div class="order-product-number">
                    ${index + 1}
                  </div>

                  <div class="order-product-info">

                    <strong>
                      ${Admin.escape(item.name || 'منتج')}
                    </strong>

                    <span>
                      SKU:
                      ${Admin.escape(item.sku || '-')}
                    </span>

                    <span>
                      السعر:
                      ${Admin.formatMoney(item.price)}
                    </span>

                    <span>
                      الكمية:
                      ${Number(item.quantity || 1)}
                    </span>

                  </div>

                  <div class="order-product-total">
                    ${Admin.formatMoney(
                      Number(item.price || 0) *
                      Number(item.quantity || 1)
                    )}
                  </div>

                </div>
              `).join('')
            : '<p>لا توجد منتجات</p>'
        }

      </div>
    </div>

    <div class="order-detail-section">
      <h3>💰 الحساب</h3>

      <div class="order-summary-details">

        <div>
          <span>إجمالي المنتجات</span>
          <strong>
            ${Admin.formatMoney(order.subtotal)}
          </strong>
        </div>

        ${this.getPromoDetails(notes)}

        <div>
          <span>التوصيل</span>
          <strong>
            ${Admin.formatMoney(order.delivery_fee)}
          </strong>
        </div>

        <div class="order-final-total">
          <span>الإجمالي النهائي</span>
          <strong>
            ${Admin.formatMoney(order.total)}
          </strong>
        </div>

      </div>
    </div>

    ${
      notes
        ? `
          <div class="order-detail-section">
            <h3>📝 ملاحظات الطلب</h3>

            <div class="order-notes">
              ${Admin.escape(notes)}
            </div>
          </div>
        `
        : ''
    }

  </div>
`;

document.getElementById('order-details').innerHTML = detailsHTML;
document.getElementById('order-modal').hidden = false;
},

getPromoDetails(notes) {
if (!notes) return '';


const promoMatch = notes.match(
  /Promo:\s*([A-Z0-9_-]+)\s*-\s*Discount:\s*([\d.]+)/i
);

if (!promoMatch) return '';

const code = promoMatch[1];
const discount = Number(promoMatch[2]);

return `
  <div>
    <span>الخصم (${Admin.escape(code)})</span>

    <strong>
      - ${Admin.formatMoney(discount)}
    </strong>
  </div>
`;

}
};

document.addEventListener('DOMContentLoaded', () => {

AdminOrders.load();

document
.getElementById('reload-orders')
?.addEventListener('click', () => {
AdminOrders.load();
});

document
.getElementById('close-order-modal')
?.addEventListener('click', () => {
document.getElementById('order-modal').hidden = true;
});

});
