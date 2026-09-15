// Local dev database. SQLite so you can run everything with zero external accounts.
// Swap for db/schema.sql on Postgres before going live (see README).

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const db = new Database(path.join(__dirname, '..', 'zemba.dev.sqlite'));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  business_name TEXT,
  phone_number TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  momo_provider TEXT,
  momo_number TEXT,
  approval_status TEXT DEFAULT 'PENDING',
  account_status TEXT DEFAULT 'ACTIVE',
  user_category TEXT DEFAULT 'CUSTOMER',
  newsletter_opt_in INTEGER DEFAULT 1,
  ban_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 1,
  image_url TEXT,
  approval_status TEXT DEFAULT 'PENDING',
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_reference TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  seller_id TEXT,
  product_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount REAL NOT NULL,
  platform_fee REAL NOT NULL,
  net_amount REAL NOT NULL,
  status TEXT DEFAULT 'PENDING_PAYMENT',
  gateway_transaction_id TEXT,
  delivery_code TEXT,
  waybill_image_url TEXT,
  timeout_days INTEGER DEFAULT 3,
  timeout_warning_sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  raised_by TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  admin_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT DEFAULT 'ALL',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  product_rating INTEGER NOT NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating INTEGER NOT NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'NEW',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quick_links (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  product_id TEXT,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

for (const statement of [
  `ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'PENDING'`,
  `ALTER TABLE products ADD COLUMN approval_status TEXT DEFAULT 'PENDING'`,
  `ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'ACTIVE'`,
  `ALTER TABLE users ADD COLUMN user_category TEXT DEFAULT 'CUSTOMER'`,
  `ALTER TABLE users ADD COLUMN newsletter_opt_in INTEGER DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN ban_reason TEXT`,
  `UPDATE users SET approval_status = 'APPROVED' WHERE role = 'admin' OR email LIKE '%@zemba.demo'`,
  `UPDATE products SET approval_status = 'APPROVED' WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@zemba.demo')`,
  `UPDATE users SET user_category = CASE WHEN role = 'seller' THEN 'SELLER' WHEN role = 'admin' THEN 'ADMIN' ELSE 'CUSTOMER' END WHERE user_category IS NULL`,
]) {
  try { db.exec(statement); } catch (error) {
    if (!String(error).includes('duplicate column name')) throw error;
  }
}

for (const statement of [
  `ALTER TABLE orders ADD COLUMN waybill_image_url TEXT`,
  `ALTER TABLE orders ADD COLUMN timeout_days INTEGER DEFAULT 3`,
  `ALTER TABLE orders ADD COLUMN timeout_warning_sent_at TEXT`,
]) {
  try { db.exec(statement); } catch (error) {
    if (!String(error).includes('duplicate column name')) throw error;
  }
}

function upsertUser(u) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    const current = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(u.email);
    if (!String(current.password_hash).startsWith('$2')) {
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(bcrypt.hashSync(u.password, 10), u.email);
    }
    return existing.id;
  }
  db.prepare(`
    INSERT INTO users (id, role, full_name, business_name, phone_number, email, password_hash, momo_provider, momo_number, approval_status, user_category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
  `).run(u.id, u.role, u.full_name, u.business_name || null, u.phone_number, u.email, bcrypt.hashSync(u.password, 10), u.momo_provider || null, u.momo_number || null, u.role.toUpperCase());
  return u.id;
}

// Demo accounts. Passwords are plain text for this local demo ONLY — see README.
const customerId = upsertUser({
  id: 'demo-customer-1', role: 'customer', full_name: 'Chanda Buyer',
  phone_number: '+260971111111', email: 'customer@zemba.demo', password: 'demo1234',
});
const sellerId = upsertUser({
  id: 'demo-seller-1', role: 'seller', full_name: 'Alberto', business_name: 'Alberto Demo Store',
  phone_number: '+260970000000', email: 'seller@zemba.demo', password: 'demo1234',
  momo_provider: 'MTN', momo_number: '+260970000000',
});
const adminId = upsertUser({
  id: 'demo-admin-1', role: 'admin', full_name: 'Platform Admin',
  phone_number: '+260979999999', email: 'admin@zemba.demo', password: 'demo1234',
});

// Add vendor verification for demo seller
try {
  const existing = db.prepare('SELECT id FROM vendor_verification WHERE user_id = ?').get(sellerId);
  if (!existing) {
    db.prepare(`
      INSERT INTO vendor_verification (id, user_id, nrc_number, location, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(crypto.randomUUID(), sellerId, '123456/89/1', 'Lusaka');
  }
} catch (error) {
  if (!String(error).includes('no such table')) throw error;
}

const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const seedProducts = [
    ['Handwoven Chitenge Tote Bag', 'Locally made tote, durable cotton lining.', 180, 'Fashion'],
    ['Bluetooth Earbuds (New, Sealed)', 'Fast-charging case, 20hr battery.', 350, 'Electronics'],
    ['5kg Bag of Roasted Coffee Beans', 'Small-batch roasted in Lusaka.', 220, 'Food & Drink'],
    ['Second-hand iPhone 11, 64GB', 'Good condition, battery health 86%.', 2800, 'Electronics'],
    ['Ankara Print Dress, Size M', 'Tailored locally, true to size.', 260, 'Fashion'],
  ];
  const insert = db.prepare(`
    INSERT INTO products (id, seller_id, title, description, price, category, stock, approval_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'ACTIVE')
  `);
  for (const [title, description, price, category] of seedProducts) {
    insert.run(crypto.randomUUID(), sellerId, title, description, price, category, Math.ceil(Math.random() * 8));
  }
  console.log('Seeded demo products.');
}

console.log('Zemba Marketplace dev database ready at zemba.dev.sqlite');
console.log('Demo logins:');
console.log('  Customer -> customer@zemba.demo / demo1234');
console.log('  Seller   -> seller@zemba.demo / demo1234');
console.log('  Admin    -> admin@zemba.demo / demo1234');
db.close();
