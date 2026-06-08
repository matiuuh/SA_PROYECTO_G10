.PHONY: build run dev install clean

## Install Node.js dependencies
install:
	npm install

## Compile TypeScript → dist/
build: install
	npm run build

## Start the compiled server
run: build
	npm start

## Start in development mode (ts-node, no compile step)
dev: install
	npm run dev

## Remove compiled output
clean:
	rm -rf dist/
