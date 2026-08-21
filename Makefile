.PHONY: measure

BUDGET := 13312

measure: dist.zip
	@wc -c < dist.zip | awk -v BUDGET=$(BUDGET) '{SIZE=$$1; printf "%d/%dB (%.1f%%)\n", SIZE, BUDGET, SIZE/BUDGET*100}'

dist.zip: dist/index.html dist/sprites.png
	rm -f dist.zip
	cd dist && zip -9 ../dist.zip -r *
	advzip -z -4 -i dist.zip

dist/index.html: *.js *.html
	pnpm vite build

dist/sprites.png: sprites.png
	mkdir -p dist
	oxipng -o max --strip all --alpha sprites.png --out dist/sprites.png
