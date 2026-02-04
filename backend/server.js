import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database configuration from .env
const DB_CONNECTION = process.env.DB_CONNECTION || 'sqlite';
const DB_DATABASE = process.env.DB_DATABASE || 'notes';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USERNAME = process.env.DB_USERNAME || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
// For SQLite, use the database name from .env
const DB_PATH = process.env.DB_PATH || join(__dirname, `${DB_DATABASE}.db`);

// Initialize DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Cookie options - secure only over HTTPS (avoid blocking login on HTTP/localhost)
const useSecureCookie = process.env.SECURE_COOKIE === 'true' ||
  (process.env.NODE_ENV === 'production' && (process.env.FRONTEND_URL || '').startsWith('https://'));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// MySQL Database connection pool
const mysqlConfig = {
  host: DB_HOST,
  port: parseInt(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(mysqlConfig);

// Database helper functions
async function dbQuery(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

async function dbGet(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function dbRun(sql, params = []) {
  const [result] = await db.query(sql, params);
  return {
    lastID: result.insertId,
    changes: result.affectedRows
  };
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: parseInt(DB_PORT),
      user: DB_USERNAME,
      password: DB_PASSWORD
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE}\``);
    await connection.end();

    // Create tables
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username VARCHAR(255),
      phone VARCHAR(50),
      profile_picture LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Add username, phone and profile_picture columns if they don't exist (for existing databases)
    try {
      await dbRun(`ALTER TABLE users ADD COLUMN username VARCHAR(255)`);
    } catch (error) {
      // Column already exists, ignore
    }
    try {
      await dbRun(`ALTER TABLE users ADD COLUMN phone VARCHAR(50)`);
    } catch (error) {
      // Column already exists, ignore
    }
    try {
      await dbRun(`ALTER TABLE users ADD COLUMN profile_picture LONGTEXT`);
    } catch (error) {
      // Column already exists, try to modify it
      try {
        await dbRun(`ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT`);
      } catch (err) {
        // Ignore if modification fails
      }
    }

    await dbRun(`CREATE TABLE IF NOT EXISTS books (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content_html LONGTEXT DEFAULT '',
      word_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS page_revisions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page_id INT NOT NULL,
      content_html LONGTEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    )`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Initialize database on startup
initializeDatabase().then(() => {
  console.log(`Connected to MySQL database: ${DB_DATABASE} on ${DB_HOST}:${DB_PORT}`);
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Auth middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Helper: Check ownership
async function checkOwnership(table, id, userId) {
  try {
    // For pages, check through book ownership
    if (table === 'pages') {
      const pageRow = await dbGet(`SELECT book_id FROM pages WHERE id = ?`, [id]);
      if (!pageRow) {
        return false;
      }
      const bookRow = await dbGet(`SELECT user_id FROM books WHERE id = ?`, [pageRow.book_id]);
      return bookRow && bookRow.user_id === userId;
    } else {
      const row = await dbGet(`SELECT user_id FROM ${table} WHERE id = ?`, [id]);
      if (!row) {
        return false;
      }
      return row.user_id === userId;
    }
  } catch (error) {
    throw error;
  }
}

// Sanitize HTML
function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
  });
}

// Calculate word count
function calculateWordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username, phone, profile_picture } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbRun(
      'INSERT INTO users (email, password_hash, username, phone, profile_picture) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, username || null, phone || null, profile_picture || null]
    );

    const user = await dbGet('SELECT id, email, username, phone, profile_picture FROM users WHERE id = ?', [result.lastID]);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        profile_picture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Signed out successfully' });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, email, username, phone, profile_picture FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
  const { username, email, phone, profile_picture } = req.body;

  try {
    const updates = [];
    const values = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      values.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.user.id);

    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const user = await dbGet('SELECT id, email, username, phone, profile_picture FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPasswordHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Books routes
app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const books = await dbQuery(
      'SELECT * FROM books WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/books', authenticateToken, async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO books (user_id, title, description) VALUES (?, ?, ?)',
      [req.user.id, title, description || null]
    );

    const book = await dbGet('SELECT * FROM books WHERE id = ?', [result.lastID]);
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.patch('/api/books/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const owns = await checkOwnership('books', id, req.user.id);
    if (!owns) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await dbRun(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`, values);
    const book = await dbGet('SELECT * FROM books WHERE id = ?', [id]);
    res.json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const owns = await checkOwnership('books', id, req.user.id);
    if (!owns) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dbRun('DELETE FROM books WHERE id = ?', [id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Pages routes
app.get('/api/books/:bookIdentifier/pages', authenticateToken, async (req, res) => {
  const { bookIdentifier } = req.params;

  try {
    // Try to find book by name first (URL decoded), then by ID
    let book = await dbGet('SELECT * FROM books WHERE title = ? AND user_id = ?', [decodeURIComponent(bookIdentifier), req.user.id]);

    if (!book) {
      book = await dbGet('SELECT * FROM books WHERE id = ? AND user_id = ?', [bookIdentifier, req.user.id]);
    }

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const pages = await dbQuery(
      'SELECT * FROM pages WHERE book_id = ? ORDER BY updated_at DESC',
      [book.id]
    );
    res.json({ pages, book });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

app.post('/api/books/:bookIdentifier/pages', authenticateToken, async (req, res) => {
  const { bookIdentifier } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Find book
    let book = await dbGet('SELECT * FROM books WHERE title = ? AND user_id = ?', [decodeURIComponent(bookIdentifier), req.user.id]);
    if (!book) {
      book = await dbGet('SELECT * FROM books WHERE id = ? AND user_id = ?', [bookIdentifier, req.user.id]);
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = await dbRun(
      'INSERT INTO pages (book_id, title, content_html, word_count) VALUES (?, ?, ?, ?)',
      [book.id, title, '', 0]
    );

    const page = await dbGet('SELECT * FROM pages WHERE id = ?', [result.lastID]);
    res.status(201).json(page);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

app.get('/api/pages/:bookIdentifier/:pageIdentifier', authenticateToken, async (req, res) => {
  const { bookIdentifier, pageIdentifier } = req.params;

  try {
    // Find book by name or ID
    let book = await dbGet('SELECT * FROM books WHERE title = ? AND user_id = ?', [decodeURIComponent(bookIdentifier), req.user.id]);
    if (!book) {
      book = await dbGet('SELECT * FROM books WHERE id = ? AND user_id = ?', [bookIdentifier, req.user.id]);
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Find page by title or ID within this book
    let page = await dbGet('SELECT * FROM pages WHERE title = ? AND book_id = ?', [decodeURIComponent(pageIdentifier), book.id]);
    if (!page) {
      page = await dbGet('SELECT * FROM pages WHERE id = ? AND book_id = ?', [pageIdentifier, book.id]);
    }

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

app.patch('/api/books/:bookIdentifier/pages/:pageIdentifier', authenticateToken, async (req, res) => {
  const { bookIdentifier, pageIdentifier } = req.params;
  const { title, content_html } = req.body;

  try {
    // Find book
    let book = await dbGet('SELECT * FROM books WHERE title = ? AND user_id = ?', [decodeURIComponent(bookIdentifier), req.user.id]);
    if (!book) {
      book = await dbGet('SELECT * FROM books WHERE id = ? AND user_id = ?', [bookIdentifier, req.user.id]);
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Find page
    let page = await dbGet('SELECT * FROM pages WHERE title = ? AND book_id = ?', [decodeURIComponent(pageIdentifier), book.id]);
    if (!page) {
      page = await dbGet('SELECT * FROM pages WHERE id = ? AND book_id = ?', [pageIdentifier, book.id]);
    }
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const pageId = page.id;

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (content_html !== undefined) {
      const sanitized = sanitizeHTML(content_html);
      const wordCount = calculateWordCount(sanitized);
      updates.push('content_html = ?');
      updates.push('word_count = ?');
      values.push(sanitized, wordCount);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(pageId);

    await dbRun(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, values);

    // Save revision if content changed
    if (content_html !== undefined) {
      const sanitized = sanitizeHTML(content_html);
      await dbRun(
        'INSERT INTO page_revisions (page_id, content_html) VALUES (?, ?)',
        [pageId, sanitized]
      );

      // Keep only last 10 revisions per page
      await dbRun(
        `DELETE pr1 FROM page_revisions pr1
         LEFT JOIN (
           SELECT id FROM page_revisions WHERE page_id = ? ORDER BY created_at DESC LIMIT 10
         ) pr2 ON pr1.id = pr2.id
         WHERE pr1.page_id = ? AND pr2.id IS NULL`,
        [pageId, pageId]
      );
    }

    const updatedPage = await dbGet('SELECT * FROM pages WHERE id = ?', [pageId]);
    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

app.delete('/api/books/:bookIdentifier/pages/:pageIdentifier', authenticateToken, async (req, res) => {
  const { bookIdentifier, pageIdentifier } = req.params;

  try {
    // Find book
    let book = await dbGet('SELECT * FROM books WHERE title = ? AND user_id = ?', [decodeURIComponent(bookIdentifier), req.user.id]);
    if (!book) {
      book = await dbGet('SELECT * FROM books WHERE id = ? AND user_id = ?', [bookIdentifier, req.user.id]);
    }
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Find page
    let page = await dbGet('SELECT * FROM pages WHERE title = ? AND book_id = ?', [decodeURIComponent(pageIdentifier), book.id]);
    if (!page) {
      page = await dbGet('SELECT * FROM pages WHERE id = ? AND book_id = ?', [pageIdentifier, book.id]);
    }
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const pageId = page.id;

    await dbRun('DELETE FROM pages WHERE id = ?', [pageId]);
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Duplicate page
app.post('/api/pages/:pageId/duplicate', authenticateToken, async (req, res) => {
  const { pageId } = req.params;

  try {
    const owns = await checkOwnership('pages', pageId, req.user.id);
    if (!owns) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const page = await dbGet('SELECT * FROM pages WHERE id = ?', [pageId]);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const result = await dbRun(
      'INSERT INTO pages (book_id, title, content_html, word_count) VALUES (?, ?, ?, ?)',
      [page.book_id, `${page.title} (Copy)`, page.content_html, page.word_count]
    );

    const newPage = await dbGet('SELECT * FROM pages WHERE id = ?', [result.lastID]);
    res.status(201).json(newPage);
  } catch (error) {
    console.error('Error duplicating page:', error);
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

