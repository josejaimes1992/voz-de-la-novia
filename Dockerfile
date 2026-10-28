FROM oven/bun:1.2-alpine
RUN apk add --no-cache poppler-utils ffmpeg ghostscript
# PowerPoint → imágenes (LibreOffice Impress) y fuentes compatibles con las de Office (Calibri, Arial, Times…)
RUN (apk add --no-cache libreoffice-impress || apk add --no-cache libreoffice || true) \
 && (apk add --no-cache ttf-liberation ttf-dejavu || true) \
 && (apk add --no-cache font-carlito || apk add --no-cache ttf-carlito || true)
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["bun", "server.ts"]
