# Testing Guide - Backend Integration

Quick reference for testing the integrated frontend and backend.

## Prerequisites

### 1. Start Backend
```bash
cd /Users/chrispark/dev/projects/ridecast/backend
npm install  # if first time
npm run dev
```
Expected output: `Server running on http://localhost:3001`

### 2. Start Frontend
```bash
cd /Users/chrispark/dev/projects/ridecast/web
npm install  # if first time
npm run dev
```
Expected output: `Ready on http://localhost:3000`

### 3. Verify Environment
Check `.env.local` exists:
```bash
cat /Users/chrispark/dev/projects/ridecast/web/.env.local
```
Should contain:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Test Scenarios

### Scenario 1: New User Registration

**Steps:**
1. Open http://localhost:3000
2. Should see auth page (not logged in)
3. Click "Sign up"
4. Fill in:
   - Name: Test User (optional)
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
5. Click "Sign Up"

**Expected:**
- Loading state while creating account
- Automatic login after registration
- Redirect to main app
- See "test@example.com" in top-right
- Network status shows "Online" (green)

**If Fails:**
- Check browser console for errors
- Verify backend is running
- Check network tab for 500 errors
- Look at backend logs

### Scenario 2: Login Existing User

**Steps:**
1. If logged in, click "Logout"
2. Should return to auth page
3. Enter credentials from Scenario 1
4. Click "Log In"

**Expected:**
- Loading state while authenticating
- Redirect to main app
- User email shown in top-right
- Library persists from before logout

**If Fails:**
- Check credentials are correct
- Verify backend database has the user
- Check network tab for 401 errors

### Scenario 3: Upload and Convert Content

**Steps:**
1. Login (if not already)
2. Click "Upload" tab
3. Click file input
4. Select a test file (use `/Users/chrispark/dev/projects/ridecast/sample-content.txt`)
5. Title should auto-fill to "sample-content"
6. Optionally change title to "My First Book"
7. Optionally add author "Test Author"
8. Leave voice as default
9. Click "Convert to Audio"

**Expected Progress:**
1. "Uploading file..." (10%)
2. "Converting to audio..." (20-90%, gradually increases)
3. "Downloading audio..." (90%)
4. "Saving for offline playback..." (95%)
5. "Complete!" (100%)
6. Success message: "Successfully converted! Audio is now available offline in your library."
7. Form resets after 3 seconds

**Expected Duration:**
- Small file (< 1KB): ~10-15 seconds
- Medium file (10-50KB): ~20-40 seconds
- Large file (100KB+): ~40-60 seconds

**If Fails:**
- Check file size (must be < 50MB)
- Check file type (.txt, .epub, .pdf)
- Verify backend logs show conversion started
- Check browser console for upload errors
- Verify internet connection (required for backend)

### Scenario 4: View Library

**Steps:**
1. After converting content (Scenario 3)
2. Click "Library" tab

**Expected:**
- See converted content
- Shows title, author, duration
- "Downloaded" badge visible (green)
- "Play" button enabled (blue)
- Progress bar if partially played

**If Fails:**
- Check browser console for storage errors
- Verify IndexedDB has content
- Try refreshing page

### Scenario 5: Play Audio

**Steps:**
1. Go to Library tab
2. Click "Play" on any downloaded item

**Expected:**
- Player interface appears (bottom of screen or modal)
- Audio plays immediately
- Playback controls work (play, pause, seek)
- Progress saves automatically

**If Fails:**
- Check audio blob exists in IndexedDB
- Verify browser supports audio playback
- Check console for player errors

### Scenario 6: Offline Mode

**Steps:**
1. Convert content while online (Scenario 3)
2. Go to Library and verify content is downloaded
3. Open browser DevTools
4. Go to Network tab
5. Check "Offline" checkbox (simulates offline)
6. Refresh page

**Expected:**
- Page loads (service worker cache)
- Network indicator shows "Offline" (orange)
- Library still shows downloaded content
- Can play downloaded audio
- Upload tab shows warning: "You are offline. Backend upload requires an internet connection."
- Cannot upload new content

**To Restore:**
- Uncheck "Offline" in DevTools
- Network indicator should change to "Online" (green)

### Scenario 7: Token Refresh

**Steps:**
1. Login
2. Open browser DevTools → Application → Local Storage
3. Find `accessToken` and `refreshToken`
4. Note the token values
5. Wait 15 minutes (access token expires)
6. Make an API call (e.g., upload new content)

**Expected:**
- Request initially gets 401
- Frontend automatically calls `/auth/refresh`
- New tokens stored in localStorage
- Original request retried with new token
- Operation succeeds without user noticing

**Manual Test:**
1. Delete `accessToken` from localStorage (keep `refreshToken`)
2. Try to upload content
3. Should auto-refresh and succeed

### Scenario 8: Session Expiration

**Steps:**
1. Login
2. Open DevTools → Application → Local Storage
3. Delete both `accessToken` and `refreshToken`
4. Try to upload content or refresh page

**Expected:**
- Redirected to login page
- Error message: "Authentication required"
- Can login again to restore session

## Common Issues and Solutions

