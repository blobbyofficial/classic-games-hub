import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../legal-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Classic Games Hub collects, uses and protects your data — accounts, gameplay, messages, Discord linking, cookies and your rights under UK GDPR.",
  alternates: { canonical: "/legal/privacy" },
};

const UPDATED = "22 July 2026";
const CONTACT_EMAIL = "blobbyofficial@blobbyofficial.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro="This policy explains exactly what data Classic Games Hub collects, why, where it lives and what your rights are. It's written to match what the platform actually does — no more, no less."
    >
      <section>
        <h2>1. Who is responsible for your data</h2>
        <p>
          Classic Games Hub (&ldquo;the Hub&rdquo;, &ldquo;we&rdquo;) is operated from the United
          Kingdom by BlobbyOfficial, who acts as the data controller for the personal data described
          here. Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We handle personal
          data in line with UK data-protection law, including UK GDPR and the Data Protection Act
          2018.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <h3>Account data</h3>
        <ul>
          <li>
            <strong>Email address and password</strong> (password stored only as a secure hash) if
            you sign up by email — used to sign you in and for account emails such as password
            resets. We do not send marketing emails.
          </li>
          <li>
            <strong>Discord identity</strong> if you sign in with Discord or link your account: your
            Discord user ID and username, and the avatar Discord provides. We never see your Discord
            password.
          </li>
          <li>
            <strong>Profile information you choose to add</strong>: username, display name, avatar,
            banner, bio, pronouns, status line, featured achievements and cosmetics. Your profile is
            visible to other users.
          </li>
        </ul>
        <h3>Gameplay &amp; progression data</h3>
        <ul>
          <li>
            Play sessions, scores, leaderboard entries, achievements, XP, levels, credits and your
            credits-transaction history, daily-reward streaks, challenge progress, shop purchases,
            inventory and equipped cosmetics.
          </li>
        </ul>
        <h3>Social data</h3>
        <ul>
          <li>
            Friendships, follows, blocks, friend requests, group memberships, stories, message
            reactions and <strong>the messages you send</strong> (including links to GIFs you pick).
            Direct messages are only visible to their participants (plus, where strictly needed,
            moderation review of reported content); group messages to group members.
          </li>
          <li>Private notes and nicknames you set on other players (visible only to you).</li>
          <li>Reports you file about content or players.</li>
          <li>
            Presence data: a &ldquo;last seen&rdquo; timestamp updated while you use the site, and
            the presence/visibility preferences you configure.
          </li>
        </ul>
        <h3>Discord bot data (only if you use our Discord server)</h3>
        <ul>
          <li>
            Your Discord user ID and display name, a count of counted chat messages, Discord XP and
            level, and timestamps of your last counted message. The bot reads only message
            <em> metadata</em> for XP — it does not store the content of your Discord messages.
          </li>
          <li>The Discord roles our bot assigns or removes for you, and moderation actions taken
            through the bot (warnings, timeouts, bans, and the reason given), which are recorded in
            our audit log.</li>
          <li>One-time link codes while an account link is in progress (they expire within 10
            minutes and are then purged).</li>
        </ul>
        <h3>Technical data</h3>
        <ul>
          <li>
            <strong>IP addresses and device/browser information</strong> appear in the server logs
            of our hosting providers (Vercel, Supabase) as a normal part of serving requests and
            securing authentication. We don&rsquo;t build profiles from them.
          </li>
          <li>
            <strong>Anonymous usage analytics</strong> via Vercel Analytics and Speed Insights
            (page views and performance). These are cookie-less and aggregate — visitors are not
            individually identified or tracked across sites.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Cookies</h2>
        <p>
          The Hub uses only <strong>essential cookies</strong>: the authentication cookies that keep
          you signed in (set by our Supabase-based auth). There are no advertising or cross-site
          tracking cookies. If you enable the optional rewarded-ads programme in Settings and an ads
          provider is active, we will update this policy first to describe exactly what it sets.
        </p>
      </section>

      <section>
        <h2>4. Why we process your data (legal bases)</h2>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — running your account, gameplay, economy and
            social features you signed up for.
          </li>
          <li>
            <strong>Legitimate interests</strong> — keeping the platform safe and fair (moderation,
            anti-cheat, audit logs, rate-limiting), understanding aggregate usage, and securing our
            infrastructure.
          </li>
          <li>
            <strong>Consent</strong> — optional features you actively turn on, such as linking your
            Discord account or enabling rewarded ads. You can withdraw consent by unlinking or
            turning the feature off.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Where your data lives and who processes it</h2>
        <ul>
          <li>
            <strong>Supabase</strong> — our database and authentication provider; data is stored in
            an EU region (Ireland). Row Level Security restricts every record to the people entitled
            to see it.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the website and processes requests (including IP
            addresses in transient logs) and anonymous analytics.
          </li>
          <li>
            <strong>Discord</strong> — if you use Discord sign-in, linking, or our server, Discord
            processes your data under{" "}
            <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">
              its own privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Giphy</strong> — GIF searches in chat are proxied through our server, so Giphy
            receives the search term but not your identity or IP address.
          </li>
        </ul>
        <p>
          Some providers may process data outside the UK/EEA; where they do, transfers rely on
          recognised safeguards such as the UK International Data Transfer Agreement or adequacy
          decisions. We never sell your data.
        </p>
      </section>

      <section>
        <h2>6. How long we keep data</h2>
        <ul>
          <li>Account, gameplay, social and Discord-level data: for as long as your account exists.</li>
          <li>One-time Discord link codes: minutes (purged shortly after expiry).</li>
          <li>Stories: expire and stop being served 24 hours after posting.</li>
          <li>
            Audit logs (moderation and admin actions): kept while relevant for the safety of the
            platform.
          </li>
          <li>Hosting/server logs at Vercel and Supabase: short rolling windows controlled by those
            providers.</li>
        </ul>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>Under UK GDPR you can ask us to:</p>
        <ul>
          <li><strong>Access</strong> a copy of the personal data we hold about you;</li>
          <li><strong>Correct</strong> inaccurate data (most profile data you can edit yourself in Settings);</li>
          <li><strong>Delete</strong> your account and personal data;</li>
          <li><strong>Restrict or object</strong> to particular processing;</li>
          <li><strong>Port</strong> your data in a machine-readable format.</li>
        </ul>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account email and
          we&rsquo;ll respond within one month. You also have the right to complain to the UK
          Information Commissioner&rsquo;s Office (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>).
        </p>
        <p>
          You can unlink Discord at any time in Settings → Connections. Unlinking removes the
          connection and synced roles; Discord XP earned in the server remains associated with your
          Discord ID (delete-able on request).
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <ul>
          <li>All traffic is encrypted in transit (HTTPS).</li>
          <li>Passwords are hashed; we can never read them.</li>
          <li>
            Every database table is protected by Row Level Security; privileged operations run in
            audited, server-side functions that clients cannot call directly.
          </li>
          <li>Admin actions are recorded in an audit log.</li>
        </ul>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          The Hub is not for children under 13, and we don&rsquo;t knowingly collect their data. If
          you believe a child under 13 has an account, contact us and we will remove it.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          When the platform changes what it collects, this policy is updated first (the date at the
          top tells you the current version). Significant changes will be announced on the site or
          in{" "}
          <a href={SITE.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          .
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Privacy questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          See also our <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
