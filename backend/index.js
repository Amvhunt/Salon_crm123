const dotenv = require('dotenv');
// Load env vars
dotenv.config();

const connectDB = require('./Config/db');
const app = require('./app');
const { init } = require('./Utils/socket');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (privateKey && clientEmail && projectId) {
        // Remove surrounding quotes if dotenv left them
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        // Replace literal \n sequences with real newlines
        privateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin initialized successfully ✅');
    } else {
        console.warn('⚠️  Firebase Credentials not found in .env. Push notifications will be skipped but saved to DB.');
    }
} catch (error) {
    console.error('❌ Firebase Initialization Error:', error && error.message ? error.message : error);
}

// Connect to database
connectDB().then(() => {
    const { seedSuperAdmin } = require('./Utils/seed');
    seedSuperAdmin();
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle server listen errors (e.g., port already in use)
server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please free the port or set PORT env var to a different value.`);
        process.exit(1);
    }
    console.error('Server error:', err);
});

// Initialize Socket.io
init(server);

// Start Cron Jobs
const { startWalletExpiryCron } = require('./Utils/cron');
startWalletExpiryCron();

// Handle unhandled romi rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
