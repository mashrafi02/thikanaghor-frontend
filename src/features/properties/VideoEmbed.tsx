import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useGetVideoThumbnailQuery } from './propertyApi';
import { videoSourceHandle, withFacebookSize } from './videoFrame';
import { ArrowSquareOut, FacebookLogo, Play, TiktokLogo, YoutubeLogo } from '@/lib/icons';
import type { PropertyVideo } from './types';

/**
 * A property's video, in an iframe.
 *
 * Two decisions here matter more than the styling:
 *
 * **1. The iframe is not mounted until the poster is clicked.** A property can carry
 * several clips, and three provider embeds loading at once pulls in three separate
 * third-party script bundles — slow on a phone, and on a metered connection it spends
 * the user's data on videos they may never play.
 *
 * **2. The "open on <provider>" link is always visible, not a fallback shown on error.**
 * Facebook and TikTok only embed *public* posts, and a great many property listings sit
 * in private groups. There is no reliable way to detect that failure from outside the
 * iframe — no load event fires for "the provider refused" — so the escape hatch has to
 * be permanent rather than conditional. Hiding it until something detectably breaks
 * would mean it is missing exactly when it is needed.
 *
 * `embedUrl` is built server-side from an allow-listed host (backend `utils/video.ts`).
 * It is never constructed here, and a client-supplied one is never accepted.
 */

const PROVIDER_META = {
  FACEBOOK: { icon: FacebookLogo, labelKey: 'enums:videoProvider.FACEBOOK' },
  TIKTOK: { icon: TiktokLogo, labelKey: 'enums:videoProvider.TIKTOK' },
  YOUTUBE: { icon: YoutubeLogo, labelKey: 'enums:videoProvider.YOUTUBE' },
} as const;

/** TikTok's embed is a portrait card; the others are 16:9. Using one ratio for both
 *  either letterboxes the vertical video or crops it. */
const ASPECT = {
  FACEBOOK: 'aspect-video',
  YOUTUBE: 'aspect-video',
  TIKTOK: 'aspect-[9/16] max-h-[70dvh]',
} as const;

export const VideoEmbed = memo(function VideoEmbed({ video }: { video: PropertyVideo }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const meta = PROVIDER_META[video.provider];
  const providerName = t(meta.labelKey);

  // TikTok is the only provider whose poster needs a request; YouTube's arrives on the
  // property and Facebook has none, so both skip it rather than asking for a known 204.
  const { data: fetched } = useGetVideoThumbnailQuery(video.id, {
    skip: video.provider !== 'TIKTOK',
  });
  const poster = video.thumbnailUrl ?? fetched?.thumbnailUrl ?? null;
  // Only consulted when there is no poster — which in practice means Facebook.
  const handle = videoSourceHandle(video.url);

  // Measured before paint so the Facebook src is right on its first load — reading it
  // after would mean swapping the iframe's src and reloading the player.
  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0)
        setBox({ width: rect.width, height: rect.height });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const frameSrc =
    video.provider === 'FACEBOOK' && box
      ? withFacebookSize(video.embedUrl, box)
      : video.embedUrl;

  return (
    <figure className="flex flex-col gap-2">
      <div
        ref={frameRef}
        className={cn(
          'relative w-full overflow-hidden rounded-md border border-border bg-surface-sunken',
          ASPECT[video.provider],
        )}
      >
        {playing ? (
          <iframe
            src={frameSrc}
            title={video.label ?? `${providerName} — ${t('property.video')}`}
            className="absolute inset-0 size-full"
            // No sandbox: these providers need scripts and same-origin to function, and
            // `allow-scripts allow-same-origin` together is no stronger than omitting it.
            // The real control is the host allow-list applied when embedUrl was built,
            // plus the frontend CSP's frame-src.
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
            }}
            className={cn(
              'group absolute inset-0 flex flex-col items-center justify-center gap-3',
              'transition-colors duration-fast',
              poster ? 'text-white' : 'text-ink-secondary hover:bg-surface-overlay',
            )}
          >
            {poster && (
              <>
                <img
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  // `contain`, not `cover`: the poster's aspect need not match the frame,
                  // and cropping the preview would misrepresent the video the same way
                  // the old iframe did.
                  className="absolute inset-0 size-full object-contain"
                  // A poster that 404s must leave the plain placeholder behind, not a
                  // broken-image icon.
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
                {/* Scrim: the play button and provider name have to stay legible over an
                    arbitrary frame of someone's video. */}
                <span aria-hidden="true" className="absolute inset-0 bg-black/35" />
              </>
            )}

            {/* Facebook publishes no thumbnail without an app token, so its frame can
                never be a picture. Rather than leave an empty box it shows what is
                actually known about the clip — what the video is of, and who posted it —
                both from data already held, with no request and nothing invented.

                Deliberately text and no watermark: a giant tinted logo behind the play
                button is decoration, which DESIGN.md §2 rules out, and it muddied the
                one control the frame exists to offer. */}
            <span className="relative flex size-14 items-center justify-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-border">
              <Icon icon={Play} size="lg" weight="fill" />
            </span>

            <span className="relative flex max-w-[80%] flex-col items-center gap-1 text-center">
              {video.label && !poster && (
                <span className="text-body font-medium text-ink">{video.label}</span>
              )}
              <span className="flex items-center gap-2 text-body-sm">
                <Icon icon={meta.icon} size="sm" />
                {handle && !poster ? handle : providerName}
              </span>
              {!poster && (
                <span className="text-caption text-ink-muted">{t('property.tapToPlay')}</span>
              )}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {video.label ? (
          <figcaption className="min-w-0 truncate text-body-sm text-ink-secondary">
            {video.label}
          </figcaption>
        ) : (
          <span />
        )}

        {/* Permanent, not conditional. See the note above about private posts. */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 coarse:min-h-11 text-body-sm text-accent transition-colors duration-fast hover:text-accent-hover"
        >
          {t('property.openOn', { provider: providerName })}
          <Icon icon={ArrowSquareOut} size="sm" />
        </a>
      </div>
    </figure>
  );
});

/** Several clips: one player plus a thumbnail strip, rather than stacked players. */
export function VideoGallery({ videos }: { videos: PropertyVideo[] }) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = videos[activeIndex];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-3">
      <VideoEmbed key={active.id} video={active} />

      {videos.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('property.videos')}>
          {videos.map((video, index) => {
            const meta = PROVIDER_META[video.provider];
            return (
              <button
                key={video.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                onClick={() => {
                  setActiveIndex(index);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-sm border px-3 py-2 text-body-sm',
                  'transition-colors duration-fast ease-standard',
                  index === activeIndex
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border text-ink-secondary hover:border-border-strong',
                )}
              >
                <Icon icon={meta.icon} size="sm" />
                {video.label ?? `${t('property.video')} ${String(index + 1)}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
