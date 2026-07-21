import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EffectiveUser {
  effectiveUserId: string;
  role: string;
  isAdmin: boolean;
}

export async function getEffectiveUser(userId: string, email?: string): Promise<EffectiveUser> {
  if (email) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { email: email.toLowerCase().trim(), status: 'ACTIVE' }
    });
    
    if (teamMember) {
      return {
        effectiveUserId: teamMember.adminId,
        role: teamMember.role.toUpperCase(),
        isAdmin: teamMember.role.toUpperCase() === 'ADMIN'
      };
    }
  }

  return {
    effectiveUserId: userId,
    role: 'ADMIN',
    isAdmin: true
  };
}
