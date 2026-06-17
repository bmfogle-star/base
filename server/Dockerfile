# Meeting bots need a real Chrome + a virtual display (Xvfb) to capture tab audio.
FROM node:20-slim

# Chrome dependencies + Xvfb (virtual framebuffer) + pulseaudio (virtual audio sink).
RUN apt-get update && apt-get install -y \
    chromium ffmpeg xvfb pulseaudio dbus-x11 \
    fonts-liberation libasound2 libnss3 libatk-bridge2.0-0 libgtk-3-0 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .

EXPOSE 4000

# Start a virtual display + audio, then the server.
CMD pulseaudio -D --exit-idle-time=-1 && \
    Xvfb :99 -screen 0 1280x720x24 & \
    DISPLAY=:99 node index.js
