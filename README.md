# 212Audio

A MERN-oriented live audio MVP rebuilt from the old reference project. The reference remains isolated in `212audio_Old_reference/`; the product implementation is split into independent applications:

```text
212audio/
  client/                 React + TypeScript + Vite + Tailwind client
  server/                 Express + TypeScript + MongoDB/Mongoose + Socket.IO server
  212audio_Old_reference/ Product reference only
```

## Run locally

Prerequisites: Node.js 20+, npm, and MongoDB running locally or a MongoDB Atlas URI.

```powershell
# terminal 1
Set-Location client
Copy-Item .env.example .env
npm install
npm run dev

# terminal 2
Set-Location server
Copy-Item .env.example .env
npm install
npm run dev
```

Client: `http://localhost:5173`  
Server health: `http://localhost:4000/api/health`

## Environment

Client: `VITE_API_URL`, `VITE_SOCKET_URL`  
Server: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`

## MVP flow

- Landing page with live-show discovery and creator CTA
- Register/login through JWT auth endpoints
- Creator dashboard with show creation surface and live show selection
- Live room presence over Socket.IO
- Listener starts in `LISTENER` state and can raise a hand
- Host sees requests, admits listeners to `SPEAKER`, mutes, or removes them
- Microphone permission is acquired through `navigator.mediaDevices.getUserMedia`
- WebRTC peer connections exchange offers, answers, and ICE candidates through Socket.IO
- Host and participant can leave/end the room

The room requires the server and MongoDB to be running. WebRTC microphone access requires `localhost` or HTTPS and user permission. No demo credentials are committed; register from the UI.

## Architecture notes

`server/src/socket/room.ts` is the replaceable realtime boundary. It currently keeps presence in memory for the MVP while durable users, shows, episodes, live rooms, participants, and speaker requests use Mongoose models. A later SFU can replace peer-to-peer WebRTC without changing the UI room events.
