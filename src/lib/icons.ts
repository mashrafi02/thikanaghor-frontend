/**
 * The app's icon vocabulary — DESIGN.md §9.3.
 *
 * Every icon used anywhere is re-exported here, for two reasons:
 *
 *  1. **Tree-shaking.** @phosphor-icons/react holds ~9,000 icons and only shakes out
 *     with per-icon imports. A namespace import (`import * as Icons`) ships all of
 *     them. One file makes that rule enforceable and auditable.
 *  2. **One name per concept.** Importing from Phosphor directly at each call site is
 *     how "delete" ends up as Trash in one place and TrashSimple in another. The
 *     semantic aliases below are the app's vocabulary; the Phosphor name is an
 *     implementation detail.
 */
export {
  // navigation
  House,
  Buildings,
  Users,
  Kanban,
  Gear,
  // property types
  MapTrifold,
  Storefront,
  // money
  CurrencyDollar,
  Clock,
  // settings
  Percent,
  ShieldCheck,
  DeviceMobile,
  DownloadSimple,
  // dashboard
  TrendUp,
  TrendDown,
  Handshake,
  ChartLineUp,
  Target,
  // contact
  Phone,
  WhatsappLogo,
  Copy,
  // list controls
  MagnifyingGlass,
  FunnelSimple,
  ArrowsDownUp,
  CaretDown,
  CaretRight,
  CaretLeft,
  // status
  CheckCircle,
  XCircle,
  PauseCircle,
  Warning,
  Info,
  // brand marks — the reason this app is on Phosphor rather than Lucide
  FacebookLogo,
  TiktokLogo,
  YoutubeLogo,
  // chrome
  Translate,
  Sun,
  Moon,
  Desktop,
  Plus,
  PencilSimple,
  Trash,
  X,
  SignOut,
  CloudSlash,
  ArrowClockwise,
  Play,
  ArrowSquareOut,
  List,
  DotsThree,
} from '@phosphor-icons/react';

export type { Icon as PhosphorIcon } from '@phosphor-icons/react';
