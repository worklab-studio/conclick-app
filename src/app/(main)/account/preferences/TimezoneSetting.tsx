import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimezone, useMessages } from '@/components/hooks';
import { getTimezone } from '@/lib/date';

const timezones = Intl.supportedValuesOf('timeZone');

export function TimezoneSetting() {
  const { formatMessage, labels } = useMessages();
  const { timezone, saveTimezone } = useTimezone();

  const handleReset = () => saveTimezone(getTimezone());

  return (
    <div className="flex items-center gap-4 w-full">
      <Select value={timezone} onValueChange={saveTimezone}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {timezones.map(tz => (
            <SelectItem key={tz} value={tz}>
              {tz}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={handleReset}>
        {formatMessage(labels.reset)}
      </Button>
    </div>
  );
}
