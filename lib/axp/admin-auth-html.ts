export function renderPasscodeGateHtml(targetName: string, returnPath: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Organiser Verification · AxP Social</title>
  <link rel="stylesheet" href="/axp/style.css">
  <link rel="stylesheet" href="/axp/fonts/fonts.css">
  <link rel="stylesheet" href="/axp/axp-preview.css">
  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #faf7f2;
      padding: 24px;
      margin: 0;
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      color: #1e1e1e;
    }
    .auth-card {
      background: #ffffff;
      border: 1px solid rgba(197, 160, 89, 0.35);
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 440px;
      padding: 40px 32px;
      text-align: center;
      box-sizing: border-box;
    }
    .auth-logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      display: block;
    }
    .auth-eyebrow {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #937344;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .auth-title {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 26px;
      font-weight: 500;
      color: #1c2e24;
      margin: 0 0 8px;
      letter-spacing: -0.01em;
    }
    .auth-desc {
      font-size: 14px;
      line-height: 1.5;
      color: #636b66;
      margin: 0 0 28px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: left;
    }
    .auth-input-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #2b3a32;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .auth-input-group input {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      font-size: 16px;
      border: 1px solid #d4cdc3;
      border-radius: 8px;
      background: #fdfcf9;
      color: #1a1a1a;
      outline: none;
      letter-spacing: 0.1em;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .auth-input-group input:focus {
      border-color: #402347;
      box-shadow: 0 0 0 3px rgba(27, 77, 62, 0.12);
    }
    .auth-button {
      padding: 14px;
      background: #402347;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .auth-button:hover {
      background: #133a2e;
    }
    .auth-button:active {
      transform: scale(0.99);
    }
    .auth-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .auth-error {
      background: #fdf2f2;
      color: #9e2a2b;
      border: 1px solid #f8c8c8;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
    }
    .auth-back {
      margin-top: 24px;
      display: inline-block;
      font-size: 13px;
      color: #8c8273;
      text-decoration: none;
      transition: color 0.2s;
    }
    .auth-back:hover {
      color: #402347;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <img src="/axp/emblem.png" alt="AxP Social" class="auth-logo">
    <div class="auth-eyebrow">AXP SOCIAL · AAGAZ</div>
    <h1 class="auth-title">${targetName}</h1>
    <p class="auth-desc">Enter the organiser PIN to access event management, attendee records, and gate admission tools.</p>
    
    <div id="auth-error" class="auth-error" role="alert"></div>

    <form id="auth-form" class="auth-form" method="POST" action="/api/axp/admin/auth">
      <div class="auth-input-group">
        <label for="admin-pin">ORGANISER PASSCODE</label>
        <input type="password" id="admin-pin" name="pin" placeholder="Enter PIN" autocomplete="current-password" autofocus required>
      </div>
      <button type="submit" id="auth-submit" class="auth-button">Unlock ${targetName} →</button>
    </form>

    <a href="/axp-social" class="auth-back">← Back to guest invitation</a>
  </div>

  <script>
    const form = document.getElementById('auth-form');
    const input = document.getElementById('admin-pin');
    const btn = document.getElementById('auth-submit');
    const errBox = document.getElementById('auth-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Verifying…';

      try {
        const res = await fetch('/api/axp/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: input.value })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          btn.textContent = 'Unlocked! Loading…';
          window.location.href = '${returnPath}';
        } else {
          errBox.textContent = data.error || 'Incorrect passcode. Access denied.';
          errBox.style.display = 'block';
          input.value = '';
          input.focus();
        }
      } catch (err) {
        errBox.textContent = 'Connection error. Please try again.';
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Unlock ${targetName} →';
      }
    });
  </script>
</body>
</html>`;
}
