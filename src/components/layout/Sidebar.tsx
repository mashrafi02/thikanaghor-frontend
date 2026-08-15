import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { CaretLeft, CaretRight, House } from '@/lib/icons';
import { NAV_ITEMS } from './navItems';

/**
 * Desktop navigation. Hidden below 768px, where the bottom bar takes over.
 *
 * Collapsing to a 72px icon rail is a real mode, not a cosmetic one: on a 1024px laptop
 * the 240px sidebar takes a quarter of the width away from a table that wants it.
 */
export const Sidebar = memo(function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.primary')}
      className={cn(
        'hidden shrink-0 flex-col border-e border-border bg-surface md:flex',
        // Pinned to the viewport so the nav is reachable from the bottom of a long list.
        // `self-start` is the load-bearing half: as a stretched flex child the rail would
        // be exactly as tall as the scrolling container, leaving sticky nothing to move
        // within, so it would sit there looking correct and do nothing. `h-dvh` then gives
        // it a viewport-sized box rather than a content-sized one.
        'sticky top-0 z-10 h-dvh self-start',
        'transition-[width] duration-base ease-standard',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div
        className={cn('flex h-14 items-center gap-2 px-4', collapsed && 'justify-center px-0')}
      >
        <Icon icon={House} weight="fill" className="text-accent" />
        {!collapsed && <span className="text-h3 text-ink">{t('appName')}</span>}
      </div>

      {/* One landmark for the whole rail, wrapping the brand as well as the links.
          It was an <aside>, which claims "complementary content" — wrong for primary
          navigation, and it collided with the property detail's real aside. Demoting it
          to a plain <div> then left the brand outside every landmark, which axe flags as
          a `region` violation, so the <nav> moved outward rather than the wrapper
          disappearing. */}
      {/* Scrolls on its own once the rail is viewport-height: a short window, or more nav
          items later, would otherwise push the collapse button off the bottom edge with no
          way to reach it. */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium',
                'transition-colors duration-fast ease-standard',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-ink-secondary hover:bg-surface-overlay hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* fill marks the active item — the distinction DESIGN.md §9.2 reserves
                    it for. Opacity would read as "disabled" instead. */}
                <Icon icon={item.icon} weight={isActive ? 'fill' : 'regular'} />
                {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        className="m-2 flex items-center justify-center rounded-md p-2 text-ink-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-ink"
      >
        <Icon icon={collapsed ? CaretRight : CaretLeft} size="sm" />
      </button>
    </nav>
  );
});
