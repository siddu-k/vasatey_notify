# Vasatey Notify Deployment Checklist

## Pre-Deployment Setup

### 1. Firebase Configuration
- [ ] Firebase project created
- [ ] Cloud Messaging enabled in Firebase Console
- [ ] Service account key generated and downloaded
- [ ] Service account key JSON content copied

### 2. Repository Setup
- [ ] Code pushed to GitHub repository
- [ ] Repository is public or connected to your Vercel account
- [ ] All files are committed and pushed

### 3. Vercel Setup
- [ ] Vercel account created
- [ ] GitHub account connected to Vercel

## Deployment Steps

### 1. Deploy to Vercel
- [ ] New project created in Vercel dashboard
- [ ] GitHub repository imported
- [ ] Build and output settings configured (leave as default)
- [ ] Project deployed successfully

### 2. Environment Variables
- [ ] `FIREBASE_SERVICE_ACCOUNT` added to Vercel project settings
- [ ] Environment variable value contains complete JSON service account key
- [ ] Environment variable saved and deployment redeployed

### 3. Domain Configuration
- [ ] Custom domain added (optional)
- [ ] SSL certificate active
- [ ] DNS settings configured (if using custom domain)

## Post-Deployment Testing

### 1. Health Check
- [ ] Visit `https://your-app-name.vercel.app/api/health`
- [ ] Response shows `"status": "healthy"`
- [ ] Firebase configuration shows `"firebase_configured": true`

### 2. Notification Test
- [ ] Get a valid FCM token from your Android app
- [ ] Test notification sending using curl or Postman:
```bash
curl -X POST https://your-app-name.vercel.app/api/sendNotification \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_FCM_TOKEN",
    "title": "Test Alert",
    "body": "Testing Vasatey notification system"
  }'
```
- [ ] Notification received on target device
- [ ] API returns success response with message ID

### 3. Integration Testing
- [ ] Update Android app with new API endpoint URL
- [ ] Test emergency alert flow end-to-end
- [ ] Verify notifications reach all guardians
- [ ] Test error handling (invalid tokens, etc.)

## Production Readiness

### 1. Monitoring Setup
- [ ] Vercel dashboard bookmarked for monitoring
- [ ] Function logs accessible and working
- [ ] Error alerts configured (optional)

### 2. Documentation
- [ ] API endpoint URL documented for mobile team
- [ ] Error handling procedures documented
- [ ] Backup/recovery plan in place

### 3. Security Review
- [ ] Environment variables secured
- [ ] No sensitive data in code repository
- [ ] CORS headers properly configured
- [ ] Rate limiting considerations reviewed

## Maintenance

### 1. Regular Tasks
- [ ] Monitor function usage in Vercel dashboard
- [ ] Check Firebase quota usage
- [ ] Review error logs weekly
- [ ] Update dependencies monthly

### 2. Scaling Considerations
- [ ] Monitor Vercel free tier limits
- [ ] Plan for Firebase quota increases if needed
- [ ] Consider upgrading to Vercel Pro if traffic increases

## Troubleshooting Common Issues

### API Returns 500 Error
- Check Vercel function logs
- Verify FIREBASE_SERVICE_ACCOUNT is properly formatted JSON
- Ensure Firebase project has Cloud Messaging enabled

### Notifications Not Delivered
- Verify FCM token is valid and current
- Check Firebase project configuration
- Confirm device has internet connection
- Review Firebase quotas and limits

### CORS Issues
- Verify CORS headers in API response
- Check if request is being made from allowed origin
- Test with Postman to isolate client-side issues

---

✅ **Deployment Complete!** 

Your Vasatey Notify API is now live at: `https://your-app-name.vercel.app`

🔗 **Quick Links:**
- Health Check: `https://your-app-name.vercel.app/api/health`
- Send Notification: `https://your-app-name.vercel.app/api/sendNotification`
- Vercel Dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com/