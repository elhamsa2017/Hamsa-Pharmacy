const Admin = {
  sb: typeof supabaseClient !== 'undefined' ? supabaseClient : null,

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatMoney(value) {
    return `${Number(value || 0).toFixed(2)} ج.م`;
  },

  formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ar-EG');
  },

  showState(container, message, error = false) {
    if (!container) return;
    container.innerHTML = `<div class="admin-state${error ? ' error' : ''}">${this.escape(message)}</div>`;
  },

  toast(message, error = false) {
    const toast = document.createElement('div');
    toast.className = `admin-toast${error ? ' error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  },

  async query(table, columns = '*', options = {}) {
    if (!this.sb) throw new Error('Supabase client غير متاح');
    let request = this.sb.from(table).select(columns, options.count ? { count: 'exact', head: true } : undefined);
    if (options.order) request = request.order(options.order, { ascending: options.ascending !== false });
    if (options.limit) request = request.limit(options.limit);
    if (options.eq) request = request.eq(options.eq[0], options.eq[1]);
    const result = await request;
    if (result.error) throw result.error;
    return result;
  },

  async count(table, filters = []) {
    if (!this.sb) throw new Error('Supabase client غير متاح');
    let request = this.sb.from(table).select('id');
    filters.forEach(([column, operator, value]) => {
      request = operator === 'gt'
        ? request.gt(column, value)
        : request.eq(column, value);
    });
    const result = await request;
    if (result.error) throw result.error;
    return Array.isArray(result.data) ? result.data.length : 0;
  },

  async update(table, id, values) {
    if (!this.sb) throw new Error('Supabase client غير متاح');
    const result = await this.sb.from(table).update(values).eq('id', id).select('id').single();
    if (result.error) throw result.error;
    return result.data;
  },

  async getUser() {
    if (!this.sb?.auth) return null;
    const result = await this.sb.auth.getUser();
    if (result.error) return null;
    return result.data.user || null;
  },

  async init() {
    document.querySelectorAll('[data-admin-year]').forEach(element => {
      element.textContent = new Date().getFullYear();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
