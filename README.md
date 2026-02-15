# itzuli-mcp

An MCP (Model Context Protocol) server for [Itzuli](https://www.batua.eus/en/), the Basque language machine translation service by [Vicomtech](https://www.vicomtech.org/en). Translate text between Basque, Spanish, English, and French using neural network-based translation.

## Tools

### `translate`

Translate text between supported languages.

| Parameter        | Type                         | Description           |
| ---------------- | ---------------------------- | --------------------- |
| `text`           | string                       | The text to translate |
| `sourceLanguage` | `eu` \| `es` \| `en` \| `fr` | Source language code  |
| `targetLanguage` | `eu` \| `es` \| `en` \| `fr` | Target language code  |

**Language codes:** `eu` (Basque), `es` (Spanish), `en` (English), `fr` (French)

Basque (`eu`) must be either the source or target language. Supported pairs: `eu<->es`, `eu<->en`, `eu<->fr`.

### `get_quota`

Check the current API usage quota. Takes no parameters.

### `send_feedback`

Submit a correction or evaluation for a previous translation.

| Parameter       | Type   | Description                                      |
| --------------- | ------ | ------------------------------------------------ |
| `translationId` | string | The ID of the translation to provide feedback on |
| `correction`    | string | The corrected translation text                   |
| `evaluation`    | number | Numeric evaluation score                         |

## Prompts

The server provides translation prompts using the `source@target` naming convention. Each prompt takes a single `text` argument and instructs the model to translate it using the `translate` tool.

| Prompt  | Description       |
| ------- | ----------------- |
| `eu@es` | Basque to Spanish |
| `es@eu` | Spanish to Basque |
| `eu@en` | Basque to English |
| `en@eu` | English to Basque |
| `eu@fr` | Basque to French  |
| `fr@eu` | French to Basque  |

### Example

`eu@es Ez dut euskal kanturik ezagutzen`

## Prerequisites

- Node.js 18+
- An Itzuli API key (register at https://itzuli.vicomtech.org/en/api/)

## Setup

```sh
npm install
```

## Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "itzuli": {
      "command": "/absolute/path/to/itzuli-mcp/node_modules/.bin/tsx",
      "args": ["/absolute/path/to/itzuli-mcp/src/index.ts"],
      "env": {
        "ITZULI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

Add to your Claude Code MCP settings:

```sh
claude mcp add itzuli -- /absolute/path/to/itzuli-mcp/node_modules/.bin/tsx /absolute/path/to/itzuli-mcp/src/index.ts
```

Set the environment variable before running:

```sh
export ITZULI_API_KEY=your-api-key
```

### Generic MCP client

The server uses stdio transport. Run it with the `ITZULI_API_KEY` environment variable set:

```sh
ITZULI_API_KEY=your-api-key npx tsx src/index.ts
```

## Development

```sh
npx tsx src/index.ts  # Run the server directly from TypeScript
npm run build         # Type-check and compile to dist/
```

Formatting and linting are handled by [Biome](https://biomejs.dev/):

```sh
npx biome check          # Check for issues
npx biome check --write  # Auto-fix issues
```

## License

ISC
