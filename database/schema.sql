-- SQL Schema for Scholar Management System

-- Drop tables if they exist (for easy schema resets)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS academic_results CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS scholars CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 0. Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name, code, description) VALUES
('Programs', 'PROG', 'Core program operations and scholar support.'),
('Finance & Administration', 'FIN', 'Financial management and office administration.'),
('Human Resources', 'HR', 'Staff recruitment and personnel management.'),
('Information Technology', 'IT', 'Systems maintenance and technical support.'),
('Field Operations', 'FIELD', 'On-the-ground coordination in regional offices.'),
('Monitoring & Evaluation', 'ME', 'Impact tracking and data analysis.');

-- 1. Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'person',
    color VARCHAR(20) DEFAULT '#4C3C32',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default roles matching frontend
INSERT INTO roles (name, description, icon, color, is_system_role) VALUES
('Administrator', 'Full system access, including user and role management.', 'shield_rounded', '#9C27B0', TRUE),
('Program Manager', 'Oversees scholars, schools, sponsors, and academic records.', 'supervisor_account_rounded', '#2196F3', TRUE),
('Data Officer', 'Manages scholar data entry, attendance, and reporting.', 'storage_rounded', '#009688', TRUE),
('Finance Officer', 'Handles budgets, disbursements, and financial reporting.', 'attach_money_rounded', '#EF6C00', TRUE),
('Field Coordinator', 'Manages on-the-ground scholar visits and attendance.', 'map_rounded', '#3F51B5', FALSE),
('Volunteer', 'Limited, read-only access to scholar and program info.', 'volunteer_activism_rounded', '#607D8B', FALSE);

-- 2. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    is_first_login BOOLEAN DEFAULT TRUE,
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial Administrator users
-- Default Admin -> Email: admin@ageafrica.org, Password: Password123!
-- Personal Admin -> Email: edwardyoungshaba133@gmail.com, Password: Password123!
INSERT INTO users (email, username, password_hash, role_id, department_id, full_name, phone)
VALUES
('admin@ageafrica.org', 'admin', '$2b$10$Xy0f.8L.B3r4mP3pG5U7eOq/mK6.wEw.jU.v7v.v7v.v7v.v7v.v7', 1, 4, 'System Admin', '+265888000000'),
('edwardyoungshaba133@gmail.com', 'edward', '$2b$10$Xy0f.8L.B3r4mP3pG5U7eOq/mK6.wEw.jU.v7v.v7v.v7v.v7v.v7', 1, 4, 'Edward Young Shaba', '+265888000000');

-- 3. Schools Table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    level VARCHAR(50) NOT NULL, -- Primary, Secondary, Tertiary, etc.
    type VARCHAR(50) NOT NULL, -- Public, Private, etc.
    gender_policy VARCHAR(50), -- Mixed, Boys, Girls
    region VARCHAR(50),
    district VARCHAR(50),
    address TEXT,
    postal_address VARCHAR(150),
    phone VARCHAR(30),
    alt_phone VARCHAR(30),
    email VARCHAR(100),
    website VARCHAR(150),
    admin_name VARCHAR(100),
    admin_role VARCHAR(100),
    admin_phone VARCHAR(30),
    admin_email VARCHAR(100),
    description TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sponsors Table
CREATE TABLE sponsors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Optional link to user login
    name VARCHAR(150) NOT NULL,
    organization VARCHAR(150),
    email VARCHAR(100),
    phone VARCHAR(30),
    contact_person VARCHAR(100),
    sponsorship_type VARCHAR(50), -- Platinum, Gold, Silver, Bronze, In-Kind
    amount NUMERIC(15, 2) DEFAULT 0,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Scholars Table
