# TwinMind Testing Guide

## Prerequisites

1. **Groq API Key** - Required for transcription
   - Get one at: https://console.groq.com/keys
   - Must have credits/quota available

2. **Microphone Access** - Browser permission required
   - Ensure microphone is connected and working
   - Allow browser permission when prompted

3. **Browser** - Chrome/Edge/Firefox (latest)
   - WebRTC and MediaRecorder API support required

---

## 1. UI Layout Tests

### 1.1 Three-Column Layout
| Test | Steps | Expected Result |
|------|-------|----------------|
| Desktop view | Open app on 1440px+ width | Three columns visible: Transcript (left), Suggestions (center), Chat (right) |
| Responsive tablet | Resize to 768px-1024px | Middle column becomes main, side panels stack or hide |
| Mobile view | Resize to <768px | Single column layout with horizontal scroll or hamburger menu |

### 1.2 Toolbar Elements
| Test | Steps | Expected Result |
|------|-------|----------------|
| Logo display | Open app | "TwinMind" logo with brain icon visible |
| Mic button idle | On load | Shows "Start" with Mic icon |
| Clear button | Click "Clear" | Mock transcript data clears, panel empty |
| Settings button | Click "Settings" | Settings panel slides in from right |

---

## 2. Settings Panel Tests

### 2.1 API Key Configuration
| Test | Steps | Expected Result |
|------|-------|----------------|
| Open settings | Click "Settings" button | Panel opens smoothly |
| Enter API key | Type key in "Groq API Key" field | Masked input, value saved |
| Context window | Change "Context Window Size" | Value updates (1-50 range) |
| Prompt editing | Edit any prompt textarea | Changes persist when panel closed/reopened |
| Close settings | Click X or outside | Panel closes, settings saved |

### 2.2 Settings Persistence
| Test | Steps | Expected Result |
|------|-------|----------------|
| Refresh page | Reload browser | Settings remain (stored in Zustand/local state) |

---

## 3. Microphone Recording Tests

### 3.1 Basic Recording Flow
| Test | Steps | Expected Result |
|------|-------|----------------|
| Start recording | Click "Start" button | Button turns red, shows "Recording" with pulse animation, "LIVE" badge appears |
| Speak for 30s | Talk continuously | After ~30s, button shows "Processing" with spinner briefly, then back to "Recording" |
| Stop recording | Click "Recording" button | Button returns to "Start", recording stops |
| Check transcript | View transcript panel | Your spoken text appears as new entries with chunk numbers (e.g., "#1") |

