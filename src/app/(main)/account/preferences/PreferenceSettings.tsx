import { useLoginQuery, useMessages } from '@/components/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TimezoneSetting } from './TimezoneSetting';
import { DateRangeSetting } from './DateRangeSetting';
import { LanguageSetting } from './LanguageSetting';
import { ThemeSetting } from './ThemeSetting';

export function PreferenceSettings() {
  const { user } = useLoginQuery();
  const { formatMessage, labels } = useMessages();

  if (!user) {
    return null;
  }

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardHeader>
        <CardTitle>{formatMessage(labels.preferences)}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid gap-2">
          <Label>{formatMessage(labels.defaultDateRange)}</Label>
          <DateRangeSetting />
        </div>
        <div className="grid gap-2">
          <Label>{formatMessage(labels.timezone)}</Label>
          <TimezoneSetting />
        </div>
        <div className="grid gap-2">
          <Label>{formatMessage(labels.language)}</Label>
          <LanguageSetting />
        </div>
        <div className="grid gap-2">
          <Label>{formatMessage(labels.theme)}</Label>
          <ThemeSetting />
        </div>
      </CardContent>
    </Card>
  );
}
