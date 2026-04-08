// tests/WeatherTool.test.ts
import { inputSchema, handler } from "../src/tools/WeatherTool";
import axios from "axios";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  // Make axios.isAxiosError always return true for our error‐tests
  jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
});

describe("WeatherTool handler", () => {
  const validArgs = {
    location: "Paris",
    units: "metric",
  };
  const extra: RequestHandlerExtra<any, any> = {
    signal: new AbortController().signal,
    requestId: "req-1",
    sendNotification: jest.fn(),
    sendRequest: jest.fn(),
  };

  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it("passes zod validation for well-formed input", () => {
    expect(() => inputSchema.parse(validArgs)).not.toThrow();
  });

  it("accepts requests without units parameter", () => {
    const result = inputSchema.parse({
      location: validArgs.location,
    });
    // Just verify parsing doesn't throw an error
    expect(result.location).toBe(validArgs.location);
    // The handler will use the default value "metric"
  });

  it("rejects when location is empty", () => {
    expect(() => inputSchema.parse({ location: "" })).toThrow(
      /Location must be at least 1 character/,
    );
  });

  // Removed test for sessionId validation as it's no longer a requirement

  it("fetches coordinates and 12-hour forecast and formats text with metric units (default)", async () => {
    // geocoding API
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      // forecast API
      .mockResolvedValueOnce({
        data: {
          hourly: {
            time: ["2025-05-04T15:00:00"],
            temperature_2m: [20],
            weathercode: [0],
            precipitation: [0],
            windspeed_10m: [10],
          },
        },
      });

    const result = await handler(
      {
        location: validArgs.location,
      },
      extra,
    );

    // two calls: one for geocoding, one for hourly forecast
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("geocoding-api.open-meteo.com/v1/search"),
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("api.open-meteo.com/v1/forecast"),
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("temperature_unit=celsius"),
    );

    // one text item in content array
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain("20°C");
  });

  it("handles imperial units correctly", async () => {
    // geocoding API
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      // forecast API
      .mockResolvedValueOnce({
        data: {
          hourly: {
            time: ["2025-05-04T15:00:00"],
            temperature_2m: [68],
            weathercode: [0],
            precipitation: [0],
            windspeed_10m: [6],
          },
        },
      });

    const result = await handler(
      {
        ...validArgs,
        units: "imperial",
      },
      extra,
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("temperature_unit=fahrenheit"),
    );

    expect(result.content[0].text).toContain("68°F");
  });

  it("handles no-location-found", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
    const resp = await handler(validArgs, extra);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(resp.content[0].text).toBe("No location found for: Paris");
  });
});
