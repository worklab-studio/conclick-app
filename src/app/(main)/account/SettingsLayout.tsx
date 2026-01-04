'use client';
import { ReactNode } from 'react';
import { SettingsHeader } from './SettingsHeader';

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full px-3 md:px-6" style={{ maxWidth: '1320px' }}>
      <div className="mx-4 py-6">
        <SettingsHeader />
        {children}
      </div>
    </div>
  );
}
