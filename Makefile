NAME := arrays
TAG := $(shell git log -1 --pretty="%h")
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
IMG := ${NAME}_${BRANCH}:${TAG}

DEV_DOCKERFILES := docker-compose.yml
PROD_DOCKERFILES := docker-compose-prod.yml
DEV_DC := COMPOSE_HTTP_TIMEOUT=200 docker-compose -f $(DEV_DOCKERFILES)
PROD_DC := COMPOSE_HTTP_TIMEOUT=200 docker-compose -f $(PROD_DOCKERFILES)

BUILD_FLAGS := --build-arg BRANCH_NAME=$(BRANCH) --build-arg COMMIT_HASH=$(TAG)

.PHONY: develop develop-start develop-status develop-logs develop-stop develop-restart develop-build develop-build-nocache develop-seed-db \
	 develop-exec-bash develop-restart-node stop-all run-debugger lint-fix test test-frontend test-backend login \
	 build push-production

build:
	docker build -t $(IMG) $(BUILD_FLAGS) .

# Run development service
develop:
	$(DEV_DC) up -d

develop-start:
	$(DEV_DC) up -d && $(DEV_DC) logs --tail=200 -f web

start:
	$(PROD_DC) up -d && $(PROD_DC) logs --tail=200 -f web

develop-status:
	$(DEV_DC) ps

develop-logs:
	$(DEV_DC) logs --tail=200 -f web

develop-stop:
	$(DEV_DC) stop

stop:
	$(PROD_DC) stop

# Restart containers
restart:
	$(PROD_DC) restart

develop-restart-logs:
	$(DEV_DC) restart && $(DEV_DC) logs --tail=200 -f web

# Rebuild web container
develop-build:
	$(DEV_DC) build --build-arg NODE_ENV=development --build-arg MONGODB_NAME=arraysdb $(BUILD_FLAGS) web

develop-build-nocache:
	$(DEV_DC) build --build-arg STAGE=development --build-arg MONGODB_NAME=arraysdb  $(BUILD_FLAGS) --no-cache web

# Seed database
develop-seed-db:
	$(DEV_DC) up -d && $(DEV_DC) exec web npm run seed

# Exec bash in the web container
develop-exec-bash:
	$(DEV_DC) exec -e COLUMNS=222 web bash

develop-restart-node:
	$(DEV_DC) exec web touch app.js

develop-reinstall:
	$(DEV_DC) exec web npm install

develop-grunt:
	$(DEV_DC) exec web grunt build

develop-grunt-copy:
	$(DEV_DC) exec web grunt copy

develop-grunt-core:
	$(DEV_DC) exec web grunt build:core

# Run API tests
test:
	$(DEV_DC) run --rm -e NODE_ENV=testing web npm test

test-backend:
	$(DEV_DC) run --rm -e NODE_ENV=testing web npm run test:backend

test-frontend:
	$(DEV_DC) run --rm -e NODE_ENV=testing web npm run test:frontend

stop-all:
	docker kill $(shell docker ps -q)

run-debugger:
	$(DEV_DC) stop web && $(DEV_DC) run --rm -p 9229:9229 -p 9080:9080 -p 35729:35729 -p 9222:9222 -e DEBUGCODE=1 --name debugger web

# Lint all files, except those ignored by git
lint-fix:
	./node_modules/.bin/eslint --fix --ignore-path .gitignore -- .
