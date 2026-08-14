import { describe, expect, it } from 'vitest';
import { videoSourceHandle, withFacebookSize } from '../src/features/properties/videoFrame';

/**
 * Telling Facebook's plugin how big its box is.
 *
 * Without `width`/`height` the plugin renders at the video's own aspect and overflows the
 * iframe, which `overflow-hidden` then clips — a portrait Reel in a 16:9 frame loses its
 * top and bottom. With both, it fits the player to the box and nothing is cut off.
 *
 * The host check is the part worth protecting. This function appends parameters to a URL
 * the *server* built from an allow-listed host; blindly decorating any string would turn
 * a helper into a way of reaching an arbitrary origin from an iframe src.
 */

const FB =
  'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fx%2Fvideos%2F1%2F&show_text=false';

describe('withFacebookSize', () => {
  it('adds the measured box to a Facebook plugin URL', () => {
    const url = new URL(withFacebookSize(FB, { width: 468, height: 263 }));

    expect(url.searchParams.get('width')).toBe('468');
    expect(url.searchParams.get('height')).toBe('263');
    // The parameters the server set must survive untouched.
    expect(url.searchParams.get('show_text')).toBe('false');
    expect(url.searchParams.get('href')).toBe('https://www.facebook.com/x/videos/1/');
  });

  it('rounds to whole pixels', () => {
    // getBoundingClientRect returns fractions; Facebook expects integers.
    const url = new URL(withFacebookSize(FB, { width: 468.4, height: 263.6 }));
    expect(url.searchParams.get('width')).toBe('468');
    expect(url.searchParams.get('height')).toBe('264');
  });

  it('leaves every other host alone', () => {
    // YouTube and TikTok letterbox inside their own players and need no help; more to the
    // point, this must never be a way to decorate an arbitrary URL.
    for (const url of [
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.tiktok.com/embed/v2/6718335390845095173',
      'https://evil.test/plugins/video.php',
      'https://facebook.com.evil.test/plugins/video.php',
    ]) {
      expect(withFacebookSize(url, { width: 468, height: 263 }), url).toBe(url);
    }
  });

  it('returns the input unchanged when it is not a URL', () => {
    expect(withFacebookSize('not a url', { width: 1, height: 1 })).toBe('not a url');
    expect(withFacebookSize('', { width: 1, height: 1 })).toBe('');
  });
});

describe('videoSourceHandle', () => {
  it('reads the page name out of a Facebook video URL', () => {
    // The one useful thing left for Facebook: who posted it. For a property listing that
    // is the agent or seller, and it is already in the pasted link.
    expect(
      videoSourceHandle('https://www.facebook.com/BashundharaProperties/videos/123456/'),
    ).toBe('BashundharaProperties');
    expect(
      videoSourceHandle('https://m.facebook.com/facebook/videos/10153231379946729/'),
    ).toBe('facebook');
  });

  it('reads the @handle out of a TikTok URL', () => {
    expect(
      videoSourceHandle('https://www.tiktok.com/@scout2015/video/6718335390845095173'),
    ).toBe('@scout2015');
  });

  it('returns null for the shapes that carry no name', () => {
    // Inventing a handle would be worse than showing none — these URLs genuinely do not
    // identify a page, so the caller falls back to the video's label.
    for (const url of [
      'https://www.facebook.com/watch/?v=123456',
      'https://www.facebook.com/reel/10153231379946729/',
      'https://fb.watch/abc123/',
      'https://www.facebook.com/12345678/videos/999/',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'not a url',
      '',
    ]) {
      expect(videoSourceHandle(url), url).toBeNull();
    }
  });
});
