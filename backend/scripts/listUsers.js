import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI not found in .env');
    process.exit(1);
}

console.log('🔌  Connecting to MongoDB...\n');

await mongoose.connect(MONGODB_URI);

const users = await mongoose.connection.db
    .collection('users')
    .find({}, { projection: { password: 0, googleId: 0 } })
    .toArray();

if (users.length === 0) {
    console.log('⚠️  No users found in the database.');
} else {
    console.log(`✅  Found ${users.length} user(s):\n`);
    console.log('─'.repeat(60));

    users.forEach((user, i) => {
        console.log(`👤  User ${i + 1}`);
        console.log(`    ID      : ${user._id}`);
        console.log(`    Name    : ${user.name || '(not set)'}`);
        console.log(`    Email   : ${user.email}`);
        console.log(`    Avatar  : ${user.avatar || '(none)'}`);
        console.log(`    Created : ${user.createdAt ? new Date(user.createdAt).toLocaleString() : '(unknown)'}`);
        console.log('─'.repeat(60));
    });
}

await mongoose.disconnect();
console.log('\n🔌  Disconnected.');
