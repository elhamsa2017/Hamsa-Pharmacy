const AdminInsurance = {
  requests: [],
  statuses: ['pending', 'approved', 'rejected', 'completed'],
  async load() {
    const state = document.getElementById('insurance-state');
    const table = document.getElementById('insurance-table');
    try {
      const result = await Admin.query('insurance_requests', 'id,insurance_id,card_number,customer_name,phone,card_front_url,national_id_front_url,national_id_back_url,treatment_type,prescription_url,prescription_urls,delivery_method,status,created_at', { order: 'created_at', ascending: false });
      this.requests = result.data || [];
      this.render();
      state.hidden = true;
      table.hidden = false;
    } catch (error) { Admin.showState(state, `تعذر تحميل طلبات التأمين: ${error.message || 'تحقق من RLS'}`, true); table.hidden = true; }
  },
  render() {
    const body = document.querySelector('#insurance-table tbody');
    if (!this.requests.length) { body.innerHTML = '<tr><td colspan="9"><div class="admin-state">لا توجد طلبات تأمين حاليًا</div></td></tr>'; return; }
    body.innerHTML = this.requests.map(request => `<tr><td>${Admin.escape(request.id)}</td><td>${Admin.escape(request.insurance_id)}</td><td>${Admin.escape(request.customer_name)}</td><td>${Admin.escape(request.phone)}</td><td>${Admin.escape(request.treatment_type)}</td><td>${Admin.escape(request.delivery_method)}</td><td><select class="admin-select insurance-status" data-id="${Admin.escape(request.id)}">${this.statuses.map(status => `<option value="${status}" ${status === request.status ? 'selected' : ''}>${this.label(status)}</option>`).join('')}</select></td><td>${Admin.formatDate(request.created_at)}</td><td><button type="button" class="admin-button secondary insurance-details" data-id="${Admin.escape(request.id)}">عرض</button></td></tr>`).join('');
    body.querySelectorAll('.insurance-status').forEach(select => select.addEventListener('change', event => this.updateStatus(event.target)));
    body.querySelectorAll('.insurance-details').forEach(button => button.addEventListener('click', () => this.details(button.dataset.id)));
  },
  label(status) { return { pending: 'قيد المراجعة', approved: 'تمت الموافقة', rejected: 'مرفوض', completed: 'مكتمل' }[status] || status || 'غير محدد'; },
  async updateStatus(select) { try { await Admin.update('insurance_requests', select.dataset.id, { status: select.value }); Admin.toast('تم تحديث حالة طلب التأمين'); } catch (error) { Admin.toast(`فشل تحديث الحالة: ${error.message || 'تحقق من RLS'}`, true); } },
  async details(id) {
    const request = this.requests.find(item => String(item.id) === String(id));
    if (!request) return;
    const links = [];
    for (const path of [request.card_front_url, request.national_id_front_url, request.national_id_back_url, ...(Array.isArray(request.prescription_urls) ? request.prescription_urls : [request.prescription_url])]) {
      if (!path) continue;
      try { const result = await Admin.sb.storage.from('insurance-documents').createSignedUrl(path, 300); if (!result.error && result.data?.signedUrl) links.push(`<li><a href="${Admin.escape(result.data.signedUrl)}" target="_blank" rel="noopener">فتح المستند</a></li>`); } catch (error) { console.error(error); }
    }
    document.getElementById('insurance-details').innerHTML = `<p><strong>اسم العميل:</strong> ${Admin.escape(request.customer_name)}</p><p><strong>الهاتف:</strong> ${Admin.escape(request.phone)}</p><p><strong>رقم الكارت:</strong> ${Admin.escape(request.card_number)}</p><p><strong>نوع العلاج:</strong> ${Admin.escape(request.treatment_type)}</p><p><strong>طريقة الاستلام:</strong> ${Admin.escape(request.delivery_method)}</p><h3>المستندات</h3><ul>${links.join('') || '<li>لا توجد روابط متاحة أو فشل إنشاء رابط مؤقت</li>'}</ul>`;
    document.getElementById('insurance-modal').hidden = false;
  }
};
document.addEventListener('DOMContentLoaded', () => { AdminInsurance.load(); document.getElementById('reload-insurance').addEventListener('click', () => AdminInsurance.load()); document.getElementById('close-insurance-modal').addEventListener('click', () => { document.getElementById('insurance-modal').hidden = true; }); });
