import { z } from "zod";
import axios from "axios";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

// Zod schemas for validation
export const inputShape = {
  location: z.string().min(1, "Location must be at least 1 character"),
  days: z
    .number()
    .int()
    .min(1)
    .max(15)
    .default(5)
    .optional()
    .describe("Number of days for forecast (1-15)"),
  units: z
    .enum(["imperial", "metric"])
    .default("metric")
    .optional()
    .describe("Temperature unit system"),
};

export const inputSchema = z
  .object(inputShape)
  .describe("Get daily weather forecast");

// JSON schema for tool registration (OpenAI-compatible)
export const inputJsonSchema = {
  type: "object",
  description: "Parameters for the daily weather-forecast tool",
  properties: {
    location: {
      type: "string",
      description: "The location to fetch the daily forecast for",
    },
    days: {
      type: "number",
      description:
        "Number of days to forecast (1, 5, 10, or 15). Default is 5.",
      enum: [1, 5, 10, 15],
    },
    units: {
      type: "string",
      description:
        "Temperature unit system (metric for Celsius, imperial for Fahrenheit). Default is metric.",
      enum: ["metric", "imperial"],
    },
  },
  required: ["location"],
  additionalProperties: false,
};

// Handler function for daily forecast
export async function handler(
  args: { [x: string]: any },
  extra: RequestHandlerExtra<any, any>,
): Promise<{ content: TextContent[] }> {
  // Validate args using the Zod schema
  let validatedArgs: z.infer<typeof inputSchema>;
  try {
    validatedArgs = inputSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return {
        content: [{ type: "text", text: `Invalid input: ${errorMessages}` }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: "An unexpected error occurred during input validation.",
        },
      ],
    };
  }

  const { location, days = 5, units = "metric" } = validatedArgs;

  try {
    // Step 1: Get coordinates for location using Open-Meteo geocoding
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geocodingResp = await axios.get(geocodingUrl);

    if (
      !geocodingResp.data ||
      !geocodingResp.data.results ||
      geocodingResp.data.results.length === 0
    ) {
      return {
        content: [{ type: "text", text: `No location found for: ${location}` }],
      };
    }

    const { latitude, longitude } = geocodingResp.data.results[0];

    // Step 2: Get weather forecast using Open-Meteo API
    const temperatureUnit = units === "metric" ? "celsius" : "fahrenheit";
    const windspeedUnit = units === "metric" ? "kmh" : "mph";

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&forecast_days=${days}&temperature_unit=${temperatureUnit}&windspeed_unit=${windspeedUnit}`;
    const forecastResp = await axios.get(forecastUrl);
    const data = forecastResp.data;

    if (
      !data ||
      !data.daily ||
      !data.daily.time ||
      data.daily.time.length === 0
    ) {
      return {
        content: [
          {
            type: "text",
            text: `No daily forecast data available for location: ${location}`,
          },
        ],
      };
    }

    const degreeSymbol = "°";
    const unitSymbol = units === "metric" ? "C" : "F";
    const windspeedUnitSymbol = units === "metric" ? "km/h" : "mph";
    const precipitationUnit = units === "metric" ? "mm" : "inch";

    // Weather code interpretation (WMO codes)
    const getWeatherDescription = (code: number): string => {
      const weatherCodes: { [key: number]: string } = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Fog",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Dense drizzle",
        56: "Freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        66: "Freezing rain",
        67: "Heavy freezing rain",
        71: "Light snow",
        73: "Snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Light showers",
        81: "Showers",
        82: "Heavy showers",
        85: "Light snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Severe thunderstorm with hail",
      };
      return weatherCodes[code] || "Unknown";
    };

    const content: TextContent[] = data.daily.time.map(
      (date: string, index: number) => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const maxTemp = data.daily.temperature_2m_max[index];
        const minTemp = data.daily.temperature_2m_min[index];
        const weatherCode = data.daily.weathercode[index];
        const precipitation = data.daily.precipitation_sum[index];
        const windSpeed = data.daily.windspeed_10m_max[index];
        const weatherDesc = getWeatherDescription(weatherCode);

        const precipitationText =
          precipitation > 0
            ? ` (${precipitation}${precipitationUnit} precipitation)`
            : "";
        const windText = `, Wind: ${windSpeed}${windspeedUnitSymbol}`;

        return {
          type: "text",
          text: `${formattedDate}: ${minTemp}${degreeSymbol}${unitSymbol} to ${maxTemp}${degreeSymbol}${unitSymbol}, ${weatherDesc}${precipitationText}${windText}`,
        };
      },
    );

    return { content };
  } catch (error) {
    console.error("WeatherDailyTool handler error:", error);
    let errorMessage = "An error occurred while fetching weather data.";

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        errorMessage = `Location not found: ${location}`;
      } else if (error.response) {
        errorMessage = `Open-Meteo API error (${error.response.status}): ${error.response.data?.error || error.message}`;
      } else if (error.request) {
        errorMessage = "Network error: Unable to connect to Open-Meteo API.";
      }
    }

    return { content: [{ type: "text", text: errorMessage }] };
  }
}

export default { inputShape, inputSchema, inputJsonSchema, handler };
