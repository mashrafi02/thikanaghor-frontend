import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery } from '@/features/auth/authApi';
import { AppearanceSection } from './AppearanceSection';
import { AppSection } from './AppSection';
import { CommissionSection } from './CommissionSection';
import { SecuritySection } from './SecuritySection';

/**
 * Settings.
 *
 * Ordered by how often each thing is touched, not by importance: language and theme get
 * changed casually, the commission default once in a while, the password rarely, and the
 * install button once ever. Putting security at the top because it *sounds* important
 * would bury the two controls actually used.
 *
 * Deliberately one column at every width. A settings page in two columns makes the eye
 * hunt for which side a control is on, and there is nothing here wide enough to need it.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const { data: user } = useGetMeQuery();

  useEffect(() => {
    document.title = `${t('nav.settings')} · ${t('appName')}`;
  }, [t]);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">{t('nav.settings')}</h1>
        {user && (
          <p className="text-body-sm text-ink-secondary">
            {t('settings.signedInAs', { name: user.name, email: user.email })}
          </p>
        )}
      </header>

      <AppearanceSection />
      <CommissionSection />
      <SecuritySection />
      <AppSection />
    </div>
  );
}
