// tests/WeatherDailyTool.test.ts
import { inputSchema, handler } from "../src/tools/WeatherDailyTool";
import axios from "axios";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  // Make axios.isAxiosError always return true for our error‐tests
  jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
});

describe("WeatherDailyTool handler", () => {
  const validArgs = {
    location: "Paris",
    days: 5,
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

  it("accepts requests with minimal required parameters", () => {
    const result = inputSchema.parse({
      location: validArgs.location,
    });
    // Just verify parsing doesn't throw an error
    expect(result.location).toBe(validArgs.location);
    // The handler will use default values for days (5) and units ("metric")
  });

  it("rejects when location is empty", () => {
    expect(() =>
      inputSchema.parse({
        location: "",
        days: 5,
        units: "metric",
      }),
    ).toThrow(/Location must be at least 1 character/);
  });

  it("fetches coordinates and daily forecast and formats text", async () => {
    // geocoding API
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      // forecast API
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: ["2025-05-04"],
            temperature_2m_max: [25],
            temperature_2m_min: [15],
            weathercode: [2],
            precipitation_sum: [0],
            windspeed_10m_max: [10],
          },
        },
      });

    const result = await handler(validArgs, extra);

    // two calls: one for geocoding, one for daily forecast
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
    expect(result.content[0].text).toContain("15°C to 25°C");
    expect(result.content[0].text).toContain("Partly cloudy");
  });

  it("handles unit preferences correctly", async () => {
    // geocoding API
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      // forecast API
      .mockResolvedValueOnce({
        data: {
          daily: {
            time: ["2025-05-04"],
            temperature_2m_max: [77],
            temperature_2m_min: [59],
            weathercode: [2],
            precipitation_sum: [0],
            windspeed_10m_max: [6],
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

    expect(result.content[0].text).toContain("59°F to 77°F");
  });

  it("adjusts the forecast days correctly", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      .mockResolvedValueOnce({
        data: { daily: { time: [] } },
      });

    // Test with days=1
    await handler(
      {
        ...validArgs,
        days: 1,
      },
      extra,
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("forecast_days=1"),
    );

    mockedAxios.get.mockReset();
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { results: [{ latitude: 48.8566, longitude: 2.3522 }] },
      })
      .mockResolvedValueOnce({
        data: { daily: { time: [] } },
      });

    // Test with days=10
    await handler(
      {
        ...validArgs,
        days: 10,
      },
      extra,
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("forecast_days=10"),
    );
  });

  it("handles no-location-found", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
    const resp = await handler(validArgs, extra);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(resp.content[0].text).toBe("No location found for: Paris");
  });
});
