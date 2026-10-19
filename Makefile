CMS_DIR := pinky-lamb-cms
NODE := $(abspath $(CMS_DIR)/.local/cache/node/node-v22.23.3-darwin-arm64/bin/node)
DURABLE_RUNNER := $(abspath $(CMS_DIR)/scripts/run-durable-stack.mjs)

.PHONY: run

run:
	@test -x "$(NODE)" || { echo "Pinned Node 22.23.3 is missing" >&2; exit 1; }
	@"$(NODE)" "$(DURABLE_RUNNER)"
