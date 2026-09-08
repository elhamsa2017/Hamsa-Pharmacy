
/**
 * =========================================================
 * Hamsa Pharmacy - Admin Authentication
 * Supabase Auth + staff
 * =========================================================
 */

const Auth = {

  sb: typeof supabaseClient !== 'undefined'
    ? supabaseClient
    : null,

  loginPage: 'admin-login.html',

  adminPage: 'admin.html',

  customerLoginPage: 'login.html',

  customerAccountPage: 'account.html',

  currentUser: null,

  customerListenerBound: false,

  /**
   * Initialize authentication.
   */
  async init() {

    console.log('🔐 Hamsa Auth starting...');

    if (!this.sb) {
      console.error('❌ Supabase client not available');
      return;
    }

    const page = this.getCurrentPage();

    if (page === 'admin-login.html') {
      await this.handleLoginPage();
      return;
    }

    if (page === 'admin.html') {
      await this.protectAdminPage();
      return;
    }

    await this.initCustomerAuth();

    if (page === 'login.html') {
      this.handleCustomerLoginPage();
    }

    if (page === 'account.html') {
      await this.handleAccountPage();
    }

    console.log('🔐 Auth loaded');
  },

  async initCustomerAuth() {
    const result = await this.sb.auth.getSession();
    this.currentUser = result.data?.session?.user || null;
    this.updateCustomerUI();

    if (!this.customerListenerBound) {
      this.customerListenerBound = true;
      this.sb.auth.onAuthStateChange((_event, session) => {
        this.currentUser = session?.user || null;
        this.updateCustomerUI();
        this.renderAccountPage();
      });
      window.addEventListener('hamsaLanguageChanged', () => {
        this.updateCustomerUI();
      });
    }
  },

  updateCustomerUI() {
    const accountButton = document.getElementById('account-button');
    if (!accountButton) return;

    const name = this.currentUser?.user_metadata?.full_name || this.currentUser?.email;
    const accountLabel = typeof I18n !== 'undefined'
      ? I18n.t('account')
      : 'حسابي';
    accountButton.textContent = name ? `👤 ${name}` : `👤 ${accountLabel}`;
  },

  goToCustomerPage() {
    window.location.href = this.currentUser
      ? this.customerAccountPage
      : this.customerLoginPage;
  },

  handleCustomerLoginPage() {
    const loginForm = document.getElementById('customer-login-form');
    const registerForm = document.getElementById('customer-register-form');
    const forgotForm = document.getElementById('customer-forgot-form');
    const message = document.getElementById('customer-auth-message');

    const showMessage = (text, type = 'error') => {
      if (!message) return;
      message.textContent = text;
      message.className = `auth-message ${type}`;
    };

    const setLoading = (button, loading, label) => {
      if (!button) return;
      button.disabled = loading;
      button.textContent = loading ? 'جاري التنفيذ...' : label;
    };

    loginForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const button = loginForm.querySelector('button[type="submit"]');
      setLoading(button, true, 'تسجيل الدخول');
      showMessage('');

      try {
        const { error } = await this.sb.auth.signInWithPassword({
          email: loginForm.elements.email.value.trim(),
          password: loginForm.elements.password.value
        });
        if (error) throw error;
        window.location.href = this.customerAccountPage;
      } catch (error) {
        showMessage(this.getErrorMessage(error));
        setLoading(button, false, 'تسجيل الدخول');
      }
    });

    registerForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const button = registerForm.querySelector('button[type="submit"]');
      setLoading(button, true, 'إنشاء الحساب');
      showMessage('');

      try {
        const { data, error } = await this.sb.auth.signUp({
          email: registerForm.elements.email.value.trim(),
          password: registerForm.elements.password.value,
          options: {
            data: { full_name: registerForm.elements.full_name.value.trim() }
          }
        });
        if (error) throw error;
        showMessage(
          data.session
            ? 'تم إنشاء الحساب بنجاح.'
            : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيله.',
          'success'
        );
        registerForm.reset();
      } catch (error) {
        showMessage(this.getErrorMessage(error));
      } finally {
        setLoading(button, false, 'إنشاء الحساب');
      }
    });

    forgotForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const button = forgotForm.querySelector('button[type="submit"]');
      setLoading(button, true, 'إرسال الرابط');
      showMessage('');

      try {
        const { error } = await this.sb.auth.resetPasswordForEmail(
          forgotForm.elements.email.value.trim(),
          { redirectTo: `${window.location.origin}/login.html` }
        );
        if (error) throw error;
        showMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.', 'success');
      } catch (error) {
        showMessage(this.getErrorMessage(error));
      } finally {
        setLoading(button, false, 'إرسال الرابط');
      }
    });
  },

  async handleAccountPage() {
    if (!this.currentUser) {
      window.location.replace(this.customerLoginPage);
      return;
    }
    this.renderAccountPage();
    await this.loadCustomerOrders();
  },

  renderAccountPage() {
    const userElement = document.getElementById('account-email');
    const nameElement = document.getElementById('account-name');
    if (!userElement || !nameElement) return;

    userElement.textContent = this.currentUser?.email || '-';
    nameElement.textContent = this.currentUser?.user_metadata?.full_name || 'عميل الهمسة';
  },

  async loadCustomerOrders() {
    const container = document.getElementById('customer-orders');
    if (!container || !this.currentUser) return;

    const { data, error } = await this.sb
      .from('orders')
      .select('id,total,status,created_at')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      container.textContent = 'تعذر تحميل الطلبات. تحقق من سياسة RLS الخاصة بقراءة طلبات المستخدم.';
      return;
    }

    container.innerHTML = data?.length
      ? data.map(order => `<div class="account-order"><strong>${this.escape(order.id)}</strong><span>${this.escape(order.status || 'جديد')}</span><b>${Number(order.total || 0).toFixed(2)} ج.م</b></div>`).join('')
      : '<p>لا توجد طلبات مرتبطة بهذا الحساب.</p>';
  },

  async customerSignOut() {
    const { error } = await this.sb.auth.signOut();
    if (error) throw error;
    window.location.replace(this.customerLoginPage);
  },

  escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Get current page filename.
   */
  getCurrentPage() {

    const path = window.location.pathname;

    const page = path.split('/').pop();

    return page || 'index.html';
  },

  /**
   * Login page handling.
   */
  async handleLoginPage() {

    const message = document.getElementById(
      'admin-login-message'
    );

    const form = document.getElementById(
      'admin-login-form'
    );

    const button = document.getElementById(
      'admin-login-button'
    );

    const year = document.getElementById(
      'admin-login-year'
    );

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    /*
     * Check if there is already a logged-in user.
     */
    const user = await this.getCurrentUser();

    if (user) {

      const staff = await this.getStaff(user.id);

      if (staff && staff.active && staff.role === 'admin') {

        console.log('✅ Admin already logged in');

        window.location.replace(this.adminPage);

        return;
      }

      /*
       * User exists but is not an active admin.
       */
      await this.signOut();
    }

    if (!form) return;

    form.addEventListener('submit', async (event) => {

      event.preventDefault();

      const emailInput =
        document.getElementById('admin-email');

      const passwordInput =
        document.getElementById('admin-password');

      const email =
        emailInput?.value.trim() || '';

      const password =
        passwordInput?.value || '';

      if (!email || !password) {

        this.showMessage(
          'من فضلك أدخل البريد الإلكتروني وكلمة المرور.',
          'error'
        );

        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = 'جاري تسجيل الدخول...';
      }

      this.hideMessage();

      try {

        const result =
          await this.sb.auth.signInWithPassword({
            email,
            password
          });

        if (result.error) {
          throw result.error;
        }

        const user = result.data?.user;

        if (!user) {
          throw new Error(
            'لم يتم العثور على بيانات المستخدم.'
          );
        }

        console.log(
          '✅ Supabase Auth login successful:',
          user.id
        );

        /*
         * IMPORTANT:
         * Authentication alone is not enough.
         * The user must also exist in staff.
         */
        const staff =
          await this.getStaff(user.id);

        if (!staff) {

          await this.signOut();

          throw new Error(
            'هذا الحساب غير مسجل في نظام الإدارة.'
          );
        }

        /*
         * Check active status.
         */
        if (!staff.active) {

          await this.signOut();

          throw new Error(
            'هذا الحساب غير مفعل. تواصل مع مدير النظام.'
          );
        }

        /*
         * Check admin role.
         */
        if (staff.role !== 'admin') {

          await this.signOut();

          throw new Error(
            'ليس لديك صلاحية دخول لوحة الإدارة.'
          );
        }

        /*
         * Admin verified.
         */
        console.log(
          '✅ Admin verified successfully:',
          staff
        );

        this.showMessage(
          'تم تسجيل الدخول بنجاح، جاري فتح لوحة الإدارة...',
          'success'
        );

        window.setTimeout(() => {
          window.location.replace(this.adminPage);
        }, 500);

      } catch (error) {

        console.error(
          '❌ Admin login error:',
          error
        );

        this.showMessage(
          this.getErrorMessage(error),
          'error'
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent = 'تسجيل الدخول';
        }
      }

    });
  },

  /**
   * Protect admin.html.
   */
  async protectAdminPage() {

    /*
     * First check Supabase session/user.
     */
    const user = await this.getCurrentUser();

    if (!user) {

      console.warn(
        '⚠️ No authenticated user. Redirecting to login.'
      );

      this.redirectToLogin(
        'يجب تسجيل الدخول أولًا.'
      );

      return false;
    }

    /*
     * Check staff record.
     */
    const staff =
      await this.getStaff(user.id);

    if (!staff) {

      console.warn(
        '⚠️ User is not registered in staff.'
      );

      await this.signOut();

      this.redirectToLogin(
        'هذا الحساب غير مصرح له بالدخول.'
      );

      return false;
    }

    /*
     * Check active.
     */
    if (!staff.active) {

      console.warn(
        '⚠️ Staff account is inactive.'
      );

      await this.signOut();

      this.redirectToLogin(
        'حساب الإدارة غير مفعل.'
      );

      return false;
    }

    /*
     * Check role.
     */
    if (staff.role !== 'admin') {

      console.warn(
        '⚠️ User is not an admin.'
      );

      await this.signOut();

      this.redirectToLogin(
        'ليس لديك صلاحية دخول لوحة الإدارة.'
      );

      return false;
    }

    /*
     * Store current staff information
     * for the admin interface.
     */
    window.currentAdmin = {
      user,
      staff
    };

    console.log(
      '✅ Admin page access granted:',
      staff
    );

    /*
     * Optional event for the dashboard.
     */
    document.dispatchEvent(
      new CustomEvent('adminAuthenticated', {
        detail: {
          user,
          staff
        }
      })
    );

    return true;
  },

  /**
   * Get current authenticated Supabase user.
   */
  async getCurrentUser() {

    if (!this.sb?.auth) {
      return null;
    }

    try {

      const result =
        await this.sb.auth.getUser();

      if (result.error) {
        return null;
      }

      return result.data?.user || null;

    } catch (error) {

      console.error(
        '❌ getCurrentUser error:',
        error
      );

      return null;
    }
  },

  /**
   * Get staff record by auth.users UUID.
   */
  async getStaff(userId) {

    if (!this.sb || !userId) {
      return null;
    }

    try {

      const result =
        await this.sb
          .from('staff')
          .select(`
            id,
            name,
            role,
            permissions,
            active,
            code,
            created_at,
            updated_at
          `)
          .eq('id', userId)
          .maybeSingle();

      if (result.error) {

        console.error(
          '❌ Staff query error:',
          result.error
        );

        return null;
      }

      return result.data || null;

    } catch (error) {

      console.error(
        '❌ getStaff error:',
        error
      );

      return null;
    }
  },

  /**
   * Sign out.
   */
  async signOut() {

    if (!this.sb?.auth) {
      return;
    }

    try {

      const result =
        await this.sb.auth.signOut();

      if (result.error) {
        console.error(
          '❌ Sign out error:',
          result.error
        );
      } else {
        console.log('✅ Signed out');
      }

    } catch (error) {

      console.error(
        '❌ Sign out exception:',
        error
      );
    }
  },

  /**
   * Redirect to login page.
   */
  redirectToLogin(message = '') {

    const url =
      `${this.loginPage}?message=${encodeURIComponent(message)}`;

    window.location.replace(url);
  },

  /**
   * Show login message.
   */
  showMessage(message, type = 'error') {

    const element =
      document.getElementById('admin-login-message');

    if (!element) return;

    element.textContent = message;

    element.className =
      `admin-login-message ${type}`;
  },

  /**
   * Hide login message.
   */
  hideMessage() {

    const element =
      document.getElementById('admin-login-message');

    if (!element) return;

    element.textContent = '';
    element.className =
      'admin-login-message';
  },

  /**
   * Convert Supabase errors into Arabic messages.
   */
  getErrorMessage(error) {

    const message =
      String(error?.message || '').toLowerCase();

    if (
      message.includes('invalid login credentials') ||
      message.includes('invalid credentials')
    ) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }

    if (
      message.includes('email not confirmed')
    ) {
      return 'يجب تأكيد البريد الإلكتروني أولًا.';
    }

    if (
      message.includes('too many requests')
    ) {
      return 'تم إجراء محاولات كثيرة. حاول مرة أخرى لاحقًا.';
    }

    return (
      error?.message ||
      'حدث خطأ أثناء تسجيل الدخول.'
    );
  }
};


/**
 * Start authentication after DOM is ready.
 */
document.addEventListener(
  'DOMContentLoaded',
  () => {
    Auth.init();
  }
);

