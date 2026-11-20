# Stage 1: Builder
FROM golang:1.27.4 AS builder

ARG TARGETARCH

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ ./cmd/
COPY internal/ ./internal/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build \
    -ldflags="-w -s" \
    -o /app/server \
    ./cmd/main.go

# Stage 2: Runtime
FROM gcr.io/distroless/static-debian13:nonroot

COPY --from=builder /app/server /server

EXPOSE 4000
ENTRYPOINT ["/server"]
