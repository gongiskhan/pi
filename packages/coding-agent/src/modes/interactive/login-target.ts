import type { AuthSelectorProvider } from "./components/oauth-selector.ts";

/**
 * EKOA: Resolve which provider `/login` should sign into directly.
 *
 * When `defaultAuthProvider` is configured (Ekoa sets it to "ekoa"), `/login`
 * skips Pi's multi-provider auth selector — which lists Anthropic and every
 * other built-in provider — and goes straight to that provider's OAuth flow.
 *
 * Returns `null` when the setting is unset/empty, or when the configured
 * provider is not among the available OAuth providers; in those cases the
 * caller falls back to the normal upstream selector. Keeping this a pure
 * function (no `InteractiveMode` dependency) lets it be unit-tested directly
 * and pins the "no Anthropic selector" guarantee against future merges.
 */
export function resolveLoginTarget(
	defaultAuthProvider: string | undefined,
	oauthProviderOptions: ReadonlyArray<AuthSelectorProvider>,
): AuthSelectorProvider | null {
	if (!defaultAuthProvider) {
		return null;
	}
	return oauthProviderOptions.find((provider) => provider.id === defaultAuthProvider) ?? null;
}
