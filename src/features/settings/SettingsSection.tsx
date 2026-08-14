import { useId, type ReactNode } from 'react';
import { Icon, type IconProps } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * One block of settings.
 *
 * Exists so the page is a list of sections rather than a wall of controls, and so each
 * one is a labelled landmark — a settings page is exactly the kind of screen where a
 * screen reader user wants to jump between headings rather than tab through everything.
 */
export function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: IconProps['icon'];
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm md:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-ink-secondary">
            <Icon icon={icon} size="sm" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-h3 text-ink">
            {title}
          </h2>
          {description && <p className="text-body-sm text-ink-secondary">{description}</p>}
        </div>
      </div>

      {children}
    </section>
  );
}

/** A labelled row inside a section: description on the left, control on the right. */
export function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-t border-border pt-4',
        // Side by side once there is room; stacked on a phone, where a control squeezed
        // beside its own label is the thing that ends up too small to hit.
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-body font-medium text-ink">{label}</span>
        {hint && <span className="text-body-sm text-ink-secondary">{hint}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