### 3.2 Chunking Behavior
| Test | Steps | Expected Result |
|------|-------|----------------|
| Long recording | Record for 90+ seconds | Multiple chunks processed (#1, #2, #3 appear sequentially) |
| Chunk indicators | View transcript | Each audio chunk entry shows a badge like "#1", "#2" |
| Auto-scroll | Record and watch panel | Panel auto-scrolls to show newest transcript entry |

### 3.3 Recording States UI
| State | Visual Indicator |
|-------|-----------------|
| Idle | Gray "Start" button with Mic icon |
| Recording | Red pulsing button with "Recording" text, "LIVE" badge, chunk counter |
| Processing | Amber/orange button with spinning loader, "Processing" text |
| Error | Red button with alert icon, "Error" text |

---

## 4. Transcription Tests

### 4.1 Successful Transcription
| Test | Steps | Expected Result |
|------|-------|----------------|
| Clear speech | Speak clearly for 30s | Accurate text appears in transcript panel |
| Multiple chunks | Record 60s with pauses | Two separate transcript entries appear |
| Transcript format | Check panel entry | Shows: timestamp, "#N" badge (for audio chunks), transcribed text |

### 4.2 Console Debugging
Open browser DevTools (F12) → Console tab:

| Action | Expected Console Output |
|--------|------------------------|
| Start recording | (no immediate output) |
| After 30s chunk | `Processing chunk 0: 45000 bytes` (size varies) |
| Small/empty chunk | `Chunk too small (1200 bytes), skipping` |
| Transcription success | (API response processed, text added) |
| Transcription error | `Groq API error: {error details}` |

---

## 5. Error Handling Tests

### 5.1 Permission Denied
| Test | Steps | Expected Result |
|------|-------|----------------|
| Block mic | Click "Start", then "Block" in browser prompt | Error state: red button, "Microphone permission denied" message |
| Retry after block | Click "Start" again | Browser may remember block, error persists until user changes site settings |

### 5.2 No API Key
| Test | Steps | Expected Result |
|------|-------|----------------|
| Record without key | Clear API key in settings, click "Start" | After 30s, error: "Groq API key not configured" |

### 5.3 Invalid API Key
| Test | Steps | Expected Result |
|------|-------|----------------|
| Bad key | Enter "invalid_key_123", start recording | After 30s, error: "Invalid API key" or "Authentication failed" |

### 5.4 No Microphone
| Test | Steps | Expected Result |
|------|-------|----------------|
| Disconnect mic | Unplug mic, click "Start" | Error: "No microphone found. Please connect a microphone..." |

### 5.5 Network/Transcription Failure
| Test | Steps | Expected Result |
|------|-------|----------------|
| Network offline | Turn off wifi, start recording, wait 30s | Error: "Network error while sending audio..." or similar |
| Quota exceeded | Use exhausted API key | Error: "Insufficient quota" or "Rate limit exceeded" |

---

## 6. Edge Cases

| Test | Steps | Expected Result |
|------|-------|----------------|
| Immediate stop | Start recording, stop within 2 seconds | No transcription sent (chunk too small), returns to idle |
| Silence recording | Start, stay silent for 30s | May skip chunk or return empty/no text |
| Rapid start/stop | Click Start/Stop repeatedly quickly | App remains stable, no crashes |
| Browser refresh during recording | Start recording, refresh page | Recording stops (browser cleanup), no lingering mic access |
| Multiple tabs | Open app in two tabs | Each tab independent, simultaneous recording may conflict |

---

## 7. Clear Functionality

| Test | Steps | Expected Result |
|------|-------|----------------|
| Clear transcript | Click "Clear" while idle | All transcript entries removed, panel empty |
| Clear during recording | Click "Clear" while recording | Transcript clears, but recording continues |
| Clear after recording | Record, stop, then clear | Transcript cleared, can start new recording |

---

## 8. Keyboard Shortcuts (if implemented)

| Key | Action |
|-----|--------|
| Spacebar | Start/Stop recording (when button focused) |
| Escape | Close settings panel |

---

## Known Limitations

1. **Audio format** - Uses WebM (Chrome/Edge) or MP4 (Safari) - transcription accuracy may vary
2. **Chunk size** - 30-second fixed intervals, not silence-based
3. **No persistence** - Transcripts lost on page refresh (not saved to localStorage)
4. **Single language** - Whisper auto-detects, no manual language selection
5. **No audio playback** - Cannot replay recorded audio

---

## Debug Checklist

If transcription fails:

1. ✅ Check console for `Processing chunk N: X bytes` - confirms audio captured
2. ✅ Verify blob size > 2000 bytes - ensures meaningful audio
3. ✅ Check Groq API error message - reveals specific issue
4. ✅ Verify API key in settings - ensure no extra spaces
5. ✅ Test mic in other app (e.g., Zoom) - confirms hardware works
6. ✅ Try different browser - isolates browser-specific issues

---

## Quick Test Sequence (5 minutes)

1. Open app → Verify three columns visible
2. Click Settings → Enter Groq API key → Close
3. Click Start → Speak "Testing one two three" for 5 seconds
4. Click Stop → Verify transcript appears (may take 1-2s)
5. Click Clear → Verify panel empty
6. Click Start again → Verify recording restarts cleanly

**Success criteria:** Recording starts/stops cleanly, transcript text appears within 2 seconds of stop.
