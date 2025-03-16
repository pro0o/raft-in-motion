FROM golang:1.23.5 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./raft-in-motion/cmd/main.go

FROM alpine:latest

WORKDIR /app/

COPY --from=builder /app/server .

EXPOSE 8081

CMD ["./server"]
