import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Generate a secure UUID for the test user
    const userId = crypto.randomUUID();
    
    // We are only creating the Profile record. Supabase Auth handles the actual login credentials (email/password).
    // In a real flow, a Supabase trigger or webhook would create this Profile row when a user signs up.
    
    const profile = await prisma.profile.create({
      data: {
        id: userId,
        fullName: 'Test User',
        avatarUrl: null,
      },
    });

    console.log('✅ Test Profile created successfully in database:');
    console.log(profile);
    console.log('\nNOTE: Since we use Supabase Auth, you must ALSO sign up using the Frontend UI with:');
    console.log('Email: testing11@gmail.com');
    console.log('Password: testing@123');
    console.log('This will create the actual Auth User in Supabase, and our DB will link to it.');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
