import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast/ToastContext';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import {
  useChangePasswordMutation,
  useGetSessionsQuery,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
} from '@/features/auth/authApi';
import { cn } from '@/lib/cn';
import { DeviceMobile, ShieldCheck, Warning } from '@/lib/icons';
import { SettingRow, SettingsSection } from './SettingsSection';

/**
 * Password and signed-in devices.
 *
 * The session list is the part that earns its place. For a single-person app the useful
 * question is not "who has access" but "is there a session here I do not recognise" —
 * so every session shows where and when it was last used, the current one is marked, and
 * revoking any other one is a single press.
 */
export function SecuritySection() {
  const { t } = useTranslation();
  const format = useFormat();
  const toast = useToast();
  const resolveError = useApiError();

  const { data: sessions, isLoading } = useGetSessionsQuery();
  const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
  const [revokeOthers, { isLoading: isRevokingAll }] = useRevokeOtherSessionsMutation();

  const [passwordOpen, setPasswordOpen] = useState(false);

  const otherCount = (sessions ?? []).filter((session) => !session.isCurrent).length;

  const handleRevoke = async (id: string) => {
    try {
      await revokeSession(id).unwrap();
      toast.success(t('settings.sessionRevoked'));
    } catch (caught) {
      toast.error(resolveError(caught).text);
    }
  };

  const handleRevokeAll = async () => {
    try {
      const result = await revokeOthers().unwrap();
      toast.success(
        t('settings.sessionsRevoked', {
          count: result.revokedSessions,
          value: format.count(result.revokedSessions),
        }),
      );
    } catch (caught) {
      toast.error(resolveError(caught).text);
    }
  };

  return (
    <SettingsSection
      title={t('settings.security')}
      description={t('settings.securityHint')}
      icon={ShieldCheck}
    >
      <SettingRow label={t('settings.password')} hint={t('settings.passwordHint')}>
        <Button
          variant="secondary"
          onClick={() => {
            setPasswordOpen(true);
          }}
        >
          {t('settings.changePassword')}
        </Button>
      </SettingRow>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body font-medium text-ink">{t('settings.sessions')}</span>
          {otherCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-lost-ink"
              loading={isRevokingAll}
              onClick={() => void handleRevokeAll()}
            >
              {t('settings.signOutOthers')}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-sm" />
            <Skeleton className="h-16 w-full rounded-sm" />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {(sessions ?? []).map((session) => (
              <li
                key={session.id}
                className={cn(
                  'flex items-center gap-3 rounded-sm border p-3',
                  session.isCurrent ? 'border-accent bg-accent-subtle' : 'border-border',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface text-ink-secondary">
                  <DeviceMobile size={16} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-body-sm text-ink">
                    {describeDevice(session.userAgent) || t('settings.unknownDevice')}
                    {session.isCurrent && (
                      <span className="rounded-full bg-accent px-2 py-1 text-caption text-accent-fg">
                        {t('settings.thisDevice')}
                      </span>
                    )}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {t('settings.lastUsed', { value: format.relative(session.lastUsedAt) })}
                    {session.ip ? ` · ${displayIp(session.ip)}` : ''}
                  </span>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-lost-ink"
                    disabled={isRevoking}
                    onClick={() => void handleRevoke(session.id)}
                  >
                    {t('settings.signOut')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
        }}
      />
    </SettingsSection>
  );
}

/**
 * An address a person can read.
 *
 * Node reports IPv4 clients as IPv4-mapped IPv6 — `::ffff:127.0.0.1` — whenever the
 * socket is dual-stack, which is the default and is what Render and most reverse proxies
 * produce. Showing that raw makes a familiar address look alien on the one screen whose
 * job is "do you recognise this session".
 */
function displayIp(ip: string): string {
  return ip.replace(/^::ffff:/i, '');
}

/**
 * Turns a user-agent string into something a person recognises.
 *
 * Deliberately crude. The goal is "is this the phone in my pocket or something else",
 * which needs a browser and a platform and nothing more — parsing user agents properly
 * is a losing game, and a wrong-but-specific answer is worse than a vague one here.
 */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return '';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : '';

  const platform = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(userAgent)
      ? 'iOS'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';

  return [browser, platform].filter(Boolean).join(' · ');
}

/**
 * Change password.
 *
 * The warning is not decoration: the server revokes every other session as part of the
 * change, which is the correct session-fixation defence but surprising if unannounced —
 * the user's other phone is signed out and they will not know why.
 */
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const resolveError = useApiError();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async () => {
    setErrors({});
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: t('settings.passwordMismatch') });
      return;
    }

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }).unwrap();

      reset();
      onClose();
      toast.success(
        result.signedOutSessions > 0
          ? t('settings.passwordChangedWithSessions', { count: result.signedOutSessions })
          : t('settings.passwordChanged'),
      );
    } catch (caught) {
      const resolved = resolveError(caught);
      if (resolved.details) {
        setErrors(
          Object.fromEntries(
            Object.entries(resolved.details).map(([field, messages]) => [
              field,
              messages[0] ?? '',
            ]),
          ),
        );
        return;
      }
      setFormError(resolved.text);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t('settings.changePassword')}
      disableDismiss={isLoading}
      footer={
        <>
          <Button
            variant="ghost"
            disabled={isLoading}
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('action.cancel')}
          </Button>
          <Button variant="primary" loading={isLoading} onClick={() => void handleSubmit()}>
            {t('action.save')}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-lost bg-lost-subtle p-3 text-body-sm text-lost-ink"
          >
            <Warning size={16} className="mt-px shrink-0" />
            {formError}
          </p>
        )}

        <Input
          type="password"
          label={t('settings.currentPassword')}
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
          }}
          {...(errors['currentPassword'] ? { error: errors['currentPassword'] } : {})}
        />
        <Input
          type="password"
          label={t('settings.newPassword')}
          autoComplete="new-password"
          hint={t('settings.newPasswordHint')}
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
          }}
          {...(errors['newPassword'] ? { error: errors['newPassword'] } : {})}
        />
        <Input
          type="password"
          label={t('settings.confirmPassword')}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
          }}
          {...(errors['confirmPassword'] ? { error: errors['confirmPassword'] } : {})}
        />

        <p className="flex items-start gap-2 rounded-sm bg-surface-sunken p-3 text-body-sm text-ink-secondary">
          <Warning size={16} className="mt-px shrink-0" />
          {t('settings.passwordWarning')}
        </p>
      </form>
    </Modal>
  );
}
