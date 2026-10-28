.PHONY: up down down-clean seed web storybook

up:
	docker compose up --build -d
	docker compose logs -f sumni-finance-backend

down:
	docker compose down

# Also removes volumes (wipes Postgres data) and orphans
down-clean:
	docker compose down --volumes --remove-orphans

# Vite dev server on http://localhost:3000
web:
	cd web && npm run dev

