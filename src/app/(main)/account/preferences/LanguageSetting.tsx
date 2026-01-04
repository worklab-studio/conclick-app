import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale, useMessages } from '@/components/hooks';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { languages } from '@/lib/lang';

export function LanguageSetting() {
  const { formatMessage, labels } = useMessages();
  const { locale, saveLocale } = useLocale();

  const handleReset = () => saveLocale(DEFAULT_LOCALE);

  return (
    <div className="flex items-center gap-4 w-full">
      <Select value={locale} onValueChange={saveLocale}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(languages).map(key => (
            <SelectItem key={key} value={key}>
              {languages[key].label}
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
