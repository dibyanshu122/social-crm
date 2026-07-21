import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating all connected Social & Ad Accounts default roles to ADMIN...');
  
  const socialRes = await prisma.socialAccount.updateMany({
    data: { userRole: 'ADMIN' }
  });

  const adRes = await prisma.adAccount.updateMany({
    data: { userRole: 'ADMIN' }
  });

  console.log(`Updated ${socialRes.count} social accounts and ${adRes.count} ad accounts to ADMIN.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
