import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../legal-page";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The Terms of Service for Classic Games Hub - the rules for using the site, your account, the community, the credits economy and our Discord integration.",
  alternates: { canonical: "/legal/terms" },
};

const UPDATED = "22 July 2026";
const CONTACT_EMAIL = "blobbyofficial@blobbyofficial.com";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro="These terms are the agreement between you and Classic Games Hub. They're written to be readable - but they are still the rules, so please actually read them. By creating an account or using the site you agree to everything below."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          Classic Games Hub (&ldquo;the Hub&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a free
          browser arcade operated from the United Kingdom by BlobbyOfficial. You can contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or in our{" "}
          <a href={SITE.discord} target="_blank" rel="noopener noreferrer">
            Discord server
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. Using the Hub</h2>
        <ul>
          <li>You must be at least <strong>13 years old</strong> to create an account.</li>
          <li>
            You may use the Hub only for its intended purpose: playing games, collecting cosmetics
            and taking part in the community. Automated scraping, botting and bulk account creation
            are not permitted.
          </li>
          <li>
            The Hub is provided free of charge. Playing is never pay-to-win, and nothing on the Hub
            has real-world monetary value.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>
            You can sign up with an email address and password, or with Discord. Keep your
            credentials secure - you are responsible for activity on your account.
          </li>
          <li>One person, one account. Alternate accounts used to farm credits, evade blocks or
            manipulate leaderboards may be removed.</li>
          <li>
            Usernames must not be offensive, impersonate others, or infringe anyone&rsquo;s rights.
            We may rename accounts that break this rule.
          </li>
          <li>
            If you believe your account has been compromised, change your password in Settings →
            Security and contact us.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Community behaviour</h2>
        <p>
          The Hub includes chat, group chats, stories, profiles and other user-generated content.
          By posting anything you agree that you will not:
        </p>
        <ul>
          <li>harass, bully, threaten or abuse other players;</li>
          <li>post content that is illegal, hateful, sexually explicit, or targets anyone based on
            protected characteristics;</li>
          <li>spam, advertise, or share malicious links;</li>
          <li>share other people&rsquo;s personal information without their consent;</li>
          <li>impersonate other players, staff, or the Hub itself.</li>
        </ul>
        <p>
          You keep ownership of the content you post, but you give us a non-exclusive licence to
          store, display and moderate it as needed to run the service. We may remove any content at
          our discretion.
        </p>
      </section>

      <section>
        <h2>5. Fair play</h2>
        <ul>
          <li>
            Cheating is not allowed: exploiting bugs, automating gameplay, tampering with score
            submissions, or abusing the credits economy (including XP/credit farming with alternate
            accounts) may lead to score removal, economy resets, or account suspension.
          </li>
          <li>Found a bug or exploit? Please report it to us instead of using it - we genuinely
            appreciate it.</li>
          <li>Attempting to attack, overload or reverse-engineer the service is prohibited.</li>
        </ul>
      </section>

      <section>
        <h2>6. Credits, cosmetics and progression</h2>
        <ul>
          <li>
            Credits, XP, levels, cosmetics, boosts and other virtual items are game features with
            <strong> no cash value</strong>. They cannot be bought with, sold for, or exchanged into
            real money, and are not transferable outside the features the Hub provides (such as
            gifting).
          </li>
          <li>
            We may adjust the economy (prices, rewards, multipliers, item availability) to keep the
            game fair and fun. Where we retire a purchasable item we aim to refund its credit price,
            but virtual balances may be adjusted or reset as part of moderation or game-balance
            decisions.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Discord integration</h2>
        <ul>
          <li>
            You can optionally link your Discord account (via Discord sign-in or a one-time
            <code> /link</code> code). Linking is only possible for a Discord account you control.
          </li>
          <li>
            When linked, the Hub may assign or remove roles in our Discord server based on your Hub
            account (staff status, badges, levels and similar), and our bot tracks Discord chat
            activity to award Discord XP and levels. The website is the source of truth for roles.
          </li>
          <li>
            Discord itself is a third-party service governed by{" "}
            <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">
              Discord&rsquo;s own terms
            </a>
            . Our Discord server has its own rules, and moderation actions there (warnings,
            timeouts, bans) may be mirrored to your Hub account and vice versa.
          </li>
          <li>You can unlink at any time from Settings → Connections; linked-only perks and synced
            roles are then removed.</li>
        </ul>
      </section>

      <section>
        <h2>8. Moderation, suspension and termination</h2>
        <ul>
          <li>
            We may warn, restrict, suspend or permanently ban accounts that break these terms, and
            remove content, scores, credits or cosmetics obtained through abuse. Serious violations
            may result in immediate permanent bans without warning.
          </li>
          <li>
            You can stop using the Hub at any time, and may request deletion of your account and
            data (see the <Link href="/legal/privacy">Privacy Policy</Link>).
          </li>
          <li>
            If you think a moderation decision is wrong, contact us and we&rsquo;ll take a second
            look.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Third-party services</h2>
        <p>
          The Hub is built on Supabase (database &amp; authentication), Vercel (hosting &amp;
          analytics), Discord (optional account linking and community) and Giphy (the in-chat GIF
          picker). Their availability affects ours, and their processing of data is described in
          the <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>10. Intellectual property</h2>
        <ul>
          <li>
            The Hub&rsquo;s code, design, games, artwork and branding belong to us (or our
            licensors). Don&rsquo;t copy, resell or redistribute them without permission.
          </li>
          <li>
            The games on the Hub are original implementations of classic public-domain game
            concepts.
          </li>
        </ul>
      </section>

      <section>
        <h2>11. Availability and changes to the service</h2>
        <p>
          The Hub is a free community project. We aim for it to be reliable, but it is provided
          <strong> &ldquo;as is&rdquo;</strong> with no uptime guarantee - features may change, break, be paused
          or be removed at any time, and we may modify or discontinue the service (in whole or in
          part). Where reasonably possible we&rsquo;ll give notice of major changes via the site or
          Discord.
        </p>
      </section>

      <section>
        <h2>12. Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect or consequential
          losses, lost data, or lost virtual items arising from your use of the Hub. Nothing in
          these terms limits liability that cannot be limited under the law of England and Wales,
          which governs these terms. Nothing here affects your statutory rights.
        </p>
      </section>

      <section>
        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms as the Hub evolves. The &ldquo;last updated&rdquo; date at the
          top always reflects the current version, and significant changes will be announced on the
          site or Discord. Continuing to use the Hub after a change means you accept the updated
          terms.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or
          ask a member of staff in our{" "}
          <a href={SITE.discord} target="_blank" rel="noopener noreferrer">
            Discord server
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
