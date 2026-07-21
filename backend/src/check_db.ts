import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- SOCIAL ACCOUNTS ---');
    const social = await prisma.socialAccount.findMany();
    console.log(JSON.stringify(social, null, 2));

    console.log('--- AD ACCOUNTS ---');
    const ads = await prisma.adAccount.findMany();
    console.log(JSON.stringify(ads, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
