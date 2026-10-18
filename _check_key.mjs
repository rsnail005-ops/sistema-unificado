import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
console.log('ENV length:', envContent.length);

const lines = envContent.split('\n');
for (const line of lines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key === 'SUPABASE_SECRET_KEY') {
      console.log('SECRET_KEY prefix:', val.slice(0, 15), 'length:', val.length);
    }
  }
}
