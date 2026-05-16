import { formatExactNumber, weatherDisplayFromReport } from "@/features/weather/weatherDisplayFromReport";

describe("formatExactNumber", () => {
  it("stringifies finite numbers without rounding", () => {
    expect(formatExactNumber(31.2)).toBe("31.2");
    expect(formatExactNumber(28.4)).toBe("28.4");
    expect(formatExactNumber(0)).toBe("0");
  });

  it("returns empty string for non-finite", () => {
    expect(formatExactNumber(Number.NaN)).toBe("");
  });
});

describe("weatherDisplayFromReport", () => {
  it("uses fallback place when payload empty", () => {
    const d = weatherDisplayFromReport(undefined, "Agra, UP");
    expect(d.placeLabel).toBe("Agra, UP");
    expect(d.tempLabel).toBe("—");
    expect(d.source).toBe("unknown");
  });

  it("reads flat temperature and humidity fields with exact decimals", () => {
    const d = weatherDisplayFromReport(
      {
        temperature_c: 31.2,
        humidity_percent: 48,
        rain_chance_percent: 12,
        condition: "Partly cloudy",
        location_label: "Agra",
        data_source: "live",
      },
      "Fallback",
    );
    expect(d.tempLabel).toBe("31.2°C");
    expect(d.humidityLabel).toBe("48%");
    expect(d.rainLabel).toBe("12%");
    expect(d.conditionLabel).toBe("Partly cloudy");
    expect(d.placeLabel).toBe("Agra");
    expect(d.source).toBe("live");
  });

  it("treats cached / offline data_source as cached badge", () => {
    expect(weatherDisplayFromReport({ data_source: "offline" }, "X").source).toBe("cached");
    expect(weatherDisplayFromReport({ cached: true }, "X").source).toBe("cached");
  });

  it("maps documented API shape: current + forecast rain %, exact temps, cached flag", () => {
    const d = weatherDisplayFromReport(
      {
        farmer_id: "f1",
        lat: 27.18,
        lng: 78.01,
        current: {
          temperature_c: 28.4,
          feels_like_c: 30,
          humidity_pct: 55,
          wind_speed_kmh: 12,
          precipitation_mm: 0,
          weather_code: 1,
          condition: "Mainly clear",
        },
        forecast: [
          {
            date: "2026-05-03",
            temp_max_c: 32,
            temp_min_c: 24,
            precipitation_mm: 2,
            precip_probability_pct: 40,
            weather_code: 2,
            condition: "Partly cloudy",
          },
        ],
        cached: false,
        fetched_at: "2026-05-02T10:00:00Z",
        expires_at: "2026-05-02T16:00:00Z",
      },
      "Agra, UP",
    );
    expect(d.tempLabel).toBe("28.4°C");
    expect(d.conditionLabel).toBe("Mainly clear");
    expect(d.placeLabel).toBe("Agra, UP");
    expect(d.humidityLabel).toBe("55%");
    expect(d.rainLabel).toBe("40%");
    expect(d.source).toBe("live");
  });

  it("uses cached badge when documented payload has cached: true", () => {
    const d = weatherDisplayFromReport(
      {
        current: { temperature_c: 20, humidity_pct: 40, condition: "Cloudy" },
        forecast: [],
        cached: true,
      },
      "X",
    );
    expect(d.source).toBe("cached");
  });
});
