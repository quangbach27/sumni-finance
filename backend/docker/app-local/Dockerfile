FROM golang:1.27.1-alpine3.24


RUN go install github.com/cespare/reflex@v0.3.1

COPY reflex.conf /

ENTRYPOINT ["reflex", "-c", "/reflex.conf"]
