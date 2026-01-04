import { useConfig, useLoginQuery, useMessages } from '@/components/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ROLES } from '@/lib/constants';
import { PasswordChangeButton } from './PasswordChangeButton';

import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function ProfileSettings() {
  const { user } = useLoginQuery();
  const { formatMessage, labels } = useMessages();
  const { cloudMode } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const { username, role } = user;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const renderRole = (value: string) => {
    if (value === ROLES.user) {
      return formatMessage(labels.user);
    }
    if (value === ROLES.admin) {
      return formatMessage(labels.admin);
    }
    if (value === ROLES.viewOnly) {
      return formatMessage(labels.viewOnly);
    }

    return formatMessage(labels.unknown);
  };

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardHeader>
        <CardTitle>{formatMessage(labels.profile)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarPreview || `https://avatar.vercel.sh/${username}`} />
            <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Change picture
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label>{formatMessage(labels.username)}</Label>
            <Input value={username} disabled readOnly className="dark:bg-[#18181b] dark:border-zinc-800" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value="admin@example.com" disabled readOnly className="dark:bg-[#18181b] dark:border-zinc-800" />
          </div>
          <div className="grid gap-2">
            <Label>{formatMessage(labels.role)}</Label>
            <Input value={renderRole(role)} disabled readOnly className="dark:bg-[#18181b] dark:border-zinc-800" />
          </div>
          {!cloudMode && (
            <div className="grid gap-2">
              <Label>{formatMessage(labels.password)}</Label>
              <div>
                <PasswordChangeButton />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
