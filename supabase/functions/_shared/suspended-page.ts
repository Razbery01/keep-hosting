export const SUSPENDED_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site Temporarily Unavailable – keep-hosting</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .card {
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 480px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      text-decoration: none;
    }

    .logo-mark {
      width: 2.25rem;
      height: 2.25rem;
      background: #6366f1;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-mark svg {
      width: 1.25rem;
      height: 1.25rem;
      fill: #ffffff;
    }

    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.02em;
    }

    .status-icon {
      width: 4rem;
      height: 4rem;
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .status-icon svg {
      width: 2rem;
      height: 2rem;
      stroke: #d97706;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    h1 {
      font-size: 1.375rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }

    p {
      font-size: 0.9375rem;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }

    .cta {
      display: inline-block;
      background: #6366f1;
      color: #ffffff;
      font-size: 0.9375rem;
      font-weight: 600;
      padding: 0.75rem 1.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .cta:hover { background: #4f46e5; }

    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1.75rem 0;
    }

    .footer {
      font-size: 0.8125rem;
      color: #94a3b8;
    }

    .footer a {
      color: #6366f1;
      text-decoration: none;
    }

    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <a href="https://keep-hosting.co.za" class="logo">
      <div class="logo-mark">
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z"/>
        </svg>
      </div>
      <span class="logo-text">keep-hosting</span>
    </a>

    <div class="status-icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
    </div>

    <h1>This website is temporarily unavailable</h1>

    <p>
      If you are the site owner, please update your payment details to restore
      access to your website. Your site and all its content are safely stored
      and will be back online within minutes of payment.
    </p>

    <a href="https://keep-hosting.co.za/dashboard" class="cta">
      Update Payment Details
    </a>

    <hr class="divider" />

    <p class="footer">
      Hosted by <a href="https://keep-hosting.co.za">keep-hosting.co.za</a> &mdash;
      simple, affordable South African web hosting.
    </p>
  </div>
</body>
</html>`
