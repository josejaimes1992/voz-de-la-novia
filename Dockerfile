FROM oven/bun:1.2-alpine
RUN apk add --no-cache poppler-utils ffmpeg
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["bun", "server.ts"]
