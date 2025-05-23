// js/apod.js

function setupAPOD() {
  // 1) Отримуємо API Key
  let apiKey = localStorage.getItem('nasa_api_key');
  if (!apiKey) apiKey = 'DEMO_KEY';

  // 2) DOM-елементи
  const dateInput = document.getElementById('date-input');
  const beforeEl  = document.getElementById('apod-img-before');
  const currEl    = document.getElementById('apod-img');
  const nextEl    = document.getElementById('apod-img-next');
  const titleEl   = document.getElementById('apod-title');
  const descEl    = document.getElementById('apod-desc');
  if (!dateInput) return;  // нічого не робимо, якщо немає input

  // 3) Форматер дати та today max
  const fmt = d => d.toISOString().split('T')[0];
  const todayStr = fmt(new Date());
  dateInput.max = todayStr;

  // 4) Підготовка fallback
  const FALLBACK_COUNT = 10;
  const nowMs   = Date.now();
  const startMs = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).getTime();

  function getRandomFallback() {
    const idx = Math.floor(Math.random() * FALLBACK_COUNT);
    return `img/fallback/${idx}.jpg`;  // або просто `fallback/${idx}.jpg` в залежності від твоєї структури
  }

  // 5) Функції для запитів до NASA APOD API
  async function fetchAPODSingle(date) {
    const url = new URL('https://api.nasa.gov/planetary/apod');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('date', date);
    url.searchParams.set('thumbs', 'true');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchAPODRange(start, end) {
    const url = new URL('https://api.nasa.gov/planetary/apod');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('start_date', start);
    url.searchParams.set('end_date', end);
    url.searchParams.set('thumbs', 'true');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // 6) Встановлення зображення (з fallback)
  function setImg(el, data) {
    if (!data || (!data.url && !data.thumbnail_url)) {
      el.src = getRandomFallback();
      el.alt = 'Fallback image';
      el.style.display = '';
      return;
    }
    if (data.media_type === 'video' && data.thumbnail_url) {
      el.src = data.thumbnail_url;
    } else {
      el.src = data.url;
    }
    el.alt = data.title;
    el.style.display = '';
  }

  // 7) Початкове завантаження (today + дві випадкові дати)
  async function initStartup() {
    [beforeEl, currEl, nextEl].forEach(el => {
      el.style.display = 'none';
      el.src = '';
      el.alt = '';
    });

    // central = today
    const dataCurr = await fetchAPODSingle(todayStr).catch(() => null);
    setImg(currEl, dataCurr);

    // дві випадкові дати за останні 5 років
    function randDateStr() {
      return fmt(new Date(startMs + Math.random() * (nowMs - startMs)));
    }
    let d1 = randDateStr(), d2 = randDateStr();
    while (d1 === todayStr) d1 = randDateStr();
    while (d2 === todayStr || d2 === d1) d2 = randDateStr();

    const dataPrev = await fetchAPODSingle(d1).catch(() => null);
    const dataNext = await fetchAPODSingle(d2).catch(() => null);

    setImg(beforeEl, dataPrev);
    setImg(nextEl, dataNext);

    // текст під картинкою
    if (dataCurr) {
      titleEl.textContent = dataCurr.title;
      descEl.textContent = dataCurr.explanation;
    } else {
      titleEl.textContent = 'No data';
      descEl.textContent  = '';
    }

    // клікабельність
    beforeEl.style.cursor = 'pointer';
    nextEl.style.cursor   = 'pointer';
    beforeEl.onclick = () => {
      dateInput.value = dataPrev?.date || todayStr;
      updateAPOD();
    };
    nextEl.onclick = () => {
      dateInput.value = dataNext?.date || todayStr;
      updateAPOD();
    };
  }

  // 8) Оновлення за обраною датою
  async function updateAPOD() {
    try {
      const currDate = new Date(dateInput.value);
      const prevDate = new Date(currDate); prevDate.setDate(currDate.getDate() - 1);
      const nextDate = new Date(currDate); nextDate.setDate(currDate.getDate() + 1);

      titleEl.textContent = 'Завантаження…';
      descEl.textContent  = '';
      [beforeEl, currEl, nextEl].forEach(img => img.style.display = 'none');

      const start = fmt(prevDate);
      const end   = nextDate > new Date(todayStr) ? todayStr : fmt(nextDate);
      const arr   = await fetchAPODRange(start, end);
      const dp    = arr[0], dc = arr[1], dn = arr[2];

      let dataNext = dn;
      if (!dataNext) {
        const randomMs = startMs + Math.random() * (nowMs - startMs);
        dataNext = await fetchAPODSingle(fmt(new Date(randomMs)));
      }

      setImg(beforeEl, dp);
      setImg(currEl, dc);
      setImg(nextEl, dataNext);

      titleEl.textContent = dc.title;
      descEl.textContent  = dc.explanation;

      beforeEl.style.cursor = 'pointer';
      nextEl.style.cursor   = 'pointer';
      beforeEl.onclick = () => {
        dateInput.value = fmt(prevDate);
        updateAPOD();
      };
      nextEl.onclick = () => {
        dateInput.value = dataNext.date;
        updateAPOD();
      };
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error("updateAPOD error:", err);
      setImg(beforeEl, null);
      setImg(currEl, null);
      setImg(nextEl, null);
      titleEl.textContent = 'Error';
      descEl.textContent = err.message;
    }
  }

  // 9) Слухаємо зміну дати і запускаємо стартовий лоад
  dateInput.addEventListener('change', updateAPOD);
  initStartup();
}

// Коли сторінка завантажиться або після HTMX swap — налаштовуємо APOD
document.addEventListener('DOMContentLoaded', setupAPOD);
document.body.addEventListener('htmx:afterSwap', setupAPOD);
