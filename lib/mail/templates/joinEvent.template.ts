export const joinEvent = (name: string,  eventTitle: string,confirmUrl: string,) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your Event Registration</title>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td, a { font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .email-container { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; max-width: 600px; }
    .text-primary { color: #1e293b; }
    .text-secondary { color: #64748b; }
    .border-color { border: 1px solid #e2e8f0; }
    @media (prefers-color-scheme: dark) {
      .email-container { background-color: #1e293b !important; }
      .text-primary { color: #f1f5f9 !important; }
      .text-secondary { color: #94a3b8 !important; }
      .border-color { border: 1px solid #334155 !important; }
      .logo-filter { filter: brightness(0) invert(1); }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Lexend', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table class="email-container border-color" cellpadding="0" cellspacing="0">
          <!-- Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center;">
              <img 
                class="logo-filter"
                src="${process.env.R2_DISPLAY_PUBLIC_URL}/smartQR/logo/logo.png"
                alt="SmartQR Logo"
                width="48"
                height="48"
                style="display:block;margin:0 auto;"
              />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <h1 class="text-primary" style="margin:0 0 16px 0; font-size:24px; font-weight:700;">
                Hello, ${name}
              </h1>

              <p class="text-secondary" style="margin:0 0 24px 0; font-size:15px; line-height:1.6;">
                You’ve registered for the event: <strong>${eventTitle}</strong>.
                Please confirm your participation by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="${confirmUrl}" 
                       style="
                         display:inline-block;
                         background-color:#3b82f6;
                         color:#ffffff;
                         padding:12px 32px;
                         border-radius:8px;
                         text-decoration:none;
                         font-weight:600;
                         font-size:15px;
                         font-family:'Lexend', sans-serif;
                       ">
                      Confirm My Spot
                    </a>
                  </td>
                </tr>
              </table>

              <p class="text-secondary" style="margin:0; font-size:13px; line-height:1.5;">
                If you didn’t register for this event, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="border-color" style="padding:24px 32px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0;">
              — The SmartQR Team <br/>
              Digital Identity & Smart QR Solutions <br/>
              🌐 https://smart-qr.pro <br/>
              📩 contact@smart-qr.pro <br/>
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
