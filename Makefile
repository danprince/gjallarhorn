.PHONY: measure

BUDGET := 13312

measure: dist.zip
	@wc -c < dist.zip | awk -v BUDGET=$(BUDGET) '{SIZE=$$1; printf "%d/%dB (%.1f%%)\n", SIZE, BUDGET, SIZE/BUDGET*100}'

dist.zip: dist/index.html dist/sprites.png
	rm -f dist.zip
	cd dist && zip -9 ../dist.zip -r *
	advzip -z -4 -i dist.zip

dist/index.html: game/*.js game/*.html
	pnpm vite build

dist/sprites.png: game/sprites.png
	mkdir -p dist
	oxipng -o max --strip all --alpha game/sprites.png --out dist/sprites.png
