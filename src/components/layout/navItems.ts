import { Buildings, Gear, House, Kanban, Users, type PhosphorIcon } from '@/lib/icons';

/**
 * The five destinations, defined once.
 *
 * Shared by the desktop sidebar, the icon rail and the mobile bottom bar so they can
 * never disagree — and so "five items" stays a real constraint rather than something
 * that quietly becomes six because one surface got an extra entry.
 */
export interface NavItem {
  to: string;
  icon: PhosphorIcon;
  /** Key inside the `common` namespace. */
  labelKey: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: House, labelKey: 'nav.dashboard' },
  { to: '/properties', icon: Buildings, labelKey: 'nav.properties' },
  { to: '/buyers', icon: Users, labelKey: 'nav.buyers' },
  { to: '/pipeline', icon: Kanban, labelKey: 'nav.pipeline' },
  { to: '/settings', icon: Gear, labelKey: 'nav.settings' },
];
