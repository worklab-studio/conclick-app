import { UserContext } from '@/app/admin/users/[userId]/UserProvider';
import { useContext } from 'react';

export function useUser() {
  return useContext(UserContext);
}
