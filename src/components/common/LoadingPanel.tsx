import { ReactNode } from 'react';
import { Loading, Column, type ColumnProps } from '@umami/react-zen';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Empty } from '@/components/common/Empty';

export interface LoadingPanelProps extends ColumnProps {
  data?: any;
  error?: unknown;
  isEmpty?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  loadingIcon?: 'dots' | 'spinner';
  loadingPlacement?: 'center' | 'absolute' | 'inline';
  renderEmpty?: () => ReactNode;
  children: ReactNode;
}

export function LoadingPanel({
  data,
  error,
  isEmpty,
  isLoading,
  isFetching,
  loadingIcon = 'dots',
  loadingPlacement = 'absolute',
  renderEmpty = () => <Empty />,
  children,
  ...props
}: LoadingPanelProps): ReactNode {
  const empty = isEmpty ?? checkEmpty(data);

  // Spinner only while there is nothing meaningful to show: a true first load,
  // or a refetch bridging an empty placeholder (e.g. the list right after
  // creating the first item). A background refetch over real data must NOT
  // collapse the panel — the content stays up, dimmed below.
  if (isLoading || (isFetching && (data === undefined || empty))) {
    return (
      <Column position="relative" height="100%" width="100%" {...props}>
        <Loading icon={loadingIcon} placement={loadingPlacement} />
      </Column>
    );
  }

  // Show error
  if (error) {
    return <ErrorMessage />;
  }

  // Show empty state (once loaded)
  if (empty) {
    return renderEmpty();
  }

  // Content — dimmed while a background refetch is replacing it, so stale
  // numbers are visibly "refreshing" instead of silently posing as current.
  return (
    <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
      {children}
    </div>
  );
}

function checkEmpty(data: any) {
  if (!data) return false;

  if (Array.isArray(data)) {
    return data.length <= 0;
  }

  if (typeof data === 'object') {
    return Object.keys(data).length <= 0;
  }

  return !!data;
}
