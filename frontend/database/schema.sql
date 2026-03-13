-- ===============================================
-- PLACEMENT ELIGIBILITY APP - DATABASE SCHEMA
-- ===============================================
-- Author: BHARATH M B (7376232AD117)
-- Date: 03-02-2026
-- Platform: MySQL / PostgreSQL Compatible
-- ===============================================

-- Database Creation
CREATE DATABASE IF NOT EXISTS placement_app;
USE placement_app;

-- ===============================================
-- TABLE: users
-- Stores authentication and basic user information
-- ===============================================
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- ===============================================
-- TABLE: students
-- Stores detailed student academic information
-- ===============================================
CREATE TABLE students (
    student_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    register_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(50) NOT NULL,
    cgpa DECIMAL(3, 2) CHECK (cgpa >= 0 AND cgpa <= 10),
    backlogs INT DEFAULT 0 CHECK (backlogs >= 0),
    phone VARCHAR(15),
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_department (department),
    INDEX idx_cgpa (cgpa),
    INDEX idx_register_number (register_number)
);

-- ===============================================
-- TABLE: companies
-- Stores company information and eligibility criteria
-- ===============================================
CREATE TABLE companies (
    company_id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    min_cgpa DECIMAL(3, 2) NOT NULL CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
    max_backlogs INT NOT NULL CHECK (max_backlogs >= 0),
    package_offered VARCHAR(100),
    job_description TEXT,
    company_website VARCHAR(255),
    recruitment_date DATE,
    application_deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_company_name (company_name),
    INDEX idx_min_cgpa (min_cgpa),
    INDEX idx_is_active (is_active)
);

-- ===============================================
-- TABLE: eligible_departments
-- Stores which departments are eligible for each company
-- ===============================================
CREATE TABLE eligible_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_dept (company_id, department),
    INDEX idx_company_dept (company_id, department)
);

-- ===============================================
-- TABLE: eligibility_results
-- Stores eligibility check results for audit trail
-- ===============================================
CREATE TABLE eligibility_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50) NOT NULL,
    is_eligible BOOLEAN NOT NULL,
    eligibility_reasons TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    student_cgpa DECIMAL(3, 2),
    student_backlogs INT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    INDEX idx_student_company (student_id, company_id),
    INDEX idx_checked_at (checked_at)
);

-- ===============================================
-- TABLE: applications
-- Stores student applications to companies
-- ===============================================
CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50) NOT NULL,
    application_status ENUM('applied', 'shortlisted', 'rejected', 'selected', 'withdrawn') DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_company (student_id, company_id),
    INDEX idx_status (application_status),
    INDEX idx_applied_at (applied_at)
);

-- ===============================================
-- TABLE: placement_statistics
-- Stores aggregate statistics for dashboard
-- ===============================================
CREATE TABLE placement_statistics (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    total_students INT DEFAULT 0,
    total_companies INT DEFAULT 0,
    students_placed INT DEFAULT 0,
    average_package DECIMAL(10, 2),
    highest_package DECIMAL(10, 2),
    lowest_package DECIMAL(10, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_academic_year (academic_year)
);

-- ===============================================
-- TABLE: admin_logs
-- Stores admin activity logs for security
-- ===============================================
CREATE TABLE admin_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id),
    INDEX idx_admin_created (admin_id, created_at)
);

-- ===============================================
-- SAMPLE DATA INSERTION
-- ===============================================

-- Insert Sample Users
INSERT INTO users (user_id, email, password_hash, role) VALUES
('user_001', 'student@bitsathy.ac.in', '$2b$10$samplehash1', 'student'),
('user_002', 'admin@bitsathy.ac.in', '$2b$10$samplehash2', 'admin'),
('user_003', 'bharathmb.ad23@bitsathy.ac.in', '$2b$10$samplehash3', 'student');

-- Insert Sample Students
INSERT INTO students (student_id, user_id, name, register_number, department, cgpa, backlogs) VALUES
('std_001', 'user_001', 'John Doe', '7376232CS101', 'CSE', 8.5, 0),
('std_002', 'user_003', 'Bharath M B', '7376232AD117', 'AI&DS', 8.5, 0);

-- Insert Sample Companies
INSERT INTO companies (company_id, company_name, min_cgpa, max_backlogs, package_offered, job_description) VALUES
('comp_001', 'TCS', 6.0, 2, '3.5-4.5 LPA', 'Leading IT services company'),
('comp_002', 'Infosys', 6.5, 1, '4.5-5 LPA', 'Global consulting and IT services'),
('comp_003', 'Google', 8.5, 0, '18-22 LPA', 'Technology leader in search and cloud'),
('comp_004', 'Microsoft', 8.5, 0, '20-25 LPA', 'Software and cloud computing giant');

