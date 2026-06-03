import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AuthSelectorProvider } from "../src/modes/interactive/components/oauth-selector.ts";
import { resolveLoginTarget } from "../src/modes/interactive/login-target.ts";

/**
 * EKOA regression guard. The fork routes `/login` straight to the configured
 * auth provider (Ekoa) instead of Pi's multi-provider selector, which lists
 * Anthropic and every other built-in. These tests pin that behavior so a future
 * upstream merge cannot silently re-expose the Anthropic login path — if it
 * does, this suite goes red and the weekly sync PR is blocked. See EKOA_PATCHES.md.
 */

const EKOA: AuthSelectorProvider = { id: "ekoa", name: "Ekoa", authType: "oauth" };
const ANTHROPIC: AuthSelectorProvider = { id: "anthropic", name: "Anthropic", authType: "oauth" };

describe("EKOA: resolveLoginTarget", () => {
	it("returns the configured provider so /login skips the selector", () => {
		expect(resolveLoginTarget("ekoa", [ANTHROPIC, EKOA])).toEqual(EKOA);
	});

	it("returns null when no auth provider is configured (upstream selector path)", () => {
		expect(resolveLoginTarget(undefined, [ANTHROPIC, EKOA])).toBeNull();
		expect(resolveLoginTarget("", [ANTHROPIC, EKOA])).toBeNull();
	});

	it("returns null when the configured provider is unavailable (graceful fallback)", () => {
		expect(resolveLoginTarget("ekoa", [ANTHROPIC])).toBeNull();
	});
});

describe("EKOA: /login dispatch stays wired to the configured provider", () => {
	const source = readFileSync(resolve(__dirname, "../src/modes/interactive/interactive-mode.ts"), "utf8");
	const start = source.indexOf('if (text === "/login")');
	const loginBlock = start === -1 ? "" : source.slice(start, source.indexOf("return;", start) + "return;".length);

	it("locates the /login command dispatch", () => {
		expect(start).toBeGreaterThan(-1);
	});

	it("routes through resolveLoginTarget and showLoginDialog before any selector", () => {
		expect(loginBlock).toContain("resolveLoginTarget");
		expect(loginBlock).toContain("showLoginDialog");
	});

	it("only reaches the multi-provider selector as a fallback (never first/sole action)", () => {
		const guardIdx = loginBlock.indexOf("resolveLoginTarget");
		const selectorIdx = loginBlock.indexOf("showOAuthSelector");
		// If the selector is present at all, it must come after the guard (the else branch).
		if (selectorIdx !== -1) {
			expect(guardIdx).toBeGreaterThan(-1);
			expect(guardIdx).toBeLessThan(selectorIdx);
		}
	});
});