CREATE TABLE scholars (
    id SERIAL PRIMARY KEY,
    scholar_id VARCHAR(50) UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    sponsor_id INTEGER REFERENCES sponsors(id) ON DELETE SET NULL,
    dob DATE NOT NULL,
    sex VARCHAR(20),
    phone VARCHAR(30),
    village VARCHAR(150),
    district VARCHAR(100),
    school_type VARCHAR(50), -- Secondary, University
    school_name VARCHAR(150), -- Backup if school_id is null
    previous_school VARCHAR(150),
    program_type VARCHAR(50), -- Degree, Diploma, Certificate
    program_name VARCHAR(150), -- e.g., BSc Computer Science
    start_year VARCHAR(10),
    end_year VARCHAR(10),
    donor VARCHAR(150), -- Direct donor name matching frontend
    status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive, Graduated, Suspended
    academic_year VARCHAR(50), -- e.g., Form 3, Year 2
    guardian_name VARCHAR(150),
    guardian_phone VARCHAR(30),
    guardian_email VARCHAR(100),
    guardian_relation VARCHAR(100),
    guardian_occupation VARCHAR(150),
    progression_status VARCHAR(20) DEFAULT 'Pending', -- Moved, Failed, Pending
    progression_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Attendance Tables
CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- CHATs, Study Circle
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    facilitator VARCHAR(100),
    location VARCHAR(150),
    month VARCHAR(20),
    week_number INTEGER,
    year INTEGER,
    term VARCHAR(20),
    semester VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    scholar_id INTEGER REFERENCES scholars(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- present, absent, late, excused
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, scholar_id)
);

-- 7. Subjects Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    level VARCHAR(50) NOT NULL, -- Secondary, University
    details TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Academic Results Table
CREATE TABLE academic_results (
    id SERIAL PRIMARY KEY,
    scholar_id INTEGER REFERENCES scholars(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    marks NUMERIC(5, 2) NOT NULL,
    grade_letter VARCHAR(10),
    grade_point NUMERIC(4, 2), -- Stores GPA or Points
    year INTEGER NOT NULL,
    term VARCHAR(20), -- Term 1, 2, 3
    semester VARCHAR(20), -- Semester 1, 2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE NULLS NOT DISTINCT (scholar_id, subject_id, year, term, semester)
);

-- 9. Payments (Finance) Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    scholar_id INTEGER REFERENCES scholars(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Completed, Failed, Refunded
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purpose VARCHAR(150) NOT NULL, -- Tuition, Uniform, Books, Pocket Money
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    scholar_id INTEGER REFERENCES scholars(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    path VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- ReportCard, ID, SponsorAgreement, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info', -- info, success, warning, error
    actor_name VARCHAR(100) DEFAULT 'System',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Logs Table (System & Admin actions)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    actor_name VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Organisation Profile
CREATE TABLE organisation_profile (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50), -- Non-Profit, Private, etc.
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(100),
    website VARCHAR(150),
    org_id VARCHAR(50) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_date VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial organisation data
INSERT INTO organisation_profile (name, type, address, phone, email, website, org_id, is_verified, created_date)
VALUES ('AGE Africa', 'Non-Profit', 'Lilongwe, Malawi', '+265 999 123 456', 'info@ageafrica.org', 'www.ageafrica.org', 'AGE-2026-0987', TRUE, 'July 2026');

-- 13. User Settings (Personal Preferences)
CREATE TABLE user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system', -- light, dark, system
    notifications_enabled BOOLEAN DEFAULT TRUE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    language VARCHAR(50) DEFAULT 'English (Malawi)',
    currency VARCHAR(50) DEFAULT 'Malawian Kwacha (MWK)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Backups Table
CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    file_path VARCHAR(255),
    file_size VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Events Table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    organizer VARCHAR(150),
    targeted_participants TEXT[], -- Array of strings
    status VARCHAR(20) DEFAULT 'Pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Backup Settings
CREATE TABLE backup_settings (
    id SERIAL PRIMARY KEY,
    auto_backup_enabled BOOLEAN DEFAULT TRUE,
    frequency VARCHAR(20) DEFAULT 'Daily', -- Hourly, Daily, Weekly, Monthly
    wifi_only BOOLEAN DEFAULT TRUE,
    last_backup_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO backup_settings (auto_backup_enabled, frequency, wifi_only) VALUES (TRUE, 'Daily', TRUE);

