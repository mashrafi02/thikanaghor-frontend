import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { setLanguage, type Language } from '@/i18n';
import { cn } from '@/lib/cn';
import { House, MagnifyingGlass, Moon, SignOut, Sun, Translate } from '@/lib/icons';
import { useGetMeQuery, useLogoutMutation } from '@/features/auth/authApi';

/**
 * Sticky topbar: identity on mobile, then search, language, theme and sign-out.
 *
 * The app mark only appears below 768px — above that the sidebar already carries it,
 * and repeating it wastes the row.
 */
export const Topbar = memo(function Topbar() {
  const { t, i18n } = useTranslation(['common', 'auth']);
  const { resolved, setPreference } = useTheme();
  const { data: user } = useGetMeQuery();
  const [logout, { isLoading: signingOut }] = useLogoutMutation();

  const nextLanguage: Language = i18n.language === 'bn' ? 'en' : 'bn';

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="flex items-center gap-2 md:hidden">
          <Icon icon={House} weight="fill" className="text-accent" />
          <span className="text-h3 text-ink">{t('common:appName')}</span>
        </div>

        {/* Placeholder until F4 wires global search. Kept in the layout now so the
            topbar's proportions are settled before content lands in it. */}
        <div className="ms-auto hidden min-w-0 flex-1 items-center md:flex md:max-w-[420px]">
          <div className="flex h-9 w-full items-center gap-2 rounded-sm border border-border bg-surface-sunken px-3 text-ink-muted">
            <Icon icon={MagnifyingGlass} size="sm" />
            <span className="truncate text-body-sm">{t('common:action.search')}</span>
          </div>
        </div>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <button
            type="button"
            onClick={() => setLanguage(nextLanguage)}
            aria-label={t('common:language.label')}
            title={t(`common:language.${nextLanguage}`)}
            className="flex min-h-11 items-center gap-1 rounded-md px-2 py-2 text-ink-secondary transition-colors duration-fast hover:bg-surface-overlay hover:text-ink"
          >
            <Icon icon={Translate} size="sm" />
            <span className="text-caption">{t(`common:language.${nextLanguage}`)}</span>
          </button>

          <button
            type="button"
            onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={t('common:theme.label')}
            className="min-h-11 min-w-11 rounded-md p-2 text-ink-secondary transition-colors duration-fast hover:bg-surface-overlay hover:text-ink"
          >
            <Icon icon={resolved === 'dark' ? Sun : Moon} size="sm" />
          </button>

          {/* Rendered even before `user` arrives, with the width reserved. Letting the
              name pop in shifted every control beside it once getMe resolved. */}
          <div className="ms-1 hidden min-w-[120px] items-center gap-2 border-s border-border ps-3 sm:flex">
            <span className="max-w-[140px] truncate text-body-sm text-ink-secondary">
              {user?.name ?? ''}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            disabled={signingOut}
            aria-label={t('auth:signOut')}
            className={cn(
              'min-h-11 min-w-11 rounded-md p-2 text-ink-secondary transition-colors duration-fast',
              'flex items-center justify-center',
              'hover:bg-surface-overlay hover:text-lost disabled:opacity-50',
            )}
          >
            <Icon icon={SignOut} size="sm" />
          </button>
        </div>
      </div>
    </header>
  );
});
