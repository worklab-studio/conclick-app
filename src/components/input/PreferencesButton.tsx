import { Button, Icon, DialogTrigger, Popover, Column, Label } from '@umami/react-zen';
import { TimezoneSetting } from '@/app/(main)/account/preferences/TimezoneSetting';
import { DateRangeSetting } from '@/app/(main)/account/preferences/DateRangeSetting';
import { Settings } from '@/components/icons';
import { useMessages } from '@/components/hooks';
import { Panel } from '@/components/common/Panel';

export function PreferencesButton() {
  const { formatMessage, labels } = useMessages();

  return (
    <DialogTrigger>
      <Button variant="quiet">
        <Icon>
          <Settings />
        </Icon>
      </Button>
      <Popover placement="bottom end">
        <Panel gap="3">
          <Column>
            <Label>{formatMessage(labels.timezone)}</Label>
            <TimezoneSetting />
          </Column>
          <Column>
            <Label>{formatMessage(labels.defaultDateRange)}</Label>
            <DateRangeSetting />
          </Column>
        </Panel>
      </Popover>
    </DialogTrigger>
  );
}
