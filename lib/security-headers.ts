/**
 * Content Security Policy.
 *
 * next.config.ts already sets the static headers - frame options, nosniff,
 * referrer and permissions policy. Those are all worth having and none of them
 * contain an XSS. This is the one that does, which matters on a site that
 * renders usernames, bios, chat messages and third-party GIFs.
 *
 * SHIPPED REPORT-ONLY ON PURPOSE. A CSP written from reading the code is a
 * hypothesis; the browser is the thing that knows. Report-only means a mistake
 * in the list below shows up as a console warning instead of a blank page, and
 * the policy can be promoted to enforcing once real traffic has been quiet for
 * a while. To promote it, change the header name in proxy.ts - the policy
 * itself does not change.
 *
 * THE NONCE. Next injects its own inline scripts for hydration and routing, so
 * a policy without 'unsafe-inline' needs them nonced. Next does that
 * automatically, but only when it finds a nonce in the *request's*
 * `Content-Security-Policy` header - it does not read the report-only one.
 * proxy.ts therefore sets the enforcing header on the request (internal, never
 * sent to the browser) and the report-only header on the response (sent, and
 * merely reported). Same policy, same nonce, no enforcement.
 *
 * KNOWN REPORT BEFORE YOU PROMOTE IT: next-themes writes an un-nonced inline
 * script to set the theme before first paint, so it will show up in the
 * console under report-only. It is not an escape - it is our own script - but
 * enforcing this policy without dealing with it would leave a theme flash on
 * first load. The fix is to pass the nonce to <ThemeProvider nonce={...}>,
 * which means reading `headers()` in the root layout and accepting that the
 * layout becomes dynamic. That trade is worth making when the policy goes
 * enforcing and not before, which is why it has not been made here.
 */

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

/** Realtime is a WebSocket to the same project host. */
const SUPABASE_WS = SUPABASE_HOST.replace(/^https:/, "wss:");

export function buildCsp(): { nonce: string; policy: string } {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const policy = [
    `default-src 'self'`,

    // 'strict-dynamic' lets Next's nonced bootstrap load the chunks it needs
    // without every chunk URL being listed. The http: and 'unsafe-inline'
    // entries are ignored by browsers that understand strict-dynamic and act as
    // the fallback for those that do not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,

    // Styles stay unsafe-inline: Tailwind ships a real stylesheet, but Next and
    // several components set inline style attributes, and a nonce does not
    // cover those. Style injection is a defacement risk rather than an
    // execution one, which is the trade being made here knowingly.
    `style-src 'self' 'unsafe-inline'`,

    // data: for generated icons, blob: for canvas exports from the games.
    [
      `img-src 'self' data: blob:`,
      SUPABASE_HOST,
      `https://*.supabase.co`,
      `https://avatars.githubusercontent.com`,
      `https://lh3.googleusercontent.com`,
      `https://cdn.discordapp.com`,
      `https://*.giphy.com`, // the in-chat GIF picker renders media.giphy.com
    ].join(" "),

    `font-src 'self' data:`,

    // Supabase REST and Realtime, plus Vercel's analytics beacon (same origin,
    // /_vercel/insights, so 'self' covers it).
    `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WS} https://*.supabase.co wss://*.supabase.co`,

    // The games' sound effects and the profile music cosmetic.
    `media-src 'self' data: blob:`,

    // Nothing on the site embeds anything, and nothing may embed the site.
    // frame-ancestors is the modern X-Frame-Options; both are set.
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,

    // Stops an injected <base> silently re-pointing every relative URL, and an
    // injected form from posting the page's contents somewhere else.
    `base-uri 'self'`,
    `form-action 'self'`,

    `upgrade-insecure-requests`,
  ].join("; ");

  return { nonce, policy };
}
