# Vasatey Notify - Serverless FCM Gateway

A free, serverless Firebase Cloud Messaging (FCM) gateway built for Vercel that enables real-time notifications for the Vasatey safety app.

## 🚀 Features

- **Serverless**: Runs on Vercel's free tier with zero maintenance
- **Secure**: Firebase Admin SDK integration with service account authentication
- **Fast**: Global edge deployment for minimal latency
- **Reliable**: Built-in error handling and retry mechanisms
- **CORS Enabled**: Works from any web or mobile application

## 📋 Prerequisites

1. **Firebase Project**: Set up at [Firebase Console](https://console.firebase.google.com/)
2. **Vercel Account**: Sign up at [Vercel](https://vercel.com/)
3. **GitHub Repository**: To connect with Vercel for auto-deployment

## 🛠️ Setup Instructions

### Step 1: Generate Firebase Service Account Key

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** (gear icon)
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file and copy its contents

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Fork or clone this repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **New Project**
4. Import your GitHub repository
5. Configure environment variables (see below)
6. Deploy!

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Clone and setup
git clone <your-repo-url>
cd vasatey-notify
npm install

# Deploy
vercel

# Add environment variables
vercel env add FIREBASE_SERVICE_ACCOUNT
```

### Step 3: Configure Environment Variables

In your Vercel project settings, add:

| Variable Name | Value | Required |
|---------------|--------|----------|
| `FIREBASE_SERVICE_ACCOUNT` | Your Firebase service account JSON (entire content) | ✅ |

**Important**: Paste the entire JSON content of your Firebase service account key as the value for `FIREBASE_SERVICE_ACCOUNT`.

## 📡 API Usage

### Send Notification

**Endpoint**: `POST /api/sendNotification`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "FCM_DEVICE_TOKEN",
  "title": "Alert Title",
  "body": "Alert message body",
  "data": {
    "alertType": "emergency",
    "userId": "user123",
    "location": "latitude,longitude"
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "messageId": "projects/your-project/messages/0:1234567890",
  "timestamp": "2025-11-02T10:30:00.000Z"
}
```

**Error Response** (400/404/500):
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "code": "messaging/registration-token-not-registered"
}
```

## 🔗 Integration with Vasatey App

### Android Integration Example

```kotlin
// In your Android app
class NotificationService {
    private val apiUrl = "https://your-app-name.vercel.app/api/sendNotification"
    
    suspend fun sendEmergencyAlert(guardianToken: String, userLocation: String) {
        val requestBody = JSONObject().apply {
            put("token", guardianToken)
            put("title", "🚨 Vasatey Emergency Alert")
            put("body", "Your contact needs help! Click to view location.")
            put("data", JSONObject().apply {
                put("alertType", "emergency")
                put("location", userLocation)
                put("timestamp", System.currentTimeMillis())
            })
        }
        
        val request = Request.Builder()
            .url(apiUrl)
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .build()
            
        client.newCall(request).execute()
    }
}
```

### Firestore Integration

Store guardian FCM tokens in Firestore:

```javascript
// Structure in Firestore
/users/{userId}/guardians/{guardianId}
{
  name: "Guardian Name",
  fcmToken: "FCM_TOKEN_HERE",
  phone: "+1234567890",
  relationship: "parent",
  createdAt: timestamp
}
```

## 🧪 Testing

### Test with curl:
```bash
curl -X POST https://your-app-name.vercel.app/api/sendNotification \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_FCM_TOKEN",
    "title": "Test Alert",
    "body": "This is a test notification from Vasatey"
  }'
```

### Local Development:
```bash
# Install dependencies
npm install

# Start development server
vercel dev

# Test locally at http://localhost:3000/api/sendNotification
```

## 🔒 Security Features

- **Environment Variables**: Sensitive data stored securely in Vercel
- **CORS Protection**: Configurable cross-origin access
- **Input Validation**: All inputs validated before processing
- **Error Handling**: No sensitive information exposed in errors
- **Rate Limiting**: Vercel's built-in protection against abuse

## 📊 Monitoring & Logs

View logs in your Vercel dashboard:
1. Go to your project in Vercel
2. Click on **Functions** tab
3. Select **api/sendNotification.js**
4. View real-time logs and metrics

## 🚨 Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `messaging/registration-token-not-registered` | FCM token expired/invalid | Update the token in your app |
| `messaging/invalid-argument` | Invalid request format | Check request body structure |
| `400` | Missing required fields | Ensure token, title, and body are provided |
| `500` | Server error | Check Vercel logs for details |

## 💰 Cost Analysis

This setup uses only **free tiers**:

- **Vercel**: 100GB bandwidth, 100 serverless function invocations per day (free tier)
- **Firebase**: 20K messages per month (free tier)
- **Total Cost**: $0/month for typical usage

## 🔄 Auto-Deployment

Once connected to GitHub:
1. Push changes to your repository
2. Vercel automatically deploys updates
3. Zero downtime deployments
4. Rollback capability if needed

## 📞 Support

For issues related to:
- **Firebase**: Check [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **This API**: Create an issue in this repository

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with ❤️ for the Vasatey safety community