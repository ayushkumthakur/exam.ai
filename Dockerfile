FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node . .

# The persistent volume may contain root-owned files from the original deployment.
# Fix ownership at container start, then drop privileges before running the app.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data \
    && chown node:node /data
COPY docker-entrypoint.sh /usr/local/bin/competitive-exam-entrypoint
RUN chmod 0755 /usr/local/bin/competitive-exam-entrypoint

USER root
ENTRYPOINT ["/usr/local/bin/competitive-exam-entrypoint"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
