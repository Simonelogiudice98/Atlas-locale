import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const GeocodingResultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});
type GeocodingResult = z.infer<typeof GeocodingResultSchema>;

const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema).optional(),
});
type GeocodingResponse = z.infer<typeof GeocodingResponseSchema>;

const CurrentWeatherSchema = z.object({
  temperature_2m: z.number(),
  wind_speed_10m: z.number(),
  relative_humidity_2m: z.number(),
});

const WeatherResponseSchema = z.object({
  current: CurrentWeatherSchema,
});

const GEOCODING_API_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API_BASE = "https://api.open-meteo.com/v1/forecast";

const weatherServer = new McpServer({
  name: "weather",
  version: "1.0.0",
});

weatherServer.registerTool(
  "get_weather",
  {
    description: "Restituisce il meteo attuale per una città specificata",
    inputSchema: {
      city: z
        .string()
        .describe("Nome della città di cui si vuole conoscere il meteo"),
    },
  },
  async ({ city }) => {
    const geoUrl = `${GEOCODING_API_BASE}?name=${encodeURIComponent(city)}&count=1&language=it`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocoding fallito: HTTP ${geoRes.status}`);
    }

    const parsedGeoData = GeocodingResponseSchema.parse(await geoRes.json());
    if (!parsedGeoData.results || parsedGeoData.results.length === 0) {
      throw new Error(`Città non trovata: "${city}"`);
    }
    const { latitude, longitude, name } = parsedGeoData.results[0];

    const weatherUrl = `${FORECAST_API_BASE}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      throw new Error(`Richiesta meteo fallita: HTTP ${weatherRes.status}`);
    }

    const parsedWeatherData = WeatherResponseSchema.parse(await weatherRes.json());

    return {
        content:[
            {
                type:"text" as const,
                text:`Meteo a ${name}: ${parsedWeatherData.current.temperature_2m}°C, umidità ${parsedWeatherData.current.relative_humidity_2m}%, vento ${parsedWeatherData.current.wind_speed_10m} km/h`,
            },
            
        ],
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await weatherServer.connect(transport);
  console.error("weather MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
