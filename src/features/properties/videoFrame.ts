/**
 * Facebook's plugin is told the size of the box it is being put in.
 *
 * Without `width`/`height` it renders at its own natural aspect and simply overflows the
 * iframe, which `overflow-hidden` then clips — a portrait Reel in a 16:9 frame loses its
 * top and bottom. Given both dimensions it fits the player to the box instead, so the
 * whole video is visible with bars at the sides. Verified against the plugin directly:
 * with no size parameters it overflowed, with `width` + `height` it fitted.
 *
 * Facebook is the only provider that needs this. YouTube and TikTok already letterbox
 * inside their own players, and neither publishes an orientation we could read anyway —
 * a Facebook video may be portrait or landscape and there is no way to know which before
 * it loads.
 *
 * The parameters are appended to the server-built URL rather than replacing it; the host
 * and `href` still come from `utils/video.ts` and are never assembled here.
 */
export function withFacebookSize(
  embedUrl: string,
  box: { width: number; height: number },
): string {
  try {
    const url = new URL(embedUrl);
    if (url.hostname !== 'www.facebook.com') return embedUrl;
    url.searchParams.set('width', String(Math.round(box.width)));
    url.searchParams.set('height', String(Math.round(box.height)));
    return url.toString();
  } catch {
    return embedUrl;
  }
}

/**
 * The account a video was posted by, read out of its own URL.
 *
 * This exists because Facebook gives us nothing else to show. It publishes no thumbnail
 * without a registered app token — confirmed three ways: its oEmbed returns no
 * `thumbnail_url` unauthenticated, its page carries no `og:image`, and there is no CDN
 * image URL anywhere in the markup. So the pre-play state cannot be a picture, and an
 * empty box is what it was.
 *
 * The page name is the one genuinely useful thing left, and it is already in the link the
 * user pasted: for a property listing that is the agent or seller who posted it, which is
 * exactly the sort of thing worth knowing before playing a clip.
 *
 * Returns null for the URL shapes that carry no name — `/watch/?v=`, `/reel/`, `fb.watch`
 * short links — rather than inventing one. The caller falls back to the video's label.
 */
export function videoSourceHandle(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const host = parsed.hostname.replace(/^(www|m|web|vm|vt)\./, '');

  if (host === 'tiktok.com') {
    // `/@handle/video/<id>` — the handle keeps its @, which is how TikTok renders it.
    const handle = segments.find((segment) => segment.startsWith('@'));
    return handle ?? null;
  }

  if (host === 'facebook.com') {
    // `/<page>/videos/<id>` is the only shape with a name in it. Anything else — a
    // numeric id, a reserved path — is not a page name and must not be shown as one.
    const videosAt = segments.indexOf('videos');
    if (videosAt <= 0) return null;

    const name = segments[videosAt - 1];
    if (!name || /^\d+$/.test(name)) return null;
    if (['watch', 'reel', 'story.php', 'permalink.php'].includes(name)) return null;

    return name;
  }

  return null;
}
