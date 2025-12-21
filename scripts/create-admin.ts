import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createAdmin() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = 'mario.gutierrez@unityfinancialnetwork.com';
  const password = 'Luc14n47640$%&/';
  const name = 'Mario Gutierrez';

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      console.log('User updated to ADMIN:', updatedUser.email);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('Admin user created:', user.email);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createAdmin();