-- Insert Eligible Departments
INSERT INTO eligible_departments (company_id, department) VALUES
('comp_001', 'CSE'),
('comp_001', 'ECE'),
('comp_001', 'MECH'),
('comp_001', 'EEE'),
('comp_001', 'AI&DS'),
('comp_002', 'CSE'),
('comp_002', 'AI&DS'),
('comp_002', 'IT'),
('comp_003', 'CSE'),
('comp_003', 'AI&DS'),
('comp_004', 'CSE'),
('comp_004', 'AI&DS'),
('comp_004', 'IT');

-- ===============================================
-- VIEWS FOR COMMON QUERIES
-- ===============================================

-- View: Student Eligibility Summary
CREATE VIEW student_eligibility_summary AS
SELECT 
    s.student_id,
    s.name,
    s.register_number,
    s.department,
    s.cgpa,
    s.backlogs,
    COUNT(DISTINCT c.company_id) as total_companies,
    COUNT(DISTINCT CASE 
        WHEN s.cgpa >= c.min_cgpa 
        AND s.backlogs <= c.max_backlogs 
        AND EXISTS (
            SELECT 1 FROM eligible_departments ed 
            WHERE ed.company_id = c.company_id 
            AND ed.department = s.department
        )
        THEN c.company_id 
    END) as eligible_companies
FROM students s
CROSS JOIN companies c
WHERE c.is_active = TRUE
GROUP BY s.student_id, s.name, s.register_number, s.department, s.cgpa, s.backlogs;

-- View: Company Application Stats
CREATE VIEW company_application_stats AS
SELECT 
    c.company_id,
    c.company_name,
    c.min_cgpa,
    c.max_backlogs,
    c.package_offered,
    COUNT(DISTINCT a.student_id) as total_applications,
    COUNT(DISTINCT CASE WHEN a.application_status = 'selected' THEN a.student_id END) as students_selected
FROM companies c
LEFT JOIN applications a ON c.company_id = a.company_id
WHERE c.is_active = TRUE
GROUP BY c.company_id, c.company_name, c.min_cgpa, c.max_backlogs, c.package_offered;

-- ===============================================
-- STORED PROCEDURES
-- ===============================================

-- Procedure: Check Student Eligibility for a Company
DELIMITER //
CREATE PROCEDURE CheckEligibility(
    IN p_student_id VARCHAR(50),
    IN p_company_id VARCHAR(50),
    OUT p_is_eligible BOOLEAN,
    OUT p_reasons TEXT
)
BEGIN
    DECLARE v_cgpa DECIMAL(3,2);
    DECLARE v_backlogs INT;
    DECLARE v_department VARCHAR(50);
    DECLARE v_min_cgpa DECIMAL(3,2);
    DECLARE v_max_backlogs INT;
    DECLARE v_dept_eligible INT;
    
    SET p_reasons = '';
    SET p_is_eligible = TRUE;
    
    -- Get student details
    SELECT cgpa, backlogs, department 
    INTO v_cgpa, v_backlogs, v_department
    FROM students 
    WHERE student_id = p_student_id;
    
    -- Get company criteria
    SELECT min_cgpa, max_backlogs
    INTO v_min_cgpa, v_max_backlogs
    FROM companies
    WHERE company_id = p_company_id;
    
    -- Check department eligibility
    SELECT COUNT(*) INTO v_dept_eligible
    FROM eligible_departments
    WHERE company_id = p_company_id AND department = v_department;
    
    -- Check CGPA
    IF v_cgpa < v_min_cgpa THEN
        SET p_is_eligible = FALSE;
        SET p_reasons = CONCAT(p_reasons, 'CGPA too low (Required: ', v_min_cgpa, '); ');
    END IF;
    
    -- Check Backlogs
    IF v_backlogs > v_max_backlogs THEN
        SET p_is_eligible = FALSE;
        SET p_reasons = CONCAT(p_reasons, 'Too many backlogs (Max: ', v_max_backlogs, '); ');
    END IF;
    
    -- Check Department
    IF v_dept_eligible = 0 THEN
        SET p_is_eligible = FALSE;
        SET p_reasons = CONCAT(p_reasons, 'Department not eligible; ');
    END IF;
    
    -- Log the result
    INSERT INTO eligibility_results (student_id, company_id, is_eligible, eligibility_reasons, student_cgpa, student_backlogs)
    VALUES (p_student_id, p_company_id, p_is_eligible, p_reasons, v_cgpa, v_backlogs);
END //
DELIMITER ;

-- ===============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ===============================================

-- Additional composite indexes
CREATE INDEX idx_student_cgpa_backlogs ON students(cgpa, backlogs);
CREATE INDEX idx_company_criteria ON companies(min_cgpa, max_backlogs, is_active);

-- ===============================================
-- END OF SCHEMA
-- ===============================================
