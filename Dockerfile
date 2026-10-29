FROM oven/bun:1.2-slim
# Debian (no Alpine): LibreOffice en Alpine se colgaba al convertir PowerPoint
RUN apt-get update && apt-get install -y --no-install-recommends \
      poppler-utils ffmpeg ghostscript libreoffice-impress \
      fonts-liberation fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && (fc-cache -f >/dev/null 2>&1 || true)
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["bun", "server.ts"]
