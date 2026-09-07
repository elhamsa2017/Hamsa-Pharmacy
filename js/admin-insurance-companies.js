const AdminCompanies = {
  companies: [],
  async load() {
    const state = document.getElementById('companies-state');
    const table = document.getElementById('companies-table');
    try {
      const result = await Admin.query('insurance', 'id,name,active,created_at', { order: 'name' });
      this.companies = result.data || [];
      this.render();
      state.hidden = true;
      table.hidden = false;
    } catch (error) {
      Admin.showState(state, `تعذر تحميل الشركات: ${error.message || 'تحقق من RLS'}`, true);
      table.hidden = true;
    }
  },
  render() {
    const body = document.querySelector('#companies-table tbody');
    if (!this.companies.length) { body.innerHTML = '<tr><td colspan="5"><div class="admin-state">لا توجد شركات تأمين حاليًا</div></td></tr>'; return; }
    body.innerHTML = this.companies.map(company => `<tr><td>${Admin.escape(company.id)}</td><td>${Admin.escape(company.name)}</td><td><span class="admin-badge ${company.active ? 'success' : 'danger'}">${company.active ? 'مفعلة' : 'متوقفة'}</span></td><td>${Admin.formatDate(company.created_at)}</td><td><button class="admin-button secondary edit-company" data-id="${Admin.escape(company.id)}" type="button">تعديل</button></td></tr>`).join('');
    body.querySelectorAll('.edit-company').forEach(button => button.addEventListener('click', () => this.open(button.dataset.id)));
  },
  open(id = '') {
    const company = this.companies.find(item => String(item.id) === String(id));
    document.getElementById('company-id').value = company?.id || '';
    document.getElementById('company-name').value = company?.name || '';
    document.getElementById('company-active').checked = company ? Boolean(company.active) : true;
    document.getElementById('company-modal-title').textContent = company ? 'تعديل شركة' : 'إضافة شركة';
    document.getElementById('company-modal').hidden = false;
  },
  async save(event) {
    event.preventDefault();
    const id = document.getElementById('company-id').value;
    const values = { name: document.getElementById('company-name').value.trim(), active: document.getElementById('company-active').checked };
    if (!values.name) { Admin.toast('اكتب اسم الشركة', true); return; }
    try {
      if (id) { await Admin.update('insurance', id, values); } else { const result = await Admin.sb.from('insurance').insert(values); if (result.error) throw result.error; }
      Admin.toast('تم حفظ شركة التأمين');
      document.getElementById('company-modal').hidden = true;
      await this.load();
    } catch (error) { Admin.toast(`فشل حفظ الشركة: ${error.message || 'تحقق من RLS'}`, true); }
  }
};
document.addEventListener('DOMContentLoaded', () => { AdminCompanies.load(); document.getElementById('add-company').addEventListener('click', () => AdminCompanies.open()); document.getElementById('close-company-modal').addEventListener('click', () => { document.getElementById('company-modal').hidden = true; }); document.getElementById('company-form').addEventListener('submit', event => AdminCompanies.save(event)); });
