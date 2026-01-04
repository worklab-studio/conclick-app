import { useMemo, useState } from 'react';
import { FixedSizeList } from 'react-window';
import { SearchField, Text, Column, Row, IconLabel, Heading } from '@umami/react-zen';
import Link from 'next/link';
import { useFormat } from '@/components//hooks/useFormat';
import { Empty } from '@/components/common/Empty';
import { FilterButtons } from '@/components/input/FilterButtons';
import {
  useCountryNames,
  useLocale,
  useMessages,
  useMobile,
  useNavigation,
  useTimezone,
  useWebsite,
} from '@/components/hooks';
import { Eye, User } from '@/components/icons';
import { Lightning } from '@/components/svg';
import { BROWSERS, OS_NAMES } from '@/lib/constants';
import { SessionModal } from '@/app/(main)/websites/[websiteId]/sessions/SessionModal';
import { Avatar } from '@/components/common/Avatar';

const TYPE_ALL = 'all';
const TYPE_PAGEVIEW = 'pageview';
const TYPE_SESSION = 'session';
const TYPE_EVENT = 'event';

const icons = {
  [TYPE_PAGEVIEW]: <Eye />,
  [TYPE_SESSION]: <User />,
  [TYPE_EVENT]: <Lightning />,
};

export function RealtimeLog({ data }: { data: any }) {
  const website = useWebsite();
  const [search, setSearch] = useState('');
  const { formatMessage, labels, messages, FormattedMessage } = useMessages();
  const { formatValue } = useFormat();
  const { locale } = useLocale();
  const { formatTimezoneDate } = useTimezone();
  const { countryNames } = useCountryNames(locale);
  const [filter, setFilter] = useState(TYPE_ALL);
  const { updateParams } = useNavigation();
  const { isPhone } = useMobile();

  const buttons = [
    {
      label: formatMessage(labels.all),
      id: TYPE_ALL,
    },
    {
      label: formatMessage(labels.views),
      id: TYPE_PAGEVIEW,
    },
    {
      label: formatMessage(labels.visitors),
      id: TYPE_SESSION,
    },
    {
      label: formatMessage(labels.events),
      id: TYPE_EVENT,
    },
  ];

  const getTime = ({ createdAt, firstAt }) => formatTimezoneDate(firstAt || createdAt, 'pp');

  const getIcon = ({ __type }) => icons[__type];

  const getDetail = (log: {
    __type: string;
    eventName: string;
    urlPath: string;
    browser: string;
    os: string;
    country: string;
    device: string;
  }) => {
    const { __type, eventName, urlPath, browser, os, country, device } = log;

    if (__type === TYPE_EVENT) {
      return (
        <FormattedMessage
          {...messages.eventLog}
          values={{
            event: <b key="b">{eventName || formatMessage(labels.unknown)}</b>,
            url: (
              <a
                key="a"
                href={`//${website?.domain}${urlPath}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {urlPath}
              </a>
            ),
          }}
        />
      );
    }

    if (__type === TYPE_PAGEVIEW) {
      return (
        <a href={`//${website?.domain}${urlPath}`} target="_blank" rel="noreferrer noopener">
          {urlPath}
        </a>
      );
    }

    if (__type === TYPE_SESSION) {
      return (
        <FormattedMessage
          {...messages.visitorLog}
          values={{
            country: <b key="country">{countryNames[country] || formatMessage(labels.unknown)}</b>,
            browser: <b key="browser">{BROWSERS[browser]}</b>,
            os: <b key="os">{OS_NAMES[os] || os}</b>,
            device: <b key="device">{formatMessage(labels[device] || labels.unknown)}</b>,
          }}
        />
      );
    }
  };

  const TableRow = ({ index, style }) => {
    const row = logs[index];
    return (
      <div className="flex items-center gap-4 px-4 hover:bg-zinc-100 dark:hover:bg-[#18181b] transition-colors" style={style}>
        <div className="min-w-[30px]">
          <Link href={updateParams({ session: row.sessionId })}>
            <Avatar seed={row.sessionId} size={32} />
          </Link>
        </div>
        <div className="min-w-[100px] text-sm text-muted-foreground">
          {getTime(row)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{getIcon(row)}</div>
            <div className="truncate text-sm" style={{ maxWidth: isPhone ? '400px' : undefined }}>
              {getDetail(row)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const logs = useMemo(() => {
    if (!data) {
      return [];
    }

    let logs = data.events;

    if (search) {
      logs = logs.filter(({ eventName, urlPath, browser, os, country, device }) => {
        return [
          eventName,
          urlPath,
          os,
          formatValue(browser, 'browser'),
          formatValue(country, 'country'),
          formatValue(device, 'device'),
        ]
          .filter(n => n)
          .map(n => n.toLowerCase())
          .join('')
          .includes(search.toLowerCase());
      });
    }

    if (filter !== TYPE_ALL) {
      return logs.filter(({ __type }) => __type === filter);
    }

    return logs;
  }, [data, filter, formatValue, search]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{formatMessage(labels.activity)}</h2>
      {isPhone ? (
        <>
          <div className="mb-2">
            <SearchField value={search} onSearch={setSearch} />
          </div>
          <div className="mb-2">
            <FilterButtons items={buttons} value={filter} onChange={setFilter} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <SearchField value={search} onSearch={setSearch} />
          <FilterButtons items={buttons} value={filter} onChange={setFilter} />
        </div>
      )}

      <div className="min-h-[500px]">
        {logs?.length === 0 && <Empty />}
        {logs?.length > 0 && (
          <FixedSizeList width="100%" height={500} itemCount={logs.length} itemSize={50}>
            {TableRow}
          </FixedSizeList>
        )}
      </div>
      <SessionModal websiteId={website.id} />
    </div>
  );
}
