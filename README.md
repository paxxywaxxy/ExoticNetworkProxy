# Eaglercraft WebSocket proxy for Render

1. Put these three files in a GitHub repository.
2. Render → New + → Web Service → connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable `UPSTREAM_URL` = `ws://exoticnetwork.pracc.club:17170/`
6. Deploy. Open `https://YOUR-SERVICE.onrender.com/health`; it should say `Eagler WebSocket proxy is running`.
7. In q13x use `wss://YOUR-SERVICE.onrender.com/`.

Important: this only works if EaglerXPaper is accepting WebSocket connections on Dathost port 17170. If Render logs show upstream connection refused or timeout, the upstream listener/port must be fixed first. Do not point UPSTREAM_URL back to Render.
