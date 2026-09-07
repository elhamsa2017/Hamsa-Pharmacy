
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

  /**
   * Initialize authentication.
   */
  async init() {

    console.log('🔐 Hamsa Admin Auth starting...');

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

    console.log('🔐 Auth loaded');
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

