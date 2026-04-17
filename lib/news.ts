export type NewsItem = {
  title: string
  url: string
  source: 'hn' | 'nos'
  score?: number
}

// Hacker News top stories — gratis, geen key nodig
export async function fetchHNNews(limit = 5): Promise<NewsItem[]> {
  try {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      next: { revalidate: 900 },
    })
    if (!idsRes.ok) return []
    const ids: number[] = await idsRes.json()

    const stories = await Promise.all(
      ids.slice(0, limit * 2).map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          next: { revalidate: 900 },
        }).then(r => r.ok ? r.json() : null)
      )
    )

    return stories
      .filter((s): s is { title: string; url: string; id: number; score: number } =>
        s && s.title && typeof s.url === 'string'
      )
      .slice(0, limit)
      .map(s => ({
        title: s.title,
        url: s.url,
        source: 'hn' as const,
        score: s.score,
      }))
  } catch {
    return []
  }
}

// NOS RSS — gratis, geen key nodig
export async function fetchNOSNews(limit = 5): Promise<NewsItem[]> {
  try {
    const res = await fetch('https://feeds.nos.nl/nosnieuws', {
      headers: { 'User-Agent': 'mission-control-dashboard/1.0' },
      next: { revalidate: 900 },
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Parse CDATA titles en links
    const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)]
    const results: NewsItem[] = []

    for (const item of items.slice(0, limit)) {
      const titleMatch = item[0].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
      const linkMatch = item[0].match(/<link>(https?:\/\/[^\s<]+)<\/link>/)
      if (titleMatch && linkMatch) {
        results.push({
          title: titleMatch[1].trim(),
          url: linkMatch[1].trim(),
          source: 'nos' as const,
        })
      }
    }
    return results
  } catch {
    return []
  }
}

export async function fetchAllNews(): Promise<{ hn: NewsItem[]; nos: NewsItem[] }> {
  const [hn, nos] = await Promise.all([fetchHNNews(5), fetchNOSNews(5)])
  return { hn, nos }
}
