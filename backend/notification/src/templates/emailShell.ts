export const EMAIL_TOKENS = {
  fontStack: `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`,
  canvas: "#ffffff", // --color-canvas
  ink: "#17191c", // --color-ink
  fog: "#f7f7f8", // --color-fog, page background
  terracotta: "#5d2a1a", // --color-terracotta, primary/CTA
  warmMist: "#fbe1d1", // --color-warm-mist, soft accent backgrounds
  mutedStone: "#4c4c4c", // --color-muted-stone, primary body text
  lightSteel: "#777b86", // --color-light-steel, secondary text
  hintOfGrey: "#a3a6af", // --color-hint-of-grey, footer/caption text
  border: "#f0f0f0", // hairline, not a drop shadow
  destructive: "#e53e3e", // sparingly, text only, never the whole button
} as const;

export interface EmailInfoRow {
  label: string;
  value: string;
}

export interface EmailCta {
  label: string;
  url: string;
  variant?: "primary" | "destructive-text-only";
}

export interface EmailLayoutOptions {
  heading: string;
  headingColor?: string; // overrides ink, used sparingly (e.g. destructive)
  intro: string; // supports basic HTML (e.g. <strong>)
  secondaryText?: string;
  infoRows?: EmailInfoRow[];
  codeBlock?: string; // large centered code display, e.g. 2FA tokens
  cta?: EmailCta;
  secondaryLink?: { label: string; url: string };
  closingNote?: string;
}

function renderCodeBlock(code?: string): string {
  if (!code) return "";
  return `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="background:${EMAIL_TOKENS.warmMist};border-radius:8px;padding:20px 32px">
          <span style="font-size:32px;font-weight:700;color:${EMAIL_TOKENS.terracotta};letter-spacing:8px">${code}</span>
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
        </tr>`,
    )
    .join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_TOKENS.fog};border-radius:8px;margin:0 0 32px;text-align:left;overflow:hidden">
      ${cells}
    </table>`;
}

function renderCta(cta?: EmailCta): string {
  if (!cta) return "";
  const bg =
    cta.variant === "destructive-text-only"
      ? EMAIL_TOKENS.terracotta
      : EMAIL_TOKENS.terracotta;
  return `
    <a href="${cta.url}"
       style="background:${bg};color:#ffffff;padding:16px 40px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;display:inline-block;margin:8px 0 0">
      ${cta.label}
    </a>`;
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const {
    heading,
    headingColor,
    intro,
    secondaryText,
    infoRows = [],
    codeBlock,
    cta,
    secondaryLink,
    closingNote,
  } = opts;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:${EMAIL_TOKENS.fog};font-family:${EMAIL_TOKENS.fontStack};color:${EMAIL_TOKENS.mutedStone}">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td height="48"></td></tr>
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:${EMAIL_TOKENS.canvas};border:1px solid ${EMAIL_TOKENS.border};border-radius:12px">
          <tr>
            <td style="padding:40px 48px 8px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:22px;height:22px;background:${EMAIL_TOKENS.terracotta};border-radius:6px;text-align:center;vertical-align:middle">
                    <span style="color:#fff;font-size:13px;font-weight:700;line-height:22px">S</span>
                  </td>
                  <td style="padding-left:8px;font-size:16px;font-weight:700;color:${EMAIL_TOKENS.ink}">Selleasi</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px 48px">
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:${headingColor ?? EMAIL_TOKENS.ink};font-weight:700">${heading}</h1>
              <p style="font-size:15px;line-height:26px;color:${EMAIL_TOKENS.mutedStone};margin:0 0 ${secondaryText ? "8px" : "28px"}">${intro}</p>
              ${secondaryText ? `<p style="font-size:14px;line-height:22px;color:${EMAIL_TOKENS.lightSteel};margin:0 0 28px">${secondaryText}</p>` : ""}
              ${renderInfoTable(infoRows)}
              ${renderCodeBlock(codeBlock)}
              ${renderCta(cta)}
              ${
                secondaryLink
                  ? `
              <div style="margin-top:20px">
                <a href="${secondaryLink.url}" style="color:${EMAIL_TOKENS.terracotta};font-size:14px;text-decoration:underline">${secondaryLink.label}</a>
              </div>`
                  : ""
              }
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
