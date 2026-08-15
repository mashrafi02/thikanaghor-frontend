import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/cn';
import { ArrowClockwise, CheckCircle, CloudSlash, DownloadSimple } from '@/lib/icons';
import { SettingRow, SettingsSection } from './SettingsSection';

/**
 * Installation, connection, and updates.
 *
 * The install row is the one that needs care, because there are four distinct states and
 * only one of them is "press this button":
 *
 *  • already installed — say so, offer nothing;
 *  • a prompt is available — offer it;
 *  • the browser has not offered one yet — Chrome withholds `beforeinstallprompt` until
 *    its own engagement heuristic is satisfied, and Firefox and desktop Safari never fire
 *    it at all. The copy says "not offered yet" and points at the browser menu rather
 *    than claiming the browser is incapable, which is usually false and leaves the user
 *    with nowhere to go;
 *  • installed *during* this visit — confirm it.
 *
 * A disabled "Install" button with no explanation is the usual version of this, and it
 * reads as a broken app rather than an unsupported browser.
 */
export function AppSection() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { needsRefresh, offlineReady, update } = useAppUpdate();
  const [justInstalled, setJustInstalled] = useState(false);

  const handleInstall = async () => {
    if (await promptInstall()) setJustInstalled(true);
  };

  return (
    <SettingsSection
      title={t('settings.app')}
      description={t('settings.appHint')}
      icon={DownloadSimple}
    >
      <SettingRow label={t('settings.install')} hint={t('settings.installHint')}>
        {installed || justInstalled ? (
          <span className="inline-flex items-center gap-2 text-body-sm text-won-ink">
            <Icon icon={CheckCircle} size="sm" weight="fill" />
            {t('settings.installed')}
          </span>
        ) : canInstall ? (
          <Button variant="primary" icon={DownloadSimple} onClick={() => void handleInstall()}>
            {t('settings.installAction')}
          </Button>
        ) : (
          <span className="text-body-sm text-ink-muted">
            {t('settings.installUnavailable')}
          </span>
        )}
      </SettingRow>

      <SettingRow label={t('settings.connection')} hint={t('settings.connectionHint')}>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-body-sm',
            online ? 'bg-won-subtle text-won-ink' : 'bg-pending-subtle text-pending-ink',
          )}
        >
          <Icon icon={online ? CheckCircle : CloudSlash} size="sm" />
          {online ? t('settings.online') : t('state.offline')}
        </span>
      </SettingRow>

      <SettingRow label={t('settings.version')} hint={t('settings.versionHint')}>
        {needsRefresh ? (
          <Button variant="primary" icon={ArrowClockwise} onClick={update}>
            {t('settings.updateNow')}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 text-body-sm text-ink-secondary">
            <Icon icon={CheckCircle} size="sm" />
            {offlineReady ? t('settings.readyOffline') : t('settings.upToDate')}
          </span>
        )}
      </SettingRow>
    </SettingsSection>
  );
}
