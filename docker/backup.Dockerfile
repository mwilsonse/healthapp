FROM postgres:16-alpine

RUN apk add --no-cache bash gzip

WORKDIR /app
COPY docker/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

ENTRYPOINT ["/app/backup.sh"]
