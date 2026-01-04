'use client';
import { useMessages } from '@/components/hooks';
import { PreferenceSettings } from './PreferenceSettings';

export function PreferencesPage() {
  const { formatMessage, labels } = useMessages();

  return (
    <div className="space-y-6">
      <PreferenceSettings />
    </div>
  );
}
