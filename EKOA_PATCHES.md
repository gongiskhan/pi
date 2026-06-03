# EKOA_PATCHES — intentional deltas in this fork

This is a **minimal fork** of [`earendil-works/pi`](https://github.com/earendil-works/pi)
maintained by Ekoa. It exists only for changes the Pi extension API cannot make.
Everything else should track upstream verbatim.

**If you are resolving a merge conflict** (e.g. the weekly upstream sync): keep
upstream's behavior *plus* the Ekoa deltas listed below. Every Ekoa change is
tagged with a `// EKOA:` comment in source. After resolving, the build and the
Ekoa regression test (`packages/coding-agent/test/login-target.test.ts`) **must**
pass — that test is the guard that our deltas survived the merge.

Keep this file in sync with the actual deltas. Prefer small, config-gated,
upstream-friendly changes (low conflict surface) over invasive edits.

---

## Delta 1 — `/login` signs into a configured provider, not the multi-provider selector

**Why:** Pi's built-in `/login` opens a selector listing **every** provider
(Anthropic, OpenAI, …). Ekoa embeds Pi and must only ever offer the **Ekoa**
login. The extension API has no hook to hide/override a built-in slash command or
filter that list, so it must be done in the fork. This is the founding reason for
the fork.

**Contract (general, not Ekoa-hardcoded):** a new optional setting
`defaultAuthProvider` (in `settings.json` / the `Settings` interface). When set,
`/login` calls that provider's OAuth login **directly** and skips the auth-type +
provider selectors. When unset (upstream default), behavior is unchanged.
`/logout` is intentionally **left as upstream** — it only ever lists providers
that already have stored credentials, so it never exposes a new Anthropic login.

**Files:**
- `packages/coding-agent/src/modes/interactive/login-target.ts` — **new.** Pure
  helper `resolveLoginTarget(defaultAuthProvider, oauthProviderOptions)`.
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts` — the
  `if (text === "/login")` dispatch routes through `resolveLoginTarget` →
  `showLoginDialog(...)`, falling back to `showOAuthSelector("login")`. (import +
  dispatch block, both `// EKOA:`)
- `packages/coding-agent/src/core/settings-manager.ts` — `Settings.defaultAuthProvider?: string`
  + `getDefaultAuthProvider()` getter. (both `// EKOA:`)
- `packages/coding-agent/test/login-target.test.ts` — **new.** Regression guard:
  unit-tests the helper *and* asserts the `/login` dispatch stays wired (source
  guard) so a future merge can't silently re-expose the Anthropic selector.

The consumer (ekoa-local) sets `defaultAuthProvider: "ekoa"` and registers the
`ekoa` OAuth provider via its Pi extension; nothing Ekoa-specific lives here.

---

## Known upstream baseline (NOT an Ekoa regression)

On a clean checkout, `./test.sh` (which unsets all API keys) has **one**
pre-existing failure unrelated to any Ekoa change:

- `packages/coding-agent/test/session-id-readonly.test.ts` →
  *"rejects an existing fork target session id"* — with no API key configured the
  CLI errors `No API key found for the selected model` before reaching the
  `Session already exists` assertion.

The green-gate tolerates exactly this one test (see the sync workflow). A merge is
"green" if the **build** passes, the **Ekoa regression test** passes, and the only
failing test is the one above.
