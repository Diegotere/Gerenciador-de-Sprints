function authShowMessage(message, type = 'is-info') {
  const el = document.getElementById('authNotification');
  if (!el) return;
  el.className = `notification ${type}`;
  el.textContent = message;
  el.classList.remove('is-hidden');
}

function switchAuthTab(tabName) {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.authTab === tabName);
  });
  document.querySelectorAll('[data-auth-panel]').forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.authPanel !== tabName);
  });
}

async function authRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Erro na operação.');
  return payload;
}

async function checkSessionAndRedirect() {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    if (response.ok) window.location.href = '/index.html';
  } catch {
    // noop
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkSessionAndRedirect();

  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await authRequest('/api/auth/login', {
        email: document.getElementById('loginEmail')?.value.trim(),
        password: document.getElementById('loginPassword')?.value
      });
      window.location.href = '/index.html';
    } catch (error) {
      authShowMessage(error.message, 'is-danger');
    }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await authRequest('/api/auth/register', {
        name: document.getElementById('registerName')?.value.trim(),
        email: document.getElementById('registerEmail')?.value.trim(),
        password: document.getElementById('registerPassword')?.value
      });
      authShowMessage('Cadastro realizado! Agora faça login.', 'is-success');
      switchAuthTab('login');
    } catch (error) {
      authShowMessage(error.message, 'is-danger');
    }
  });

  document.getElementById('forgotForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const resetTokenContainer = document.getElementById('resetTokenContainer');
    try {
      const result = await authRequest('/api/auth/forgot-password', {
        email: document.getElementById('forgotEmail')?.value.trim()
      });
      if (resetTokenContainer) {
        resetTokenContainer.classList.remove('is-hidden');
        resetTokenContainer.innerHTML = `
          <p><strong>Token gerado:</strong> <code>${result.resetToken || '***'}</code></p>
          <p class="is-size-7 mt-1">Em produção, esse token deve ser enviado por e-mail.</p>
        `;
      }
      authShowMessage(result.message || 'Token gerado com sucesso.', 'is-success');
    } catch (error) {
      authShowMessage(error.message, 'is-danger');
    }
  });

  document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
    try {
      const result = await authRequest('/api/auth/reset-password', {
        email: document.getElementById('forgotEmail')?.value.trim(),
        token: document.getElementById('resetToken')?.value.trim(),
        newPassword: document.getElementById('resetNewPassword')?.value
      });
      authShowMessage(result.message || 'Senha redefinida com sucesso.', 'is-success');
      switchAuthTab('login');
    } catch (error) {
      authShowMessage(error.message, 'is-danger');
    }
  });
});
