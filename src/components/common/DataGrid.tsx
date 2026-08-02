import {
  ReactNode,
  useState,
  useCallback,
  ReactElement,
  cloneElement,
  isValidElement,
} from 'react';
import { SearchField, Row, Column } from '@umami/react-zen';
import { UseQueryResult } from '@tanstack/react-query';
import { useMessages, useMobile, useNavigation } from '@/components/hooks';
import { Pager } from '@/components/common/Pager';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { PageResult } from '@/lib/types';
import { Empty } from '@/components/common/Empty';

const DEFAULT_SEARCH_DELAY = 600;

export interface DataGridProps {
  query: UseQueryResult<PageResult<any>, any>;
  searchDelay?: number;
  allowSearch?: boolean;
  allowPaging?: boolean;
  autoFocus?: boolean;
  renderActions?: () => ReactNode;
  renderGreeting?: (opts: { isEmpty: boolean }) => ReactNode;
  renderEmpty?: () => ReactNode;
  /**
   * Drop the search box and action controls once we know the list is empty.
   * A filter that can only ever filter nothing is noise, and it makes a first
   * run look like a broken dashboard rather than a starting point.
   */
  hideControlsWhenEmpty?: boolean;
  children: ReactNode | ((data: any) => ReactNode);
}

export function DataGrid({
  query,
  searchDelay = 600,
  allowSearch,
  allowPaging = true,
  autoFocus,
  renderActions,
  renderGreeting,
  renderEmpty = () => <Empty />,
  hideControlsWhenEmpty,
  children,
}: DataGridProps) {
  const { formatMessage, labels } = useMessages();
  const { data, error, isLoading, isFetching } = query;
  const { router, updateParams, query: queryParams } = useNavigation();
  const [search, setSearch] = useState(queryParams?.search || data?.search || '');
  const showPager = allowPaging && data && data.count > data.pageSize;
  const { isMobile } = useMobile();
  const displayMode = isMobile ? 'cards' : undefined;

  const handleSearch = (value: string) => {
    if (value !== search) {
      setSearch(value);
      router.push(updateParams({ search: value, page: 1 }), { scroll: false });
    }
  };

  const handlePageChange = useCallback(
    (page: number) => {
      router.push(updateParams({ search, page }), { scroll: false });
    },
    [search],
  );

  const child = data ? (typeof children === 'function' ? children(data) : children) : null;

  const isEmpty = !data || (Array.isArray(data) ? data.length === 0 : data.count === 0);

  // Only once the query has actually resolved, so the controls don't flash in
  // and out while the first page loads. A live search term keeps them mounted
  // even with no results, otherwise there is no way to clear the search.
  const confirmedEmpty = !isLoading && !!data && isEmpty && !search;
  const showControls = allowSearch && !(hideControlsWhenEmpty && confirmedEmpty);

  return (
    <Column gap="4" minHeight="300px">
      {(renderGreeting || showControls) && (
        <Row alignItems="center" justifyContent="space-between" wrap="wrap" gap>
          {renderGreeting?.({ isEmpty: confirmedEmpty })}
          {showControls && (
            <div className="flex items-center gap-4 w-full md:w-auto md:ml-auto mt-4 md:mt-0">
              <div className="w-full md:w-64">
                <SearchField
                  className="rounded-lg border-none bg-background dark:bg-[hsl(0,0%,8%)] ring-0 outline-none w-full"
                  value={search}
                  onSearch={handleSearch}
                  delay={searchDelay || DEFAULT_SEARCH_DELAY}
                  autoFocus={autoFocus}
                  placeholder={formatMessage(labels.search)}
                />
              </div>
              {renderActions?.()}
            </div>
          )}
        </Row>
      )}
      <LoadingPanel
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        isEmpty={isEmpty}
        renderEmpty={renderEmpty}
      >
        {data && (
          <>
            <Column>
              {isValidElement(child)
                ? cloneElement(child as ReactElement<any>, { displayMode })
                : child}
            </Column>
            {showPager && (
              <Row>
                <Pager
                  page={data.page}
                  pageSize={data.pageSize}
                  count={data.count}
                  onPageChange={handlePageChange}
                />
              </Row>
            )}
          </>
        )}
      </LoadingPanel>
    </Column>
  );
}
