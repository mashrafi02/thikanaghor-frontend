import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <p className="text-display text-ink-muted">404</p>
      <h1 className="text-h2 text-ink">{t('state.noResults')}</h1>
      <Link to="/dashboard">
        <Button variant="primary">{t('nav.dashboard')}</Button>
      </Link>
    </div>
  );
}
