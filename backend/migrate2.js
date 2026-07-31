const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration...');
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."ad_campaigns" 
      ADD COLUMN IF NOT EXISTS "impressions" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "clicks" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS "conversions" INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('Added analytics columns to ad_campaigns');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."leads" 
      ADD COLUMN IF NOT EXISTS "adCampaignId" UUID;
    `);
    
    // Add foreign key constraint if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."leads"
        ADD CONSTRAINT "leads_adCampaignId_fkey" FOREIGN KEY ("adCampaignId") REFERENCES "public"."ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log('Added foreign key constraint to leads');
    } catch (e) {
      console.log('Foreign key might already exist: ', e.message);
    }

    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
