import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './navItems';

/**
 * Mobile navigation — the confirmed choice over a hamburger drawer (DESIGN.md §14).
 *
 * The reasoning: this app is used standing in front of a plot, one-handed. A bottom bar
 * puts every destination inside thumb reach and costs zero taps; a drawer costs one tap
 * and puts the trigger in the hardest corner of the screen to reach.
 */
export const BottomTabs = memo(function BottomTabs() {
  const { t } = useTranslation();

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden',
        // Keeps the bar clear of the iOS home indicator.
        'pb-[env(safe-area-inset-bottom)]',
      )}
      aria-label={t('nav.primary')}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              // min-h-14 keeps every tab above the 44px touch minimum.
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2',
              'transition-colors duration-fast ease-standard',
              isActive ? 'text-accent' : 'text-ink-muted',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon icon={item.icon} size="lg" weight={isActive ? 'fill' : 'regular'} />
              {/* Labels stay visible rather than icon-only: five unlabelled glyphs is a
                  memory test, and this user opens the app a few times a day. */}
              <span className="text-[11px] leading-none">{t(item.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
});
