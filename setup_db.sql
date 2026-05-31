-- setup_db.sql
-- EduMarket database va user yaratish

-- User mavjud bo'lsa o'tkazib yubor
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'edumarket') THEN
    CREATE USER edumarket WITH PASSWORD 'EduMarket2026!';
  END IF;
END
$$;

-- Database yaratish
CREATE DATABASE edumarket OWNER edumarket;

-- Kerakli imtiyozlar
GRANT ALL PRIVILEGES ON DATABASE edumarket TO edumarket;

-- Natijani tekshirish
\l edumarket
