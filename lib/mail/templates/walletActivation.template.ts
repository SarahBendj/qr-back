export const walletActivationTemplate = (
  name: string,
  applePassUrl: string,
  googleSaveUrl: string,
  portfolioUrl: string,
) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Activez votre carte SmartQR</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        color-scheme: light dark;
        supported-color-schemes: light dark;
      }

      body,
      table,
      td,
      a {
        font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI',
          sans-serif;
      }

      .email-container {
        background-color: #ffffff;
      }
      .text-primary {
        color: #0f172a;
      }
      .text-secondary {
        color: #475569;
      }
      .border-color {
        border: 1px solid #e2e8f0;
      }
      .btn {
        display: inline-block;
        padding: 12px 16px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
      }
      .btn-primary {
        background: #0f172a;
        color: #ffffff;
      }
      .btn-secondary {
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #e2e8f0;
      }

      @media (prefers-color-scheme: dark) {
        .email-container {
          background-color: #0b1220 !important;
        }
        .text-primary {
          color: #f1f5f9 !important;
        }
        .text-secondary {
          color: #94a3b8 !important;
        }
        .border-color {
          border: 1px solid #1f2a44 !important;
        }
        .btn-secondary {
          background: #0b1220 !important;
          color: #f1f5f9 !important;
          border: 1px solid #1f2a44 !important;
        }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" class="email-container border-color" style="border-radius: 18px; overflow:hidden;">
            <tr>
              <td style="padding: 22px 24px; background: linear-gradient(135deg, #0f172a, #1e293b);">
                <div style="color:#fff; font-weight:800; font-size:16px; letter-spacing:0.2px;">
                  SmartQR
                </div>
                <div style="color:#cbd5e1; margin-top:6px; font-size:14px;">
                  Activez votre carte Wallet
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px;">
                <div class="text-primary" style="font-size: 18px; font-weight: 800;">
                  Bonjour ${name || '👋'},
                </div>
                <div class="text-secondary" style="margin-top: 10px; font-size: 14px; line-height: 1.6;">
                  Votre carte SmartQR est prête. Ajoutez-la à votre Wallet et partagez votre profil en un scan.
                </div>

                <div style="margin-top: 18px;" class="text-secondary">
                  <div style="font-weight:700; color: inherit;">Choisissez votre Wallet :</div>
                  <div style="margin-top: 12px;">
                    <a class="btn btn-primary" href="${googleSaveUrl}" target="_blank" rel="noreferrer">Ajouter à Google Wallet</a>
                  </div>
                  <div style="margin-top: 10px;">
                    <a class="btn btn-secondary" href="${applePassUrl}" target="_blank" rel="noreferrer">Télécharger la carte Apple Wallet (.pkpass)</a>
                  </div>
                </div>

                <div style="margin-top: 18px; padding: 14px; border-radius: 14px;" class="border-color">
                  <div class="text-secondary" style="font-size: 13px; line-height: 1.5;">
                    Votre lien public :<br/>
                    <a href="${portfolioUrl}" target="_blank" rel="noreferrer" style="color: inherit; font-weight: 700;">
                      ${portfolioUrl}
                    </a>
                  </div>
                </div>

                <div class="text-secondary" style="margin-top: 18px; font-size: 12px; line-height: 1.6;">
                  Si le bouton ne fonctionne pas, copiez-collez les liens ci-dessus dans votre navigateur.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 18px 24px; background-color:#f1f5f9;">
                <div style="color:#64748b; font-size:12px; line-height:1.6;">
                  SmartQR • contact@smart-qr.pro
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