### Issue: "Backend upload requires internet connection"

**Cause:** Network status detected as offline
**Solution:**
1. Check actual internet connection
2. Verify backend is running
3. Check DevTools → Network tab not set to "Offline"

### Issue: "Authentication required"

**Cause:** Not logged in or tokens expired
**Solution:**
1. Login again
2. Check tokens in localStorage
3. Verify backend auth endpoints working

### Issue: "Failed to upload file"

**Possible Causes:**
1. File too large (> 50MB)
2. File type not supported
3. Backend not running
4. Backend error processing file

**Solution:**
1. Check file size: `ls -lh filename`
2. Verify file type: `.txt`, `.epub`, or `.pdf`
3. Check backend logs for errors
4. Try a different file

### Issue: Audio conversion stuck at 20%

**Possible Causes:**
1. Backend TTS service down
2. Azure API key invalid
3. Network timeout

**Solution:**
1. Check backend logs
2. Verify Azure TTS credentials
3. Wait longer (large files take time)
4. Try with a smaller file first

### Issue: "No audio in library after conversion"

**Possible Causes:**
1. Conversion failed
2. Download failed
3. Storage quota exceeded

**Solution:**
1. Check browser console for errors
2. Verify conversion completed (100%)
3. Check IndexedDB storage quota
4. Clear browser data and try again

### Issue: Network status always shows "Offline"

**Cause:** Browser navigator.onLine API issue
**Solution:**
1. Refresh page
2. Check browser settings
3. Disable VPN/proxy if using
4. Try different browser

## Browser Console Logs

### Successful Upload Flow

```
[Upload] Starting conversion process
[Upload] File: sample-content.txt Size: 156
[Upload] Uploading file to backend: sample-content.txt
[Upload] Content uploaded with ID: abc123
[Upload] Starting TTS conversion with voice: en-US-AriaNeural
[Upload] Conversion complete, audio URL: http://...
[Upload] Downloading audio file...
[Upload] Audio downloaded: 245678 bytes
[Upload] Audio duration: 12.5 seconds
[Upload] Storing audio locally...
[Upload] Successfully stored locally with ID: xyz789
[Upload] ✅ Conversion complete!
```

### Failed Upload (Backend Error)

```
[Upload] Starting conversion process
[Upload] File: test.txt Size: 100
[Upload] Uploading file to backend: test.txt
[Upload] ❌ Conversion error: HTTP 500: Internal Server Error
```

## Testing Checklist

Use this checklist to verify all functionality:

- [ ] User can register
- [ ] User can login
- [ ] User can logout
- [ ] Tokens stored in localStorage
- [ ] Tokens refresh automatically
- [ ] File upload works
- [ ] Text extraction succeeds
- [ ] TTS conversion starts
- [ ] Progress updates shown
- [ ] Audio downloads
- [ ] Audio stored locally
- [ ] Library shows content
- [ ] Audio playback works
- [ ] Offline indicator accurate
- [ ] Can play audio offline
- [ ] Cannot upload offline
- [ ] Network status updates in real-time
- [ ] User info displayed
- [ ] Session persists across refresh

## Performance Benchmarks

### Expected Times

| Operation | Small File (< 5KB) | Medium File (50KB) | Large File (500KB) |
|-----------|-------------------|--------------------|--------------------|
| Upload    | < 1 second        | 1-2 seconds        | 3-5 seconds        |
| Conversion| 10-15 seconds     | 20-40 seconds      | 40-90 seconds      |
| Download  | < 1 second        | 2-3 seconds        | 5-10 seconds       |
| Total     | ~15 seconds       | ~30 seconds        | ~60 seconds        |

### Hardware Considerations

- **CPU**: Higher CPU = faster TTS processing on backend
- **Network**: Faster connection = quicker upload/download
- **Storage**: Local storage speed affects IndexedDB operations

## Advanced Testing

### Load Testing
```bash
# Register multiple users
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@test.com\",\"password\":\"test123\"}"
done
```

### Stress Testing
- Upload multiple files simultaneously
- Convert large files (40-50MB)
- Keep multiple browser tabs open

### Security Testing
- Try invalid tokens
- Attempt unauthorized API calls
- Test XSS in file names
- Check CORS policies

## Support Resources

1. **Documentation:**
   - INTEGRATION.md - Full integration docs
   - INTEGRATION_SUMMARY.md - Quick overview
   - This file - Testing guide

2. **Logs:**
   - Browser console (frontend)
   - Backend logs (terminal where backend runs)
   - Network tab (DevTools)

3. **Storage Inspection:**
   - DevTools → Application → Local Storage
   - DevTools → Application → IndexedDB
   - DevTools → Application → Service Workers

4. **API Testing:**
   - Use Postman or cURL
   - Test endpoints directly
   - Verify request/response format

## Success Criteria

All of these should work without errors:

1. Complete user registration flow
2. Login with new account
3. Upload and convert a book
4. View converted book in library
5. Play audio in browser
6. Logout and login again
7. Audio still available offline
8. Network status updates correctly
9. No console errors
10. Smooth user experience

If all pass: **Integration successful!**
