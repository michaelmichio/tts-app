# run all services
up:
	docker compose up -d

# stop all services
down:
	docker compose down

# view backend logs
logs:
	docker compose logs -f backend

# rebuild backend
build:
	docker compose build --no-cache backend

# # migrate db (with migration tool if available)
# migrate:
# 	docker compose exec backend go run cmd/migrate/main.go
