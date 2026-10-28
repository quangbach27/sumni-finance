.PHONY: gen lint tidy fmt go-mod-update test-unit test-integration test-component test

gen:
	go generate ./internal/...

lint:
	go tool golangci-lint run ./...

tidy:
	go mod tidy

fmt:
	go tool gofumpt -l -w .

go-mod-update:
	go get -u ./...

test-unit:
	go test -race ./internal/...

test-integration:
	set -a; . ./.env.test; set +a; \
	go test -race -tags integration ./internal/... -count=1

test-component:
	set -a; . ./.env.test; set +a; \
	go test -race -p 1 -tags component ./tests/... -count=1

test:
	set -a; . ./.env.test; set +a; \
	printf '\033[1;36m==> Running integration tests\033[0m\n' && \
	go test -race -tags integration ./internal/... -count=1 && \
	printf '\033[1;36m==> Running component tests\033[0m\n' && \
	go test -race -p 1 -tags component ./tests/... -count=1
