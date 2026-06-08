import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';
import prisma from '@/lib/prisma';

const INVITE_TTL_DAYS = 7;

export async function createTeamInvite(
  teamId: string,
  email: string,
  role: string,
  invitedById?: string,
) {
  return prisma.client.teamInvite.create({
    data: {
      id: uuid(),
      teamId,
      email: email.toLowerCase(),
      token: getRandomChars(40),
      role,
      status: 'pending',
      invitedById: invitedById ?? null,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

export async function getTeamInviteByToken(token: string) {
  return prisma.client.teamInvite.findUnique({ where: { token } });
}

export async function getTeamInvites(teamId: string) {
  return prisma.client.teamInvite.findMany({
    where: { teamId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPendingInviteByEmail(teamId: string, email: string) {
  return prisma.client.teamInvite.findFirst({
    where: { teamId, email: email.toLowerCase(), status: 'pending' },
  });
}

export async function revokeTeamInvite(inviteId: string) {
  return prisma.client.teamInvite.update({
    where: { id: inviteId },
    data: { status: 'revoked' },
  });
}

export async function acceptTeamInvite(token: string, userId: string) {
  return prisma.client.teamInvite.update({
    where: { token },
    data: { status: 'accepted', acceptedAt: new Date(), acceptedUserId: userId },
  });
}
