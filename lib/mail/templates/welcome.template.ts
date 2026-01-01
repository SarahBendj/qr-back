export const welcomeTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Welcome to SmartQR</title>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    /* Mode clair par défaut */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    body, table, td, a {
      font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    /* Variables pour mode clair */
    .email-container {
      background-color: #ffffff;
    }
    .text-primary {
      color: #1e293b;
    }
    .text-secondary {
      color: #64748b;
    }
    .border-color {
      border: 1px solid #e2e8f0;
    }
    
    /* Mode sombre */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1e293b !important;
      }
      .text-primary {
        color: #f1f5f9 !important;
      }
      .text-secondary {
        color: #94a3b8 !important;
      }
      .border-color {
        border: 1px solid #334155 !important;
      }
      .logo-filter {
        filter: brightness(0) invert(1);
      }
    }
  </style>
</head>
<body style="
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  font-family: 'Lexend', sans-serif;
">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Container principal -->
        <table class="email-container border-color" width="600" cellpadding="0" cellspacing="0"
          style="
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
          ">

          <!-- Header avec logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center;">
              <img 
                class="logo-filter"
                src="${process.env.R2_DISPLAY_PUBLIC_URL}/smartQR/logo/logo.png"
                alt="SmartQR Logo"
                width="48"
                height="48"
                style="display: block; margin: 0 auto;"
              />
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <h1 class="text-primary" style="
                margin: 0 0 16px 0;
                font-size: 24px;
                font-weight: 700;
                line-height: 1.3;
                color: #1e293b;
              ">
                Welcome, ${name}
              </h1>

              <p class="text-secondary" style="
                margin: 0 0 24px 0;
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
                font-weight: 400;
              ">
                Your SmartQR account is ready. Create, manage and share professional QR codes in seconds.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="https://smart-qr.pro"
                       style="
                         display: inline-block;
                         background-color: #3b82f6;
                         color: #ffffff;
                         padding: 12px 32px;
                         border-radius: 8px;
                         text-decoration: none;
                         font-weight: 600;
                         font-size: 15px;
                         font-family: 'Lexend', sans-serif;
                       ">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p class="text-secondary" style="
                margin: 0;
                font-size: 13px;
                line-height: 1.5;
                color: #64748b;
                font-weight: 400;
              ">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="border-color" style="
              padding: 24px 32px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
            ">
            — 
              The SmartQR Team 
              Digital Identity & Smart QR Solutions 

              🌐 https://smart-qr.pro
              📩 contact@smart-qr.pro


              © ${new Date().getFullYear()} SmartQR — All rights reserved
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;