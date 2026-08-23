import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const MONGO_URI = process.env.MONGO_URI;

async function clearMongoDB() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in server/.env file.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    const collections = await mongoose.connection.db?.collections();
    if (collections && collections.length > 0) {
      console.log(`🧹 Clearing ${collections.length} collection(s)...`);
      for (const collection of collections) {
        await collection.deleteMany({});
        console.log(`   - Cleared collection: ${collection.collectionName}`);
      }
      console.log('✅ All MongoDB collections cleared successfully!');
    } else {
      console.log('ℹ️ No collections found in database.');
    }
  } catch (err: any) {
    console.error('❌ Error clearing MongoDB:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

async function clearAuth0Users() {
  const domain = (process.env.AUTH0_ISSUER_URL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
  const audience = `https://${domain}/api/v2/`;

  if (!domain || !clientId || !clientSecret) {
    console.log('\n------------------------------------------------------------');
    console.log('ℹ️ Auth0 Management API credentials not configured in server/.env.');
    console.log('   To automatically delete users from Auth0, add to server/.env:');
    console.log('   AUTH0_MANAGEMENT_CLIENT_ID=your_client_id');
    console.log('   AUTH0_MANAGEMENT_CLIENT_SECRET=your_client_secret');
    console.log('\n   Manual Auth0 Reset:');
    console.log('   1. Open Auth0 Dashboard -> User Management -> Users');
    console.log('   2. Select users and click "Delete"');
    console.log('------------------------------------------------------------\n');
    return;
  }

  console.log('🔄 Fetching Auth0 Management API token...');
  try {
    const tokenRes = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to obtain token: ${tokenRes.status} ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const token = tokenData.access_token;

    console.log('🔄 Fetching Auth0 users...');
    const usersRes = await fetch(`https://${domain}/api/v2/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!usersRes.ok) {
      throw new Error(`Failed to list users: ${usersRes.statusText}`);
    }

    const users = (await usersRes.json()) as Array<{ user_id: string; email?: string }>;
    console.log(`Found ${users.length} user(s) in Auth0.`);

    for (const u of users) {
      console.log(`   - Deleting Auth0 user: ${u.email || u.user_id}`);
      const delRes = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(u.user_id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!delRes.ok) {
        console.warn(`     ⚠️ Failed to delete ${u.user_id}: ${delRes.statusText}`);
      }
    }
    console.log('✅ Auth0 user cleanup completed!');
  } catch (err: any) {
    console.error('❌ Error clearing Auth0 users:', err.message);
  }
}

async function run() {
  await clearMongoDB();
  await clearAuth0Users();
  process.exit(0);
}

run();
