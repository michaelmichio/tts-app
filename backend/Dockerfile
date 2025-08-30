# Build stage
FROM golang:1.23-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /bin/server ./cmd/server

# Runtime stage
FROM alpine:3.20
WORKDIR /app
ENV GOTOOLCHAIN=auto
RUN adduser -D -u 10001 appuser
COPY --from=build /bin/server /usr/local/bin/server
RUN mkdir -p /data/media && chown -R appuser /data
USER appuser
ENV PORT=8080
EXPOSE 8080
CMD ["/usr/local/bin/server"]