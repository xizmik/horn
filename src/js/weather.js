const WMO_MAP = {
  0: ["Ясно", "☀️"], 1: ["Малооблачно", "🌤️"], 2: ["Переменная облачность", "⛅"], 3: ["Пасмурно", "☁️"],
  45: ["Туман", "🌫️"], 48: ["Изморозь", "🌫️"],
  51: ["Морось", "🌦️"], 53: ["Морось", "🌦️"], 55: ["Сильная морось", "🌧️"],
  61: ["Небольшой дождь", "🌦️"], 63: ["Дождь", "🌧️"], 65: ["Сильный дождь", "🌧️"],
  71: ["Снег", "🌨️"], 73: ["Снегопад", "❄️"], 75: ["Сильный снег", "❄️"],
  80: ["Ливень", "🌦️"], 81: ["Ливень", "🌧️"], 82: ["Сильный ливень", "⛈️"],
  95: ["Гроза", "⛈️"], 96: ["Гроза с градом", "⛈️"], 99: ["Гроза с градом", "⛈️"],
};

export function decodeWeather(code) {
  const [label, icon] = WMO_MAP[code] || ["Облачно", "☁️"];
  return { label, icon };
}

export async function searchCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Не удалось найти город");
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.name,
    country: r.country || "",
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ошибка получения погоды");
  const data = await res.json();
  const cur = decodeWeather(data.current?.weather_code);
  const forecast = (data.daily?.time || []).map((d, i) => ({
    date: d.slice(5),
    max: Math.round(data.daily.temperature_2m_max[i]),
    min: Math.round(data.daily.temperature_2m_min[i]),
    ...decodeWeather(data.daily.weather_code[i]),
  }));
  return {
    temp: Math.round(data.current?.temperature_2m ?? 0),
    label: cur.label,
    icon: cur.icon,
    forecast,
    updatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
}