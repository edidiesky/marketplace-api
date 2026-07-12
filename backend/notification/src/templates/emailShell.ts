

export const EMAIL_TOKENS = {
  bodyFontStack: `'Newsreader',Georgia,'Times New Roman',serif`,
  headingFontStack: `'Newsreader',Georgia,'Times New Roman',serif`,
  canvas:      "#ffffff", // --color-canvas
  ink:         "#17191c", // --color-ink
  fog:         "#f7f7f8", // --color-fog, page background
  terracotta:  "#5d2a1a", // --color-terracotta, primary/CTA
  warmMist:    "#fbe1d1", // --color-warm-mist, soft accent backgrounds
  mutedStone:  "#4c4c4c", // --color-muted-stone, primary body text
  lightSteel:  "#777b86", // --color-light-steel, secondary text
  hintOfGrey:  "#a3a6af", // --color-hint-of-grey, footer/caption text
  border:      "#f0f0f0", // hairline, not a drop shadow
  destructive: "#e53e3e", // sparingly, text only, never the whole button
} as const;

const GOOGLE_FONTS_LINK =
  `<link rel="preconnect" href="https://fonts.googleapis.com">` +
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
  `<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap" rel="stylesheet">`;

export interface EmailInfoRow {
  label: string;
  value: string;
}

export interface EmailCta {
  label: string;
  url:   string;
  variant?: "primary" | "destructive-text-only";
}

export interface EmailLayoutOptions {
  heading:        string;
  headingColor?:  string;
  intro:          string;
  secondaryText?: string;
  infoRows?:      EmailInfoRow[];
  codeBlock?:     string; // large centered code display, e.g. 2FA tokens
  cta?:           EmailCta;
  secondaryLink?: { label: string; url: string };
  closingNote?:   string;
}

function renderCodeBlock(code?: string): string {
  if (!code) return "";
  const grouped = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  return `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="border:1.5px solid #777;border-radius:8px;padding:18px 32px; background-color:#eee">
          <span style="font-size:30px;font-weight:700;color:${EMAIL_TOKENS.ink};letter-spacing:4px;font-variant-numeric:tabular-nums;font-family:${EMAIL_TOKENS.bodyFontStack}">${grouped}</span>
        </td>
      </tr>
    </table>`;
}

function renderInfoTable(rows: EmailInfoRow[]): string {
  if (rows.length === 0) return "";
  const cells = rows
    .map(
      (r) => `
        <tr>
          <td style="font-size:14px;color:${EMAIL_TOKENS.lightSteel};padding:12px 16px;border-bottom:1px solid ${EMAIL_TOKENS.border}">${r.label}</td>
          <td style="font-size:14px;color:${EMAIL_TOKENS.ink};padding:12px 16px;border-bottom:1px solid ${EMAIL_TOKENS.border};text-align:right">${r.value}</td>
        </tr>`
    )
    .join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_TOKENS.fog};border-radius:8px;margin:0 0 32px;text-align:left;overflow:hidden">
      ${cells}
    </table>`;
}

function renderCta(cta?: EmailCta): string {
  if (!cta) return "";
  const bg = cta.variant === "destructive-text-only" ? EMAIL_TOKENS.terracotta : EMAIL_TOKENS.terracotta;
  return `
    <a href="${cta.url}"
       style="background:${bg};color:#ffffff;padding:16px 40px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;display:inline-block;margin:8px 0 0">
      ${cta.label}
    </a>`;
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const {
    heading, headingColor, intro, secondaryText,
    infoRows = [], codeBlock, cta, secondaryLink, closingNote,
  } = opts;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${GOOGLE_FONTS_LINK}
</head>
<body style="margin:0;padding:0;background:${EMAIL_TOKENS.fog};font-family:${EMAIL_TOKENS.bodyFontStack};color:${EMAIL_TOKENS.mutedStone}">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td height="48"></td></tr>
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:${EMAIL_TOKENS.canvas};border:1px solid ${EMAIL_TOKENS.border};border-radius:12px">
          <tr>
            <td style="padding:40px 48px 8px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-left:8px;font-size:18px;font-weight:700;color:${EMAIL_TOKENS.ink}">Selleasi</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px 48px">
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.3;color:${headingColor ?? EMAIL_TOKENS.ink};font-weight:600;font-family:${EMAIL_TOKENS.headingFontStack}">${heading}</h1>
              <p style="font-size:15px;line-height:26px;color:${EMAIL_TOKENS.mutedStone};margin:0 0 ${secondaryText ? "8px" : "28px"}">${intro}</p>
              ${secondaryText ? `<p style="font-size:14px;line-height:22px;color:${EMAIL_TOKENS.lightSteel};margin:0 0 28px">${secondaryText}</p>` : ""}
              ${renderCodeBlock(codeBlock)}
              ${renderInfoTable(infoRows)}
              ${renderCta(cta)}
              ${secondaryLink ? `
              <div style="margin-top:20px">
                <a href="${secondaryLink.url}" style="color:${EMAIL_TOKENS.terracotta};font-size:14px;text-decoration:underline">${secondaryLink.label}</a>
              </div>` : ""}
              ${closingNote ? `<p style="font-size:13px;color:${EMAIL_TOKENS.hintOfGrey};margin:32px 0 0;line-height:20px">${closingNote}</p>` : ""}
            </td>
          </tr>
        </table>

        <!-- footer, small-caps muted wordmark, matches Claude's
             "ANTHROP\\C" footer treatment -->
        <table width="560" cellpadding="0" cellspacing="0">
          <tr><td height="28"></td></tr>
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;letter-spacing:1.5px;color:${EMAIL_TOKENS.hintOfGrey};font-weight:600">SELLEASI</p>
              <p style="margin:6px 0 0;font-size:12px;color:${EMAIL_TOKENS.hintOfGrey}">Marketplace &middot; Support &middot; Help Center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td height="48"></td></tr>
  </table>
</body>
</html>`;
}