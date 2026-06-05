import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  // Return only the user — never the whole auth object. The latter contains the
  // bearer `token`, the Redis `authKey`, and any `shareToken`, which are session
  // credentials that must not be reflected back into a response body (logs,
  // caches, proxies). auth.user already excludes the password hash.
  return json(auth.user);
}
