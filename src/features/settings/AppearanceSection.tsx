import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUpdateLocaleMutation } from '@/features/auth/authApi';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { setLanguage, type Language } from '@/i18n';
import { Desktop, Moon, Sun, Translate } from '@/lib/icons';
import { useUpdateSettingsMutation } from './settingsApi';
import { SettingRow, SettingsSection } from './SettingsSection';

/**
 * Language and theme.
 *
 * Both apply instantly and neither has a Save button — there is nothing to validate, and
 * the result is visible the moment it is pressed, which is a better confirmation than a
 * toast.
 *
 * Language is written to three places, and all three matter:
 *
 *  • **i18next + `<html lang>`** (via `setLanguage`) — the actual switch, and the
 *    attribute that makes a screen reader pronounce Bangla as Bangla.
 *  • **localStorage** — so this device opens in the right language before any request.
 *  • **the server** — so a *new* device does too, and so exports and any future
 *    server-rendered text agree with the UI.
 *
 * The server write is deliberately fire-and-forget: the language has already changed
 * locally, and failing to persist a preference is not worth an error dialog over.
 */
export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const [updateLocale] = useUpdateLocaleMutation();
  const [updateSettings] = useUpdateSettingsMutation();

  const language: Language = i18n.language === 'en' ? 'en' : 'bn';

  const handleLanguage = (next: Language) => {
    setLanguage(next);
    void updateLocale({ locale: next });
    void updateSettings({ locale: next });
  };

  return (
    <SettingsSection
      title={t('settings.appearance')}
      description={t('settings.appearanceHint')}
      icon={Translate}
    >
      <SettingRow label={t('settings.language')} hint={t('settings.languageHint')}>
        <SegmentedControl
          label={t('common:language.label')}
          value={language}
          onChange={handleLanguage}
          options={[
            { value: 'bn', label: t('common:language.bn') },
            { value: 'en', label: t('common:language.en') },
          ]}
        />
      </SettingRow>

      <SettingRow label={t('settings.theme')} hint={t('settings.themeHint')}>
        <SegmentedControl
          label={t('common:theme.label')}
          value={preference}
          onChange={(value: ThemePreference) => {
            setPreference(value);
          }}
          options={[
            { value: 'light', label: t('theme.light'), icon: Sun },
            { value: 'dark', label: t('theme.dark'), icon: Moon },
            // "System" is a real third choice, not the absence of one: it keeps tracking
            // the OS at sunset instead of freezing on whatever it resolved to first.
            { value: 'system', label: t('theme.system'), icon: Desktop },
          ]}
        />
      </SettingRow>
    </SettingsSection>
  );
}
