import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../legal-page";
import { ConsentReopen } from "./consent-reopen";
import { ANALYTICS_COOKIES, ESSENTIAL_COOKIES } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Every cookie Classic Games Hub sets, what it is for, and how to change your mind about the optional ones.",
  alternates: { canonical: "/legal/cookies" },
};

const UPDATED = "3 August 2026";

/**
 * The cookie list is generated from `lib/consent.ts` rather than retyped here.
 *
 * A policy page that lists cookies by hand is wrong the first time someone adds
 * one and forgets to come back. Reading the same constants the banner and the
 * provider use means the page cannot describe a set of cookies the site does
 * not actually have.
 */
export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated={UPDATED}
      intro="What we store on your device, why, and how to change your answer. The short version: a handful of cookies are needed to sign you in and remember your choices, and everything else is optional and off unless you allow it."
    >
      <section>
        <h2>1. What we mean by cookies</h2>
        <p>
          &ldquo;Cookies&rdquo; here covers cookies and anything similar stored on your device -
          local storage and session storage included. The rules are the same for all of them: the
          ones needed to deliver something you asked for do not require your permission, and
          everything else does.
        </p>
      </section>

      <section>
        <h2>2. Strictly necessary</h2>
        <p>
          These are set whatever you choose, because without them the site cannot do what you came
          for - staying signed in, remembering dark mode, and remembering your answer to the cookie
          banner itself. They are not used for advertising or tracking, and we do not ask for
          consent for them because consent you cannot refuse is not consent.
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Set by</th>
            </tr>
          </thead>
          <tbody>
            {ESSENTIAL_COOKIES.map((c) => (
              <tr key={c.name}>
                <td>
                  <code>{c.name}</code>
                </td>
                <td>{c.purpose}</td>
                <td>{c.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. Analytics - optional</h2>
        <p>
          Nothing in this section loads until you allow it. If you reject, or simply never answer,
          the scripts are never added to the page at all - they are not loaded and silenced, they
          are not there.
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Set by</th>
            </tr>
          </thead>
          <tbody>
            {ANALYTICS_COOKIES.map((c) => (
              <tr key={c.name}>
                <td>
                  <code>{c.name}</code>
                </td>
                <td>{c.purpose}</td>
                <td>{c.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Changing your mind</h2>
        <p>
          You can change your answer at any time, and refusing later is exactly as easy as allowing
          was. Doing so takes effect immediately - analytics stops being loaded on the next page you
          open.
        </p>
        <ConsentReopen />
        <p>
          You can also clear cookies in your browser, which resets the choice and means you will be
          asked again.
        </p>
      </section>

      <section>
        <h2>5. Browser-level opt-outs</h2>
        <p>
          If your browser sends a{" "}
          <a
            href="https://globalprivacycontrol.org/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Global Privacy Control
          </a>{" "}
          signal, we treat that as a refusal and record it as one. You will not be shown the banner,
          because you have already answered it.
        </p>
      </section>

      <section>
        <h2>6. Keeping a record</h2>
        <p>
          When you make a choice we store it against a random identifier, along with the date and
          which version of this policy you were shown. That record exists so we can demonstrate what
          was consented to and when, as data-protection law requires. It is not joined to anything
          else, and if you are signed in you can ask for it under the rights set out in our{" "}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
        <p>
          If this policy changes in a way that widens what we collect, the stored version stops
          matching and you will be asked again rather than being carried over on an answer you gave
          to a different question.
        </p>
      </section>
    </LegalPage>
  );
}
