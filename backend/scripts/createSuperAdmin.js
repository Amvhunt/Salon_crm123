const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Enhanced validation functions
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validatePassword = (password) => {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
};

const validateEnvironment = () => {
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
    const missingVars = [];
    
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName] || process.env[varName] === '') {
            missingVars.push(varName);
        }
    });

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Warn about weak JWT secret
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️ Warning: JWT_SECRET should be at least 32 characters long for security');
    }

    // Check for default/weak credentials
    if (process.env.SUPERADMIN_PASSWORD && process.env.SUPERADMIN_PASSWORD === '123') {
        console.warn('⚠️ Warning: Default password "123" is weak and should be changed immediately');
    }
};

const User = require('../Models/User');

const createSuperAdmin = async () => {
    try {
        console.log('🔐 Starting SuperAdmin creation process...');
        
        // Validate environment
        validateEnvironment();
        
        // Connect to database
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/salon_crm';
        console.log('📡 Connecting to MongoDB at:', uri.split('@')[1] || 'localhost');
        
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Get superadmin credentials from environment or use defaults
        const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com';
        const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SecurePassword123!';

        // Validate credentials
        if (!validateEmail(superadminEmail)) {
            throw new Error(`Invalid email format: ${superadminEmail}`);
        }

        if (!validatePassword(superadminPassword)) {
            throw new Error(`Password does not meet security requirements:
                - Must be at least 8 characters long
                - Must contain at least one uppercase letter
                - Must contain at least one lowercase letter  
                - Must contain at least one number
                - May contain special characters @$!%*?&`);
        }

        console.log('🔍 Checking if superadmin already exists...');
        
        // Check if superadmin already exists
        const existingSuperAdmin = await User.findOne({ 
            email: superadminEmail,
            role: 'superadmin'
        });

        if (existingSuperAdmin) {
            console.log(`✅ Superadmin already exists with email: ${superadminEmail}`);
            console.log('📋 Superadmin Details:');
            console.log(`   - Name: ${existingSuperAdmin.name}`);
            console.log(`   - Email: ${existingSuperAdmin.email}`);
            console.log(`   - Role: ${existingSuperAdmin.role}`);
            console.log(`   - Status: ${existingSuperAdmin.status}`);
            console.log(`   - Created: ${existingSuperAdmin.createdAt}`);
            return;
        }

        console.log('🚀 Creating new superadmin account...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(superadminPassword, 10);
        
        // Create superadmin
        const superadmin = await User.create({
            name: 'Super Admin',
            email: superadminEmail,
            password: hashedPassword,
            role: 'superadmin',
            status: 'active',
            isActive: true
        });

        console.log('✅ Superadmin created successfully!');
        console.log('📋 Account Details:');
        console.log(`   - Name: ${superadmin.name}`);
        console.log(`   - Email: ${superadmin.email}`);
        console.log(`   - Role: ${superadmin.role}`);
        console.log(`   - Status: ${superadmin.status}`);
        console.log(`   - ID: ${superadmin._id}`);
        
        console.log('\n🔐 Security Information:');
        console.log(`   - Password: ${superadminPassword}`);
        console.log(`   - IMPORTANT: Store this password securely and change it after first login`);
        
        console.log('\n🌐 Login Information:');
        console.log(`   - API URL: http://localhost:${process.env.PORT || 3000}`);
        console.log(`   - Email: ${superadminEmail}`);
        console.log(`   - Password: ${superadminPassword}`);
        
        // Verify the created account
        console.log('\n🔍 Verifying account...');
        const verification = await User.findOne({ email: superadminEmail });
        
        if (verification && verification.role === 'superadmin' && verification.isActive) {
            console.log('✅ Account verification successful');
        } else {
            console.error('❌ Account verification failed');
        }

    } catch (err) {
        console.error('❌ Error creating superadmin:', err.message);
        
        // Provide specific help for common errors
        if (err.message.includes('MongoServerError: bad auth')) {
            console.error('\n💡 Authentication error with MongoDB:');
            console.error('   - Check your MongoDB connection string in .env file');
            console.error('   - Ensure MongoDB is running');
            console.error('   - Verify credentials have access to the database');
        } else if (err.message.includes('ECONNREFUSED')) {
            console.error('\n💡 Connection error:');
            console.error('   - MongoDB server is not running');
            console.error('   - Check if MongoDB is installed and started');
        } else if (err.message.includes('Missing required environment variables')) {
            console.error('\n💡 Environment configuration error:');
            console.error('   - Check your .env file contains the required variables');
            console.error('   - Restart the application after making changes');
        }
        
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Additional utility functions
const updateSuperAdmin = async () => {
    try {
        console.log('🔧 Starting SuperAdmin update process...');
        
        validateEnvironment();
        
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/salon_crm';
        await mongoose.connect(uri);
        
        const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com';
        const newEmail = process.env.NEW_SUPERADMIN_EMAIL;
        const newPassword = process.env.NEW_SUPERADMIN_PASSWORD;
        
        const superadmin = await User.findOne({ email: superadminEmail, role: 'superadmin' });
        
        if (!superadmin) {
            console.error(`❌ Superadmin with email ${superadminEmail} not found`);
            return;
        }
        
        let updated = false;
        
        if (newEmail && newEmail !== superadminEmail) {
            if (!validateEmail(newEmail)) {
                throw new Error(`Invalid email format: ${newEmail}`);
            }
            superadmin.email = newEmail;
            updated = true;
            console.log(`📧 Email updated to: ${newEmail}`);
        }
        
        if (newPassword) {
            if (!validatePassword(newPassword)) {
                throw new Error(`Password does not meet security requirements`);
            }
            superadmin.password = await bcrypt.hash(newPassword, 10);
            updated = true;
            console.log(`🔐 Password updated successfully`);
        }
        
        if (updated) {
            await superadmin.save();
            console.log('✅ Superadmin updated successfully');
        } else {
            console.log('ℹ️ No changes made to superadmin account');
        }
        
    } catch (err) {
        console.error('❌ Error updating superadmin:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// List available commands
const showHelp = () => {
    console.log(`
🔐 SuperAdmin Management Script

Usage:
  node scripts/createSuperAdmin.js [command]

Commands:
  create     - Create a new superadmin account (default)
  update     - Update existing superadmin account  
  help       - Show this help message

Environment Variables:
  SUPERADMIN_EMAIL      - Superadmin email address (default: superadmin@gmail.com)
  SUPERADMIN_PASSWORD   - Superadmin password (default: SecurePassword123!)
  NEW_SUPERADMIN_EMAIL  - New email for update (optional)
  NEW_SUPERADMIN_PASSWORD - New password for update (optional)

Security Requirements:
  - Email must be valid format
  - Password: 8+ chars, uppercase, lowercase, number
  - JWT_SECRET must be set (32+ chars recommended)

Examples:
  node scripts/createSuperAdmin.js create
  node scripts/createSuperAdmin.js update
  SUPERADMIN_EMAIL=admin@salon.com node scripts/createSuperAdmin.js create
    `);
};

// Main execution
const main = async () => {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';
    
    switch (command) {
        case 'create':
            await createSuperAdmin();
            break;
        case 'update':
            await updateSuperAdmin();
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            console.error(`❌ Unknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { createSuperAdmin, updateSuperAdmin, validateEmail, validatePassword, validateEnvironment };