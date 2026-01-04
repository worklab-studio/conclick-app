import { ReactNode } from 'react';
import { FixedSizeList } from 'react-window';
import { useSpring, config } from '@react-spring/web';
import { Grid, Row, Column, Text } from '@umami/react-zen';
import { AnimatedDiv } from '@/components/common/AnimatedDiv';
import { Empty } from '@/components/common/Empty';
import { useMessages, useMobile } from '@/components/hooks';
import { formatLongCurrency, formatLongNumber } from '@/lib/format';

const ITEM_SIZE = 30;

interface ListData {
  label: string;
  count: number;
  percent: number;
}

export interface ListTableProps {
  data?: ListData[];
  title?: string;
  metric?: string;
  className?: string;
  renderLabel?: (data: ListData, index: number) => ReactNode;
  renderChange?: (data: ListData, index: number) => ReactNode;
  animate?: boolean;
  virtualize?: boolean;
  showPercentage?: boolean;
  itemCount?: number;
  currency?: string;
}

export function ListTable({
  data = [],
  title,
  metric,
  renderLabel,
  renderChange,
  animate = true,
  virtualize = false,
  showPercentage = true,
  itemCount = 10,
  currency,
}: ListTableProps) {
  const { formatMessage, labels } = useMessages();

  const getRow = (row: ListData, index: number) => {
    const { label, count, percent } = row;

    return (
      <AnimatedRow
        key={`${label}${index}`}
        label={renderLabel ? renderLabel(row, index) : (label ?? formatMessage(labels.unknown))}
        value={count}
        percent={percent}
        animate={animate && !virtualize}
        showPercentage={showPercentage}
        change={renderChange ? renderChange(row, index) : null}
        currency={currency}
      />
    );
  };

  const ListTableRow = ({ index, style }) => {
    return <div style={style}>{getRow(data[index], index)}</div>;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="font-bold">{title}</div>
        <div className="font-bold text-center w-[100px]">{metric}</div>
      </div>
      <div className="flex flex-col gap-1">
        {data?.length === 0 && <Empty />}
        {virtualize && data.length > 0 ? (
          <FixedSizeList
            width="100%"
            height={itemCount * ITEM_SIZE}
            itemCount={data.length}
            itemSize={ITEM_SIZE}
          >
            {ListTableRow}
          </FixedSizeList>
        ) : (
          data.map(getRow)
        )}
      </div>
    </div>
  );
}

const AnimatedRow = ({
  label,
  value = 0,
  percent,
  change,
  animate,
  showPercentage = true,
  currency,
}) => {
  const props = useSpring({
    width: percent,
    y: !isNaN(value) ? value : 0,
    from: { width: 0, y: 0 },
    config: animate ? config.default : { duration: 0 },
  });

  return (
    <div className="grid grid-cols-[1fr_50px_50px] gap-4 px-2 py-1 items-center hover:bg-zinc-100 dark:hover:bg-[#18181b] rounded-md transition-colors">
      <div className="flex items-center min-w-0">
        <div className="truncate text-sm" style={{ maxWidth: '100%' }}>
          {label}
        </div>
      </div>
      <div className="flex items-center h-[30px] justify-end">
        {change}
        <div className="font-bold text-sm">
          <AnimatedDiv title={props?.y as any}>
            {currency
              ? props.y?.to(n => formatLongCurrency(n, currency))
              : props.y?.to(formatLongNumber)}
          </AnimatedDiv>
        </div>
      </div>
      {showPercentage && (
        <div className="flex items-center justify-start relative border-l border-zinc-200 dark:border-zinc-800 text-muted-foreground pl-3 text-sm">
          <AnimatedDiv>{props.width.to(n => `${n?.toFixed?.(0)}%`)}</AnimatedDiv>
        </div>
      )}
    </div>
  );
};
