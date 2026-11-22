.PHONY: help install setup run lock clean lint migrate

help:
	@cd server && make help

install:
	@cd server && make install

setup:
	@cd server && make setup

run:
	@chmod +x run_app.sh
	./run_app.sh

migrate:
	@cd server && make migrate

lock:
	@cd server && make lock

clean:
	@cd server && make clean

lint:
	@cd server && make lint
