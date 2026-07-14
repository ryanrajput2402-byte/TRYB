// Single source of truth for the Cinematic Opener's montage asset — swap
// the file in public/ and update this path, nothing else changes.
export const CINEMATIC_OPENER_SRC = "/cinematic-opener.mp4";

// How long before the video ends that line B replaces line A, matching the
// "final ~1.5s" cue in the spec regardless of the asset's exact runtime.
export const CINEMATIC_LINE_B_LEAD_SECONDS = 1.5;

// Step 4's honest-widening threshold — destinations with fewer than this
// many real trips get padded with the app's most-active real trips instead
// of shipping a thin, spell-breaking feed.
export const FEED_FALLBACK_MIN_TRIPS = 3;
