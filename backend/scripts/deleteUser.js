import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.db.collection('users');

// Delete the target user
const result = await col.deleteOne({ email: 'eathorgaming@gmail.com' });
if (result.deletedCount === 1) {
    console.log(' Deleted eathorgaming@gmail.com');
} else {
    console.log(' eathorgaming@gmail.com not found — already gone');
}

// Show remaining users
const remaining = await col.find({}, { projection: { password: 0, googleId: 0 } }).toArray();
console.log(`\n📋  Remaining users (${remaining.length}):`);
remaining.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name} | ${u.email} | ${u._id}`);
});

await mongoose.disconnect();
console.log('\n🔌  Done.');
