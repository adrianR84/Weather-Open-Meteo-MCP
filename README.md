# MCP Weather Server

[![npm version](https://img.shields.io/npm/v/@adrianR84/mcp-weather)](https://www.npmjs.org/package/@adrianR84/mcp-weather)
[![license](https://img.shields.io/github/license/adrianR84/mcp-weather)](https://github.com/adrianR84/mcp-weather/blob/main/LICENSE)
[![node version](https://img.shields.io/node/v/@adrianR84/mcp-weather)](https://www.npmjs.org/package/@adrianR84/mcp-weather)
[![issues](https://img.shields.io/github/issues/adrianR84/mcp-weather)](https://github.com/adrianR84/mcp-weather/issues)
[![weekly downloads](https://img.shields.io/npm/dm/@adrianR84/mcp-weather)](https://www.npmjs.org/package/@adrianR84/mcp-weather)
[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/adrianR84/mcp-weather)](https://archestra.ai/mcp-catalog/adrianR84__mcp-weather)

<p align="center">
  <img src="logo.png" alt="MCP Weather Server Logo" width="250"/>
  <a href="https://glama.ai/mcp/servers/@adrianR84/mcp-weather">
    <img width="380" height="200" src="https://glama.ai/mcp/servers/@adrianR84/mcp-weather/badge" alt="Weather MCP server" />
  </a>
</p>

A Model Context Protocol (MCP) server that provides hourly and daily weather forecasts using the Open-Meteo API.

---

## Quick Start

No API key required! Open-Meteo provides free access to weather data for non-commercial use.

Simply run the MCP Weather server directly with:

```bash
npx -y @adrianR84/mcp-weather
```

Or, for HTTP/REST access via [supergateway](https://github.com/supercorp-ai/supergateway):

```bash
npx -y supergateway --stdio "npx -y @adrianR84/mcp-weather" \
  --port 4004 \
  --baseUrl http://127.0.0.1:4004 \
  --ssePath /messages \
  --messagePath /message \
  --cors "*"
```

---

## MCP Server Config Example

For integration with Claude Desktop or other MCP-compatible clients, add this to your config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@timlukahorstmann/mcp-weather"]
    }
  }
}
```

---

## Overview

This MCP server allows large language models (like Claude) to access real-time weather data. When integrated with an LLM, it enables the model to:

- Fetch accurate, up-to-date weather forecasts
- Provide hourly weather data for the next 12 hours
- Access daily weather forecasts for up to 15 days
- Display data in both metric (°C) and imperial (°F) units
- View temperature, conditions, precipitation information, and other weather details

## Available Tools

### Hourly Weather Forecast

- Tool name: `weather-get_hourly`
- Provides hourly forecasts for the next 12 hours
- Parameters:
  - `location` (required): City or location name
  - `units` (optional): "metric" (Celsius, default) or "imperial" (Fahrenheit)

### Daily Weather Forecast

- Tool name: `weather-get_daily`
- Provides daily forecasts for up to 15 days
- Parameters:
  - `location` (required): City or location name
  - `days` (optional): Number of forecast days (1, 5, 10, or 15; default is 5)
  - `units` (optional): "metric" (Celsius, default) or "imperial" (Fahrenheit)

## Prerequisites

- Node.js ≥18

## Setup

1. **Clone this repository:**

   ```bash
   git clone https://github.com/adrianR84/mcp-weather.git
   cd mcp-weather
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Usage with Claude Desktop

1. Configure Claude Desktop to use this MCP server:
   - Open Claude Desktop
   - Go to Settings > Developer > Edit Config
   - Add the following to your `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "weather": {
         "command": "npx",
         "args": ["-y", "@timlukahorstmann/mcp-weather"]
       }
     }
   }
   ```

2. Restart Claude Desktop

3. In a new conversation, enable the MCP server by clicking the plug icon and selecting "weather"

4. Now you can ask Claude for weather forecasts, such as:
   - "What's the hourly weather forecast for New York City?"
   - "Give me the 5-day forecast for London."
   - "What will the weather be like in Tokyo this week in Fahrenheit?"
   - "Will it rain in San Francisco tomorrow?"

## Development

- Install dev dependencies: `npm install`
- Lint your code: `npm run lint`
- Build: `npm run build`
- Run tests: `npm test`
- Start in dev mode: `npm run dev`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request to [adrianR84/mcp-weather](https://github.com/adrianR84/mcp-weather).

## Future Enhancements

We're always looking to improve the MCP Weather Server. Here are some features we're considering for future releases:

- **Extended Hourly Forecasts:** Beyond 12 hours, e.g., 24 or 48 hours.
- **Weather Alerts:** Integration with severe weather alerts.
- **Location Autocomplete:** Enhanced location searching with autocomplete suggestions.
- **Historical Weather Data:** Access to past weather conditions.

If you have ideas for other features, feel free to open an issue!

## Changelog

### 0.4.0

- Removed `sessionId` requirement from all tools as it was not used for anything internally
- This simplifies integrations and reduces confusion for LLM usage

### 0.3.0 and earlier

- Initial releases with basic functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
