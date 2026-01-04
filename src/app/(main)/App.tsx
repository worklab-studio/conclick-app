'use client';
import { Loading } from '@umami/react-zen';
import Script from 'next/script';
import { UpdateNotice } from './UpdateNotice';
import { TopNav } from '@/app/(main)/TopNav';
import { useLoginQuery, useConfig, useNavigation } from '@/components/hooks';
import { useEffect } from 'react';
import { removeItem, setItem } from '@/lib/storage';
import { LAST_TEAM_CONFIG } from '@/lib/constants';

export function App({ children }) {
  const { user, isLoading, error } = useLoginQuery();
  const config = useConfig();
  const { pathname, teamId } = useNavigation();

  useEffect(() => {
    if (teamId) {
      setItem(LAST_TEAM_CONFIG, teamId);
    } else {
      removeItem(LAST_TEAM_CONFIG);
    }
  }, [teamId]);

  if (isLoading || !config) {
    return <Loading placement="absolute" />;
  }

  if (error) {
    window.location.href = `${process.env.basePath || ''}/login`;
    return null;
  }

  if (!user || !config) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!pathname.endsWith('/live') && <TopNav />}
      <main className="flex-1 w-full bg-background">
        {children}
      </main>
      <UpdateNotice user={user} config={config} />
      {process.env.NODE_ENV === 'production' && !pathname.includes('/share/') && (
        <Script src={`${process.env.basePath || ''}/telemetry.js`} />
      )}
    </div>
  );
}
