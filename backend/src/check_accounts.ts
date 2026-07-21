import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const accounts = await prisma.socialAccount.findMany();
    console.log('Connected Social Accounts:');
    console.log(JSON.stringify(accounts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
