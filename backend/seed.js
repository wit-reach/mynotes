import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_DATABASE = process.env.DB_DATABASE || 'my_notes_app';
const DB_USERNAME = process.env.DB_USERNAME || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const mysqlConfig = {
  host: DB_HOST,
  port: parseInt(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE
};

async function seed() {
  const email = 'demo@local.test';
  const password = 'demo123';
  const passwordHash = await bcrypt.hash(password, 10);

  let connection;
  try {
    connection = await mysql.createConnection(mysqlConfig);

    // Check if user already exists
    const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      console.log('Demo user already exists');
      await connection.end();
      return;
    }

    // Create demo user
    const [userResult] = await connection.query(
      'INSERT INTO users (email, password_hash, username, profile_picture) VALUES (?, ?, ?, ?)',
      [email, passwordHash, 'Demo User', null]
    );

    const userId = userResult.insertId;
    console.log(`Created demo user: ${email} (ID: ${userId})`);

    // Create a sample book
    const [bookResult] = await connection.query(
      'INSERT INTO books (user_id, title, description) VALUES (?, ?, ?)',
      [userId, 'My First Book', 'A sample book to get you started']
    );

    const bookId = bookResult.insertId;
    console.log(`Created sample book (ID: ${bookId})`);

    // Create a sample page
    const [pageResult] = await connection.query(
      'INSERT INTO pages (book_id, title, content_html, word_count) VALUES (?, ?, ?, ?)',
      [bookId, 'Welcome Page', '<p>Welcome to your notes app! Start writing...</p>', 5]
    );

    console.log(`Created sample page (ID: ${pageResult.insertId})`);
    console.log('\nSeed completed successfully!');
    console.log(`Login with: ${email} / ${password}`);

    await connection.end();
  } catch (error) {
    console.error('Error seeding database:', error);
    if (connection) {
      await connection.end();
    }
    throw error;
  }
}

seed().catch(console.error);

