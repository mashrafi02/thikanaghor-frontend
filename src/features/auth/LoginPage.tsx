import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { useApiError } from '@/hooks/useApiError';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { setLanguage, type Language } from '@/i18n';
import { cn } from '@/lib/cn';
import { House, Moon, Sun, Warning } from '@/lib/icons';
import { useTheme } from '@/hooks/useTheme';
import { useGetCsrfTokenQuery, useLoginMutation } from './authApi';

/**
 * Sign-in.
 *
 * The CSRF token is fetched here rather than at app boot: this is the first screen an
 * unauthenticated visitor reaches, and login is itself a mutation that needs one.
 */
export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resolved, setPreference } = useTheme();
  const resolveError = useApiError();
  const status = useAppSelector((state) => state.auth.status);

  useGetCsrfTokenQuery();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const next = searchParams.get('next');

  useEffect(() => {
    document.title = `${t('auth:signIn')} · ${t('common:appName')}`;
  }, [t]);

  if (status === 'authenticated') {
    return <Navigate to={next && next.startsWith('/') ? next : '/dashboard'} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    try {
      await login({ email, password }).unwrap();
      void navigate(next && next.startsWith('/') ? next : '/dashboard', { replace: true });
    } catch (error) {
      const resolved = resolveError(error);

      // A 400 with `details` is a field problem — it belongs on the field, not in a
      // banner (FRONTEND.md §10.5.4).
      if (resolved.details) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(resolved.details)) {
          if (messages[0]) mapped[field] = messages[0];
        }
        setFieldErrors(mapped);
        return;
      }

      // Already translated from the server's error code — Bangla when the UI is
      // Bangla, which is the whole point of the code contract.
      setFormError(resolved.text);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Icon icon={House} weight="fill" className="text-accent" />
          <span className="text-h3 text-ink">{t('common:appName')}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-border p-px">
            {(['bn', 'en'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  'rounded-sm px-3 py-1 text-caption transition-colors duration-fast',
                  i18n.language === lang
                    ? 'bg-accent text-accent-fg'
                    : 'text-ink-secondary hover:text-ink',
                )}
              >
                {t(`common:language.${lang}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={t('common:theme.label')}
            className="rounded-sm border border-border p-2 text-ink-secondary transition-colors duration-fast hover:text-ink"
          >
            <Icon icon={resolved === 'dark' ? Sun : Moon} size="sm" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-h1 text-ink">{t('auth:signIn')}</h1>
          <p className="mt-2 text-body text-ink-secondary">{t('auth:signInSubtitle')}</p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-8 flex flex-col gap-4"
            noValidate
          >
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-sm border border-lost bg-lost-subtle p-3 text-body-sm text-lost"
              >
                <Icon icon={Warning} size="sm" className="mt-px" />
                <span>{formError}</span>
              </div>
            )}

            <Input
              label={t('auth:email')}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              inputMode="email"
              autoFocus
              required
              {...(fieldErrors['email'] ? { error: fieldErrors['email'] } : {})}
            />

            <Input
              label={t('auth:password')}
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              {...(fieldErrors['password'] ? { error: fieldErrors['password'] } : {})}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
              {t('auth:signIn')}
            </Button>
          </form>

          <p className="mt-6 text-caption text-ink-muted">{t('auth:singleUserNote')}</p>
        </div>
      </main>
    </div>
  );
}
