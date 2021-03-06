# Build Output Directories
TS_SOURCE_DIR = src
JS_BUILD_DIR = lib

# Sources
TYPESCRIPT_SRC   = $(shell find $(TS_SOURCE_DIR) ! -path "$(TS_SOURCE_DIR)/rewriter/js/__internal/*" -name "*" ! -path "$(TS_SOURCE_DIR)/modules.d.ts" ! -path "$(TS_SOURCE_DIR)/tests/*" -name "*.ts")
SOURCE_INTERNALS = $(shell find $(TS_SOURCE_DIR)/rewriter/js/__internal -name "*")

# Targets
JS_SRC           = $(patsubst $(TS_SOURCE_DIR)/%.ts, $(JS_BUILD_DIR)/%.js, $(TYPESCRIPT_SRC))
TARGET_INTERNALS = $(patsubst $(TS_SOURCE_DIR)/rewriter/js/__internal/%, $(JS_BUILD_DIR)/rewriter/js/__internal/%, $(SOURCE_INTERNALS))

# Commands
TSC := ./node_modules/.bin/tsc
TSC_ARGS := -t es2017 -m commonjs --moduleResolution Node --strict --pretty --skipLibCheck --sourceMap --rootDir $(TS_SOURCE_DIR)/ --outDir $(JS_BUILD_DIR)/ $(TS_SOURCE_DIR)/modules.d.ts

JEST := ./node_modules/.bin/jest
NEARLEYC := ./node_modules/.bin/nearleyc

$(TS_SOURCE_DIR)/parser/grammar.ts: $(TS_SOURCE_DIR)/parser/grammar.ne
	$(NEARLEYC) $< -o $@

$(JS_BUILD_DIR)/%.js: $(TS_SOURCE_DIR)/%.ts
	- $(TSC) $(TSC_ARGS) $<

$(JS_BUILD_DIR)/rewriter/js/__internal/%: $(TS_SOURCE_DIR)/rewriter/js/__internal/%
	@[ -d $(@D) ] || mkdir -p $(@D)
	cp $< $@

all: build

compile-grammar: $(TS_SOURCE_DIR)/parser/grammar.ts

compile-src: $(JS_SRC)

copy-internals: $(TARGET_INTERNALS)

build: compile-grammar compile-src copy-internals

test: compile-grammar |
	@clear
	@$(JEST)

ci-test: compile-grammar |
	@clear
	@$(JEST) --ci

watch:
	@clear
	watchman-make -p '$(TS_SOURCE_DIR)/**/*.ts' '$(TS_SOURCE_DIR)/parser/grammar.ne' -t build

dev:
	@clear
	watchman-make -p '$(TS_SOURCE_DIR)/**/*.ts' '$(TS_SOURCE_DIR)/tests/**/*.ts' -t test

clean:
	- rm -rf $(JS_BUILD_DIR)
	- rm $(TS_SOURCE_DIR)/parser/grammar.ts