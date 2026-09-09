# 212Audio MVP

A fresh, dependency-free browser MVP for the 212Audio live audio product. The old Laravel/reference project remains untouched in `../212audio_Old_reference`.

## Run it

Open `index.html` directly in a browser, or serve the folder with any static file server:

```powershell
Set-Location mvp
py -m http.server 4173
```

Then visit `http://localhost:4173`.

## Demo flow

1. Open **Live studio** from the dashboard.
2. Click **Admit** for Sarah Chen.
3. Use Sarah's `•••` action to mute her.
4. Use Mike Rivera's action to remove him.
5. Click **End live** to finish the broadcast.
6. Use **Create a show** to test the show creation modal.

The local state models the room transitions so the core demo is testable without a server. It intentionally does not fake microphone or WebRTC connectivity.

## Next MERN slice

- Move the participant state into an Express + Socket.IO room service.
- Add MongoDB/Mongoose models for `User`, `Show`, `Episode`, `LiveRoom`, and `SpeakerRequest`.
- Replace the local actions in `app.js` with REST mutations and Socket.IO room events.
- Add a WebRTC peer-connection hook for host-to-speaker audio after signaling is available.
- Keep listener, speaker, muted, removed, and disconnected as explicit server states.

The `.env.example` file documents the client-side endpoints for that next slice.
