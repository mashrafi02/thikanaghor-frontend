import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
  EmptyState,
  ErrorState,
  NoResultsState,
  OfflineState,
} from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Rail, RailItem } from '@/components/ui/Rail';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { BuyerStatusPill, StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/toast/ToastContext';
import { PROPERTY_STATUSES } from '@/app/api/types';
import { useFormat } from '@/hooks/useFormat';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import {
  Buildings,
  FacebookLogo,
  House,
  Kanban,
  Phone,
  Plus,
  TiktokLogo,
  Trash,
  Users,
  WhatsappLogo,
  YoutubeLogo,
} from '@/lib/icons';

/**
 * Design sandbox — development only, mounted at /_design.
 *
 * Renders the token layer against real components: both themes, both languages, every
 * formatter, the icon scale, and a mixed Bangla/Latin line for checking how the two
 * faces sit together. Kept past F1 because F3 builds the UI primitives against it, and
 * because a token change is far easier to judge here than by hunting through screens.
 *
 * Excluded from the production bundle by the `import.meta.env.DEV` guard in router.tsx.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-md border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-h3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="min-w-0 shrink text-body-sm text-ink-muted">{label}</span>
      <span className="tabular shrink-0 text-body font-medium text-ink">{value}</span>
    </div>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-sm border border-border', className)} />
      <span className="text-body-sm text-ink-secondary">{name}</span>
    </div>
  );
}

export function DesignSandbox() {
  const { t } = useTranslation();
  const format = useFormat();
  const { resolved } = useTheme();
  const toast = useToast();

  return (
    <div>
      <main className="grid gap-6 md:grid-cols-2">
        {/* ── the reason this page exists ── */}
        <Section title="Mixed-script check">
          <p className="mb-3 text-body-sm text-ink-muted">
            Both faces on one line, at body size. Watch the baseline and x-height.
          </p>
          <p className="text-body text-ink">
            বসুন্ধরা R/A-তে ৫ কাঠা জমি — Plot 42, Block C, ৳ ৫০ লক্ষ
          </p>
          <p className="mt-2 text-body text-ink">
            Uttara Sector 7 · উত্তরা সেক্টর ৭ · 1,400 sq ft · ১,৪০০ বর্গফুট
          </p>
          <p className="mt-4 text-h1 text-ink">ঠিকানাঘর ThikanaGhor</p>
        </Section>

        <Section title="Type scale">
          <div className="space-y-2">
            <p className="text-display text-ink">৳ ১,২০,০০০</p>
            <p className="text-h1 text-ink">Heading one · শিরোনাম</p>
            <p className="text-h2 text-ink">Heading two · উপশিরোনাম</p>
            <p className="text-h3 text-ink">Heading three</p>
            <p className="text-body text-ink-secondary">
              Body copy at fifteen pixels. বডি টেক্সট পনেরো পিক্সেলে।
            </p>
            <p className="text-body-sm text-ink-secondary">Small body · ছোট টেক্সট</p>
            <p className="text-caption uppercase tracking-wide text-ink-muted">
              Caption label
            </p>
          </div>
        </Section>

        <Section title="Formatting">
          <Row label="money" value={format.money('5000000.00')} />
          <Row label="moneyShort (lakh)" value={format.moneyShort('5000000')} />
          <Row label="moneyShort (crore)" value={format.moneyShort('12000000')} />
          <Row label="number" value={format.number(1234567)} />
          <Row label="percent" value={format.percent(66.7)} />
          <Row label="delta +" value={format.delta(50)} />
          <Row label="delta −" value={format.delta(-12.5)} />
          <Row label="delta null" value={format.delta(null)} />
          <Row label="area" value={format.areaWithSqft(5, 'KATHA', '3600.00')} />
          <Row label="date" value={format.date('2026-08-13')} />
          <Row label="month" value={format.month('2026-08')} />
          <Row label="relative" value={format.relative('2026-08-10T12:00:00Z')} />
        </Section>

        <Section title="Semantic colour">
          <div className="space-y-3">
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="won / received" className="bg-won" />
            <Swatch name="active" className="bg-active" />
            <Swatch name="pending" className="bg-pending" />
            <Swatch name="lost" className="bg-lost" />
            <Swatch name="on hold" className="bg-hold" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PROPERTY_STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <BuyerStatusPill status="ACTIVE" />
            <BuyerStatusPill status="MATCHED" />
            <BuyerStatusPill status="CLOSED" />
          </div>
        </Section>

        <Section title="Surfaces">
          <div className="space-y-2">
            <div className="rounded-sm bg-canvas p-3 text-body-sm text-ink-secondary">
              canvas
            </div>
            <div className="rounded-sm bg-surface p-3 text-body-sm text-ink-secondary">
              surface
            </div>
            <div className="rounded-sm bg-surface-raised p-3 text-body-sm text-ink-secondary">
              surface-raised
            </div>
            <div className="rounded-sm bg-surface-sunken p-3 text-body-sm text-ink-secondary">
              surface-sunken
            </div>
            <div className="rounded-sm bg-surface-overlay p-3 text-body-sm text-ink-secondary">
              surface-overlay
            </div>
          </div>
          <p className="mt-3 text-body-sm text-ink-muted">
            Resolved theme: <span className="font-medium text-ink">{resolved}</span> · shadows
            are light-mode only
          </p>
        </Section>

        <Section title="Icons">
          <div className="mb-4 flex items-center gap-4 text-ink-secondary">
            <Icon icon={House} size="sm" />
            <Icon icon={House} size="md" />
            <Icon icon={House} size="lg" />
            <span className="text-body-sm text-ink-muted">16 / 20 / 24</span>
          </div>
          <div className="mb-4 flex items-center gap-4 text-ink-secondary">
            <Icon icon={Buildings} weight="regular" />
            <Icon icon={Buildings} weight="bold" />
            <Icon icon={Buildings} weight="fill" />
            <span className="text-body-sm text-ink-muted">regular / bold / fill</span>
          </div>
          <div className="flex items-center gap-4 text-ink-secondary">
            <Icon icon={FacebookLogo} />
            <Icon icon={TiktokLogo} />
            <Icon icon={YoutubeLogo} />
            <Icon icon={WhatsappLogo} />
            <Icon icon={Phone} />
            <Icon icon={Users} />
            <Icon icon={Kanban} />
            <span className="text-body-sm text-ink-muted">brand marks Lucide lacks</span>
          </div>
        </Section>

        {/* ── swipe rail, not a carousel ── */}
        <Section title="Rail (swipe, no arrows)">
          <Rail>
            {[1, 2, 3, 4, 5].map((n) => (
              <RailItem key={n}>
                <div className="rounded-md border border-border bg-surface-sunken p-4">
                  <p className="text-caption uppercase tracking-wide text-ink-muted">
                    {t('nav.properties')} {format.count(n)}
                  </p>
                  <p className="mt-1 text-h2 text-ink">
                    {format.moneyShort(String(n * 2500000))}
                  </p>
                </div>
              </RailItem>
            ))}
          </Rail>
          <p className="mt-3 text-body-sm text-ink-muted">
            Cards at 78vw so the next one peeks — that is what tells you it scrolls.
          </p>
        </Section>
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={Plus}>
              {t('action.add')}
            </Button>
            <Button variant="secondary">{t('action.cancel')}</Button>
            <Button variant="ghost">{t('action.edit')}</Button>
            <Button variant="danger" icon={Trash}>
              {t('action.delete')}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm">sm</Button>
            <Button size="md">md</Button>
            <Button size="lg">lg</Button>
            <Button loading>loading</Button>
            <Button disabled>disabled</Button>
          </div>
          <div className="mt-4 max-w-[280px]">
            <Input label={t('auth:email')} placeholder="name@example.com" />
          </div>
          <div className="mt-3 max-w-[280px]">
            <Input label={t('auth:password')} error="এই ঘরটি পূরণ করুন" defaultValue="x" />
          </div>
        </Section>

        <Section title="Toasts">
          <p className="mb-3 text-body-sm text-ink-muted">
            Success is silent when the change is visible on screen; these are the cases where
            it is not.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                toast.success(t('state.saved'));
              }}
            >
              success
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.error('ইমেইল বা পাসওয়ার্ড সঠিক নয়');
              }}
            >
              error
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.undo('সম্পত্তি মুছে ফেলা হয়েছে', () => undefined, t('action.undo'));
              }}
            >
              undo (5s)
            </Button>
          </div>
        </Section>

        <Section title="Skeletons">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 w-full" />
            <SkeletonText lines={3} />
          </div>
        </Section>

        <Section title="Empty · no results">
          <EmptyState
            icon={Buildings}
            title={t('state.empty')}
            description={t('state.emptyHint')}
            action={{ label: t('action.add'), onClick: () => undefined }}
          />
          <div className="border-t border-border">
            <NoResultsState onClearFilters={() => undefined} />
          </div>
        </Section>

        <Section title="Error · offline">
          <ErrorState
            message="সার্ভারের সাথে সংযোগ করা যাচ্ছে না"
            onRetry={() => undefined}
            requestId="7f3c1e2a-9b44-4e51-a2d7-1c8e6b0f4a93"
          />
          <div className="mt-4 border-t border-border">
            <OfflineState onRetry={() => undefined} />
          </div>
        </Section>
      </main>
    </div>
  );
}
