const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase configuration error');
  }
}

const db = admin.firestore();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are supported' 
    });
  }

  try {
    const startTime = Date.now();
    let totalDeleted = 0;
    const errors = [];

    // Get days old from request, default to 30 days
    const { daysOld = 30 } = req.body;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    console.log(`Starting cleanup of alerts older than ${cutoffDate.toISOString()}`);

    // Get all old alerts from the main alerts collection
    const alertsQuery = db.collection('alerts')
      .where('timestamp', '<', cutoffDate);
      
    const alertsSnapshot = await alertsQuery.get();
    
    if (alertsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No old alerts found to delete',
        stats: {
          totalDeleted: 0,
          daysOld,
          cutoffDate: cutoffDate.toISOString(),
          duration: `${Date.now() - startTime}ms`
        }
      });
    }

    console.log(`Found ${alertsSnapshot.size} old alerts to delete`);

    // Delete alerts in batches (Firestore limit: 500 operations per batch)
    const batchSize = 450; // Leave some room for safety
    const alertDocs = alertsSnapshot.docs;
    
    for (let i = 0; i < alertDocs.length; i += batchSize) {
      try {
        const batch = db.batch();
        const batchDocs = alertDocs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        totalDeleted += batchDocs.length;
        
        console.log(`Deleted batch of ${batchDocs.length} alerts`);
      } catch (batchError) {
        console.error(`Error deleting batch starting at index ${i}:`, batchError);
        errors.push({
          batchIndex: i,
          error: batchError.message
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: 'Alert cleanup completed',
      stats: {
        totalDeleted,
        daysOld,
        cutoffDate: cutoffDate.toISOString(),
        duration: `${duration}ms`,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Cleanup completed:', result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error during cleanup:', error);
    
    return res.status(500).json({
      error: 'Cleanup failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}