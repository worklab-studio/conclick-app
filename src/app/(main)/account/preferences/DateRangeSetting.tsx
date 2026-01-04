import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMessages } from '@/components/hooks';
import { DATE_RANGE_CONFIG, DEFAULT_DATE_RANGE_VALUE } from '@/lib/constants';
import { setItem, getItem } from '@/lib/storage';

export function DateRangeSetting() {
  const { formatMessage, labels } = useMessages();
  const [date, setDate] = useState(getItem(DATE_RANGE_CONFIG) || DEFAULT_DATE_RANGE_VALUE);

  const options = [
    { label: formatMessage(labels.today), value: '0day' },
    { label: formatMessage(labels.lastHours, { x: '24' }), value: '24hour' },
    { label: formatMessage(labels.thisWeek), value: '0week' },
    { label: formatMessage(labels.lastDays, { x: '7' }), value: '7day' },
    { label: formatMessage(labels.thisMonth), value: '0month' },
    { label: formatMessage(labels.lastDays, { x: '30' }), value: '30day' },
    { label: formatMessage(labels.lastDays, { x: '90' }), value: '90day' },
    { label: formatMessage(labels.thisYear), value: '0year' },
    { label: formatMessage(labels.lastMonths, { x: '6' }), value: '6month' },
    { label: formatMessage(labels.lastMonths, { x: '12' }), value: '12month' },
  ];

  const handleChange = (value: string) => {
    setItem(DATE_RANGE_CONFIG, value);
    setDate(value);
  };

  const handleReset = () => {
    setItem(DATE_RANGE_CONFIG, DEFAULT_DATE_RANGE_VALUE);
    setDate(DEFAULT_DATE_RANGE_VALUE);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      <Select value={date} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
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
