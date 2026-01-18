import { useConfig, useLoginQuery, useMessages } from '@/components/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ROLES } from '@/lib/constants';
import { PasswordChangeButton } from './PasswordChangeButton';

import { useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useDebounce } from 'use-debounce';

export function ProfileSettings() {
  const { user, refetch } = useLoginQuery();
  const { formatMessage, labels } = useMessages();
  const { cloudMode } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [debouncedUsername] = useDebounce(newUsername, 500);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Email state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setNewEmail(user.email || `${user.username.toLowerCase().replace(/\s+/g, '.')}@example.com`);
    }
  }, [user]);

  // Username validation effect
  useEffect(() => {
    if (!isEditingUsername || !debouncedUsername || debouncedUsername === user?.username) {
      setUsernameAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setIsCheckingUsername(true);
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(debouncedUsername)}`,
        );
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch {
        // fail silently
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkAvailability();
  }, [debouncedUsername, isEditingUsername, user?.username]);

  if (!user) return null;

  const { username, role, id, logoUrl } = user;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Preview locally
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);

      // 2. Upload immediately
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const { url: serverUrl } = await uploadRes.json();

        // 3. Update User Profile
        const updateRes = await fetch(`/api/users/${id}`, {
          method: 'POST', // or PATCH depending on your API, usually POST in this codebase
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: serverUrl }), // Assuming we mapped logoUrl
        });

        if (!updateRes.ok) throw new Error('Failed to update profile picture');

        toast.success('Profile picture updated');
        await refetch(); // Refresh user data
      } catch {
        toast.error('Failed to upload picture');
        setAvatarPreview(null); // Revert preview on error
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleUsernameSave = async () => {
    if (newUsername === username) {
      setIsEditingUsername(false);
      return;
    }

    if (usernameAvailable === false) {
      toast.error('Username is taken');
      return;
    }

    if (!newUsername.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update username');
      }

      toast.success('Username updated successfully');
      setIsEditingUsername(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSave = async () => {
    if (newEmail === user.email) {
      setIsEditingEmail(false);
      return;
    }

    if (!newEmail.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Invalid email address');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update email');
      }

      toast.success('Email updated successfully');
      setIsEditingEmail(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderRole = (value: string) => {
    if (value === ROLES.user) return formatMessage(labels.user);
    if (value === ROLES.admin) return formatMessage(labels.admin);
    if (value === ROLES.viewOnly) return formatMessage(labels.viewOnly);
    return formatMessage(labels.unknown);
  };

  return (
    <Card className="dark:bg-[hsl(0,0%,8%)] dark:border-[hsl(0,0%,12%)]">
      <CardHeader>
        <CardTitle>{formatMessage(labels.profile)}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Profile Picture Section */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 relative">
            <AvatarImage src={avatarPreview || logoUrl || `https://avatar.vercel.sh/${username}`} />
            <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </Avatar>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Change picture'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        {/* Username & Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label>{formatMessage(labels.username)}</Label>
            <div className="space-y-2">
              <div className="flex gap-2 relative">
                <Input
                  value={isEditingUsername ? newUsername : username}
                  disabled={!isEditingUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className={`dark:bg-[#18181b] dark:border-zinc-800 ${
                    isEditingUsername && usernameAvailable === false
                      ? 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                />

                {/* Edit / Action Buttons */}
                {!isEditingUsername ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewUsername(username);
                      setIsEditingUsername(true);
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      onClick={handleUsernameSave}
                      disabled={isSaving || usernameAvailable === false || isCheckingUsername}
                    >
                      {isSaving ? '...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditingUsername(false);
                        setUsernameAvailable(null);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Real-time Validation Feedback */}
              {isEditingUsername && debouncedUsername !== username && debouncedUsername && (
                <div className="flex items-center gap-2 text-sm h-5">
                  {isCheckingUsername ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                      <span className="text-zinc-500">Checking availability...</span>
                    </>
                  ) : usernameAvailable === true ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Username available</span>
                    </>
                  ) : usernameAvailable === false ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-500">Username taken</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{formatMessage(labels.role)}</Label>
            <Input
              value={renderRole(role)}
              disabled
              readOnly
              className="dark:bg-[#18181b] dark:border-zinc-800"
            />
          </div>

          <div className="grid gap-2">
            <Label>Email</Label>
            <div className="space-y-2">
              <div className="flex gap-2 relative">
                <Input
                  value={
                    isEditingEmail
                      ? newEmail
                      : user.email || `${username.toLowerCase().replace(/\s+/g, '.')}@example.com`
                  }
                  disabled={!isEditingEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="dark:bg-[#18181b] dark:border-zinc-800"
                />

                {!isEditingEmail ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewEmail(
                        user.email || `${username.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                      );
                      setIsEditingEmail(true);
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button onClick={handleEmailSave} disabled={isSaving}>
                      {isSaving ? '...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditingEmail(false);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
