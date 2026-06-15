export type WeatherData = {
  city: string
  temp: number
  feelsLike: number
  description: string
  humidity: number
  windSpeed: number   // km/h
  icon: string        // OWM icon code
  code: number        // weather condition code
}

export type ForecastDay = {
  label: string   // "di", "wo", "do"
  emoji: string
  min: number
  max: number
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

const DAY_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

export async function fetchForecast(city = 'Eindhoven'): Promise<ForecastDay[]> {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return []

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},NL&appid=${key}&units=metric&lang=nl&cnt=32`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    const todayStr = new Date().toISOString().slice(0, 10)
    const dayMap: Record<string, { temps: number[]; codes: number[] }> = {}

    for (const item of data.list as { dt_txt: string; main: { temp: number }; weather: { id: number }[] }[]) {
      const date = item.dt_txt.slice(0, 10)
      if (date === todayStr) continue
      if (!dayMap[date]) dayMap[date] = { temps: [], codes: [] }
      dayMap[date].temps.push(item.main.temp)
      dayMap[date].codes.push(item.weather[0].id)
    }

    return Object.entries(dayMap)
      .slice(0, 3)
      .map(([date, d]) => {
        const dow = new Date(date).getUTCDay()
        const midCode = d.codes[Math.floor(d.codes.length / 2)]
        return {
          label: DAY_NL[dow],
          emoji: weatherEmoji(midCode),
          min: Math.round(Math.min(...d.temps)),
          max: Math.round(Math.max(...d.temps)),
        }
      })
  } catch {
    return []
  }
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
