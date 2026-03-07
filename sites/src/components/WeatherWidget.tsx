import { useEffect, useState } from 'preact/hooks';

interface WeatherData {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
}

interface Props {
  latitude: number;
  longitude: number;
}

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Ciel dégagé', emoji: '\u2600\uFE0F' },
  1: { label: 'Peu nuageux', emoji: '\u26C5' },
  2: { label: 'Partiellement nuageux', emoji: '\u26C5' },
  3: { label: 'Couvert', emoji: '\u2601\uFE0F' },
  45: { label: 'Brouillard', emoji: '\uD83C\uDF2B\uFE0F' },
  48: { label: 'Brouillard givrant', emoji: '\uD83C\uDF2B\uFE0F' },
  51: { label: 'Bruine légère', emoji: '\uD83C\uDF26\uFE0F' },
  53: { label: 'Bruine', emoji: '\uD83C\uDF26\uFE0F' },
  55: { label: 'Bruine dense', emoji: '\uD83C\uDF26\uFE0F' },
  56: { label: 'Bruine verglaçante', emoji: '\uD83C\uDF27\uFE0F' },
  57: { label: 'Bruine verglaçante', emoji: '\uD83C\uDF27\uFE0F' },
  61: { label: 'Pluie légère', emoji: '\uD83C\uDF27\uFE0F' },
  63: { label: 'Pluie', emoji: '\uD83C\uDF27\uFE0F' },
  65: { label: 'Pluie forte', emoji: '\uD83C\uDF27\uFE0F' },
  66: { label: 'Pluie verglaçante', emoji: '\uD83C\uDF27\uFE0F' },
  67: { label: 'Pluie verglaçante forte', emoji: '\uD83C\uDF27\uFE0F' },
  71: { label: 'Neige légère', emoji: '\uD83C\uDF28\uFE0F' },
  73: { label: 'Neige', emoji: '\uD83C\uDF28\uFE0F' },
  75: { label: 'Neige forte', emoji: '\uD83C\uDF28\uFE0F' },
  77: { label: 'Grésil', emoji: '\uD83C\uDF28\uFE0F' },
  80: { label: 'Averses légères', emoji: '\uD83C\uDF26\uFE0F' },
  81: { label: 'Averses', emoji: '\uD83C\uDF26\uFE0F' },
  82: { label: 'Averses violentes', emoji: '\uD83C\uDF27\uFE0F' },
  85: { label: 'Averses de neige', emoji: '\uD83C\uDF28\uFE0F' },
  86: { label: 'Averses de neige fortes', emoji: '\uD83C\uDF28\uFE0F' },
  95: { label: 'Orage', emoji: '\u26C8\uFE0F' },
  96: { label: 'Orage avec grêle', emoji: '\u26C8\uFE0F' },
  99: { label: 'Orage violent', emoji: '\u26C8\uFE0F' },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { label: 'Inconnu', emoji: '\uD83C\uDF24\uFE0F' };
}

function getDayName(dateStr: string, index: number): string {
  if (index === 0) return "Auj.";
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
}

export default function WeatherWidget({ latitude, longitude }: Props) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=3`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div class="animate-pulse flex flex-col sm:flex-row gap-4 items-center">
        <div class="h-20 w-48 bg-gray-200 rounded-xl" />
        <div class="flex gap-3">
          <div class="h-16 w-24 bg-gray-200 rounded-lg" />
          <div class="h-16 w-24 bg-gray-200 rounded-lg" />
          <div class="h-16 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p class="text-sm text-gray-500">
        Impossible de charger les données météo pour le moment.
      </p>
    );
  }

  const current = data.current_weather;
  const currentInfo = getWeatherInfo(current.weathercode);

  return (
    <div class="flex flex-col sm:flex-row items-center gap-6">
      {/* Météo actuelle */}
      <div class="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-6 py-4 shadow-sm">
        <span class="text-5xl" role="img" aria-label={currentInfo.label}>
          {currentInfo.emoji}
        </span>
        <div>
          <p class="text-3xl font-bold text-gray-900">
            {Math.round(current.temperature)}°C
          </p>
          <p class="text-sm text-gray-600">{currentInfo.label}</p>
          <p class="text-xs text-gray-400">Vent : {Math.round(current.windspeed)} km/h</p>
        </div>
      </div>

      {/* Prévisions 3 jours */}
      <div class="flex gap-3">
        {data.daily.time.map((day, i) => {
          const info = getWeatherInfo(data.daily.weathercode[i]);
          return (
            <div
              key={day}
              class="flex flex-col items-center bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm min-w-[5rem]"
            >
              <span class="text-xs font-medium text-gray-500 capitalize">
                {getDayName(day, i)}
              </span>
              <span class="text-2xl my-1" role="img" aria-label={info.label}>
                {info.emoji}
              </span>
              <div class="flex gap-1.5 text-sm">
                <span class="font-semibold text-gray-900">
                  {Math.round(data.daily.temperature_2m_max[i])}°
                </span>
                <span class="text-gray-400">
                  {Math.round(data.daily.temperature_2m_min[i])}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
