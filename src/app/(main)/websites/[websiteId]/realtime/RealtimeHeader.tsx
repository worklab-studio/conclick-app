import { useMessages } from '@/components/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from '@/components/common/AnimatedDiv';
import { useSpring } from '@react-spring/web';

const RealtimeMetric = ({ label, value }: { label: string; value: number }) => {
  const props = useSpring({ x: Number(value) || 0, from: { x: 0 } });

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardContent className="p-6 flex flex-col items-center justify-center">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className="text-3xl font-bold mt-2">
          <AnimatedDiv>{props.x.to(x => Math.floor(x).toLocaleString())}</AnimatedDiv>
        </div>
      </CardContent>
    </Card>
  );
};

export function RealtimeHeader({ data }: { data: any }) {
  const { formatMessage, labels } = useMessages();
  const { totals }: any = data || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <RealtimeMetric label={formatMessage(labels.views)} value={totals.views} />
      <RealtimeMetric label={formatMessage(labels.visitors)} value={totals.visitors} />
      <RealtimeMetric label={formatMessage(labels.events)} value={totals.events} />
      <RealtimeMetric label={formatMessage(labels.countries)} value={totals.countries} />
    </div>
  );
}
