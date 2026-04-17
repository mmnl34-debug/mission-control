export type WeatherData = {
  city: string
  temp: number
  feelsLike: number
  description: string
  humidity: number
  windSpeed: number   // m/s
  icon: string        // OWM icon code
  code: number        // weather condition code
}

const WEATHER_EMOJI: Record<number, string> = {
  800: '☀️',
  801: '🌤️',
  802: '⛅',
  803: '🌥️',
  804: '☁️',
}

export function weatherEmoji(code: number): string {
  if (code in WEATHER_EMOJI) return WEATHER_EMOJI[code]
  if (code >= 200 && code < 300) return '⛈️'
  if (code >= 300 && code < 400) return '🌦️'
  if (code >= 500 && code < 600) return '🌧️'
  if (code >= 600 && code < 700) return '❄️'
  if (code >= 700 && code < 800) return '🌫️'
  return '🌡️'
}

export async function fetchWeather(city = 'Eindhoven'): Promise<WeatherData | null> {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},NL&appid=${key}&units=metric&lang=nl`,
      { next: { revalidate: 900 } }
    )
    if (!res.ok) return null
    const d = await res.json()
    return {
      city: d.name,
      temp: Math.round(d.main.temp),
      feelsLike: Math.round(d.main.feels_like),
      description: d.weather[0].description,
      humidity: d.main.humidity,
      windSpeed: Math.round(d.wind.speed * 3.6), // m/s → km/h
      icon: d.weather[0].icon,
      code: d.weather[0].id,
    }
  } catch {
    return null
  }
}
