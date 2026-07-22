import { supabase } from './utils/supabase';

async function main() {
  console.log('Updating password for ddibyanshu2@gmail.com to Rishu@123...');
  
  // Update admin user password in Supabase auth
  const { data, error } = await supabase.auth.admin.updateUserById(
    '5690e7df-ac3e-486b-af1e-54aff302da28',
    { password: 'Rishu@123' }
  );

  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Password updated successfully for ddibyanshu2@gmail.com!');
  }
}

main().catch(console.error);
