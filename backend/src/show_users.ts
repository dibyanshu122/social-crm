import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany();
  console.log('=== REGISTERED USERS IN DB ===');
  console.log(JSON.stringify(profiles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
