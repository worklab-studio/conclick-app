import { SideMenu } from '@/components/common/SideMenu';
import { useMessages, useNavigation } from '@/components/hooks';
import { Globe, User, Users } from '@/components/icons';
import { Bell } from 'lucide-react';

export function AdminNav({ onItemClick }: { onItemClick?: () => void }) {
  const { formatMessage, labels } = useMessages();
  const { pathname } = useNavigation();

  const items = [
    {
      label: formatMessage(labels.manage),
      items: [
        {
          id: 'users',
          label: formatMessage(labels.users),
          path: '/admin/users',
          icon: <User />,
        },
        {
          id: 'teams',
          label: formatMessage(labels.teams),
          path: '/admin/teams',
          icon: <Users />,
        },
        {
          id: 'notifications',
          label: 'Notifications',
          path: '/admin/notifications',
          icon: <Bell className="w-4 h-4" />,
        },
      ],
    },
  ];

  const selectedKey = items
    .flatMap(e => e.items)
    ?.find(({ path }) => path && pathname.startsWith(path))?.id;

  return (
    <SideMenu
      items={items}
      title={formatMessage(labels.admin)}
      selectedKey={selectedKey}
      allowMinimize={false}
      onItemClick={onItemClick}
    />
  );
}
