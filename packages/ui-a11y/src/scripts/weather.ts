/**
 * Météo de la commune, demandée par le navigateur du visiteur à Open-Meteo (service européen,
 * sans cookie ni compte). Rien n'est appelé au build : la prévision resterait figée.
 *
 * Si l'appel échoue (hors ligne, service indisponible), le bloc reste masqué : une page publique
 * ne doit jamais afficher un widget cassé.
 */
const WEATHER_LABELS: Array<[number[], string]> = [
  [[0], 'Ciel dégagé'],
  [[1], 'Peu nuageux'],
  [[2], 'Partiellement nuageux'],
  [[3], 'Couvert'],
  [[45, 48], 'Brouillard'],
  [[51, 53, 55, 56, 57], 'Bruine'],
  [[61, 63, 65, 66, 67], 'Pluie'],
  [[71, 73, 75, 77], 'Neige'],
  [[80, 81, 82], 'Averses'],
  [[85, 86], 'Averses de neige'],
  [[95, 96, 99], 'Orage'],
];

export const weatherLabel = (code: number) =>
  WEATHER_LABELS.find(([codes]) => codes.includes(code))?.[1] ?? 'Temps variable';

type Forecast = {
  current?: { temperature_2m: number; weather_code: number };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[] };
};

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(new Date(`${iso}T12:00:00Z`));

export async function initWeather() {
  for (const element of document.querySelectorAll<HTMLElement>('[data-cn-weather]')) {
    const { lat, lng } = JSON.parse(element.dataset.cnWeather!) as { lat: number; lng: number };
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max&forecast_days=4&timezone=Europe%2FParis';

    const forecast = (await fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)) as Forecast | null;
    if (!forecast?.current || !forecast.daily) continue;

    const now = document.createElement('p');
    now.className = 'cn-weather-now';
    now.innerHTML = `<strong class="cn-weather-temp">${Math.round(forecast.current.temperature_2m)} °C</strong> <span>${weatherLabel(forecast.current.weather_code)}</span>`;

    const days = document.createElement('ul');
    days.className = 'cn-weather-days';
    for (let index = 1; index < forecast.daily.time.length; index += 1) {
      const item = document.createElement('li');
      const label = dayLabel(forecast.daily.time[index]);
      item.innerHTML = `<span>${label}</span> <strong>${Math.round(forecast.daily.temperature_2m_max[index])} °C</strong> <span>${weatherLabel(forecast.daily.weather_code[index])}</span>`;
      days.append(item);
    }

    element.querySelector('[data-cn-weather-content]')?.replaceChildren(now, days);
    element.hidden = false;
  }
}

void initWeather();
