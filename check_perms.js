import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error: ue } = await supabase.auth.admin.listUsers();
  if (ue) { console.error("Error listing users:", ue); return; }
  
  const sportsCouncilUser = users.users.find(u => u.email === 'sports.council@rico.family');
  if (!sportsCouncilUser) { console.log("User not found"); return; }
  
  console.log("User ID:", sportsCouncilUser.id);
  
  const { data: adminUser } = await supabase.from('admin_users').select('*').eq('user_id', sportsCouncilUser.id);
  console.log("Admin Users table:", adminUser);

  const { data: perms } = await supabase.from('admin_permissions').select('*').eq('user_id', sportsCouncilUser.id);
  console.log("Admin Permissions table:", perms);
}
check();
