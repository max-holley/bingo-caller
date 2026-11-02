// Extension points (spec section 10). Everything here is off in v1.
//
// Rule for contributors: any non-essential technology (analytics, ad networks, third-party
// embeds or widgets) must be rendered inside slots/ConsentGate.svelte and must not load before
// opt-in consent. Adding one also means updating the privacy notice and adding a consent UI.
export const config = {
  /** Sponsor slot shown once to the host between "Host a game" and the lobby. Never shown to players. */
  preGameInterstitial: { enabled: false },
} as const;
