// api/sendNotification.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      token, 
      title, 
      body, 
      email, 
      isSelfAlert,
      fullName,
      phoneNumber,
      lastKnownLatitude,
      lastKnownLongitude
    } = req.body;

    // Validate required fields
    if (!token || !title || !body || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['token', 'title', 'body', 'email']
      });
    }

    console.log(`Sending notification to ${email}`);
    console.log(`Location: ${lastKnownLatitude}, ${lastKnownLongitude}`);

    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: {
        email: email,
        fullName: fullName || '',
        phoneNumber: phoneNumber || '',
        latitude: lastKnownLatitude ? String(lastKnownLatitude) : '',
        longitude: lastKnownLongitude ? String(lastKnownLongitude) : '',
        isSelfAlert: String(isSelfAlert || false)
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'emergency_alerts'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent:', response);
    
    return res.status(200).json({ 
      success: true,
      messageId: response
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
}
