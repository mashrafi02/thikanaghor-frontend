import { Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ArrowClockwise, CloudSlash, X } from '@/lib/icons';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'tg.sidebarCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * The authenticated layout.
 *
 * Sidebar on desktop, bottom tabs on mobile, sticky topbar on both. The main region
 * carries `min-w-0` because it is a flex child: without it a wide table or chart inside
 * would widen the flex track instead of scrolling within its own container, and push the
 * page sideways.
 */
export function AppShell() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  // Registered here rather than in main.tsx so the prompt has somewhere to render, and
  // so it registers exactly once for the whole authenticated app.
  const { needsRefresh, update, dismiss } = useAppUpdate();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // Non-fatal; the choice just will not persist.
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={toggle} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        {!online && (
          // Sits under the topbar rather than over content: it explains why writes are
          // refused, and must not cover the data still readable from cache.
          <div
            role="status"
            className="flex items-center justify-center gap-2 bg-pending-subtle px-4 py-2 text-caption text-pending"
          >
            <Icon icon={CloudSlash} size="sm" />
            {t('state.offline')}
          </div>
        )}

        {needsRefresh && (
          // A prompt, never an automatic reload: the property form is long, and someone
          // is often part-way through typing a listing while on the phone to the seller.
          <div
            role="status"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-accent-subtle px-4 py-2 text-caption text-accent"
          >
            <span>{t('state.updateAvailable')}</span>
            <button
              type="button"
              onClick={update}
              className="inline-flex items-center gap-1 rounded-sm px-2 py-1 font-medium underline underline-offset-2 hover:bg-accent hover:text-accent-fg hover:no-underline"
            >
              <Icon icon={ArrowClockwise} size="sm" />
              {t('state.updateNow')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('action.dismiss')}
              className="rounded-sm p-1 hover:bg-accent hover:text-accent-fg"
            >
              <Icon icon={X} size="sm" />
            </button>
          </div>
        )}

        <main
          id="main"
          // pb-20 on mobile clears the fixed bottom tab bar; without it the last row of
          // every list sits underneath it and cannot be tapped.
          className="mx-auto w-full max-w-page flex-1 px-4 pb-20 pt-4 md:px-8 md:pb-8 md:pt-6"
        >
          <Suspense fallback={<div className="h-64" aria-busy="true" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomTabs />
    </div>
  );
}
