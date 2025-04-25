// js/apod.js

// Основна ініціалізація APOD-інтерфейсу
function setupAPOD() {
  // 1) Отримуємо API Key
  let apiKey = localStorage.getItem('nasa_api_key');
  if (!apiKey) {
    apiKey = prompt('Введіть ваш NASA API Key:');
    if (apiKey) {
      localStorage.setItem('nasa_api_key', apiKey);
    } else {
      return alert('API Key потрібен для APOD.');
    }
  }

  // 2) DOM-елементи
  const dateInput = document.getElementById('date-input');
  const beforeEl  = document.getElementById('apod-img-before');
  const currEl    = document.getElementById('apod-img');
  const nextEl    = document.getElementById('apod-img-next');
  const titleEl   = document.getElementById('apod-title');
  const descEl    = document.getElementById('apod-desc');
  if (!dateInput) return;

  // 3) Формат дати YYYY-MM-DD
  const fmt = d => d.toISOString().split('T')[0];

  // 4) Фетч одного APOD
  async function fetchAPODSingle(date) {
    const url = new URL('https://api.nasa.gov/planetary/apod');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('date',     date);
    url.searchParams.set('thumbs',   'true');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // 5) Фетч діапазону APOD (для updateAPOD)
  async function fetchAPODRange(start, end) {
    const url = new URL('https://api.nasa.gov/planetary/apod');
    url.searchParams.set('api_key',    apiKey);
    url.searchParams.set('start_date', start);
    url.searchParams.set('end_date',   end);
    url.searchParams.set('thumbs',     'true');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // 6) Поставити дані у <img> елемент
  function setImg(el, data) {
    if (data.media_type === 'video' && data.thumbnail_url) {
      el.src = data.thumbnail_url;
    } else {
      el.src = data.url;
    }
    el.alt           = data.title;
    el.style.display = '';
  }

  // 7) Ініціалізація при старті: центр — сьогодні, боки — випадкові за останні 3 роки
  async function initStartup() {
    try {
      const today    = new Date();
      const todayStr = fmt(today);
      dateInput.value = todayStr;        // щоб інпут показував сьогодні
      dateInput.max   = todayStr;

      // 7.1) центральний APOD (сьогодні)
      const dataCurr = await fetchAPODSingle(todayStr);

      // 7.2) два випадкові дні за останні 3 роки
      const endDate   = today.getTime();
      const startDate = new Date();
      startDate.setFullYear(today.getFullYear() - 3);
      const startMs   = startDate.getTime();
      const spanMs    = endDate - startMs;

      function randomDateStr() {
        const r = new Date(startMs + Math.random() * spanMs);
        return fmt(r);
      }

      let rand1 = randomDateStr();
      let rand2 = randomDateStr();
      // захист від дублювання сьогодні та одна однаково
      while (rand1 === todayStr) rand1 = randomDateStr();
      while (rand2 === todayStr || rand2 === rand1) rand2 = randomDateStr();

      const [dataPrev, dataNext] = await Promise.all([
        fetchAPODSingle(rand1),
        fetchAPODSingle(rand2),
      ]);

      // 7.3) заповнюємо картинки
      setImg(beforeEl, dataPrev);
      setImg(currEl,   dataCurr);
      setImg(nextEl,   dataNext);

      // 7.4) заголовок/опис центрального
      titleEl.textContent = dataCurr.title;
      descEl.textContent  = dataCurr.explanation;

      // 7.5) клікабельні боки: при кліці стають центром
      beforeEl.style.cursor = 'pointer';
      nextEl.style.cursor   = 'pointer';

      beforeEl.onclick = () => {
        dateInput.value = dataPrev.date;
        updateAPOD();
      };
      nextEl.onclick = () => {
        dateInput.value = dataNext.date;
        updateAPOD();
      };
    } catch(err) {
      console.error('initStartup error:', err);
    }
  }

  // 8) Оновлення UI при зміні дати (prev / today / next)
  async function updateAPOD() {
    try {
      const todayStr   = fmt(new Date());
      const currDate   = new Date(dateInput.value);
      const prevDate   = new Date(currDate); prevDate.setDate(currDate.getDate() - 1);
      const nextDate   = new Date(currDate); nextDate.setDate(currDate.getDate() + 1);
      const prevStr    = fmt(prevDate);
      const currStr    = fmt(currDate);
      const nextStrRaw = fmt(nextDate);

      // лоадер
      titleEl.textContent = 'Завантаження…';
      descEl.textContent  = '';
      [beforeEl, currEl, nextEl].forEach(img => img.style.display = 'none');

      // запит від prev до (next або today)
      const endStr     = nextDate > new Date(todayStr) ? todayStr : nextStrRaw;
      const dataArr    = await fetchAPODRange(prevStr, endStr);
      const dataPrev   = dataArr[0];
      const dataCurr   = dataArr[1];
      let   dataNext   = dataArr[2];

      // якщо next відсутній (бо це сьогодні), підтягуємо одну випадкову дату
      if (!dataNext) {
        const randomMs   = Date.now() - Math.random() * (Date.now() - new Date('1995-06-16').getTime());
        const randomDate = fmt(new Date(randomMs));
        dataNext = await fetchAPODSingle(randomDate);
      }

      // встановлюємо картинки
      setImg(beforeEl, dataPrev);
      setImg(currEl,   dataCurr);
      setImg(nextEl,   dataNext);

      // оновлюємо заголовок/опис центрального
      titleEl.textContent = dataCurr.title;
      descEl.textContent  = dataCurr.explanation;

      // бічні клікабельні зсуви
      beforeEl.style.cursor = 'pointer';
      nextEl.style.cursor   = 'pointer';
      beforeEl.onclick = () => {
        dateInput.value = fmt(new Date(prevStr));
        updateAPOD();
      };
      nextEl.onclick = () => {
        dateInput.value = dataNext.date;
        updateAPOD();
      };
    } catch (err) {
      console.error('updateAPOD error:', err);
      titleEl.textContent = 'Помилка';
      descEl.textContent  = err.message;
      [beforeEl, currEl, nextEl].forEach(img => img.style.display = 'none');
    }
  }

  // 9) Бінд події та старт
  dateInput.addEventListener('change', updateAPOD);
  initStartup();
}

// Слухаємо HTMX-івент і викликаємо setupAPOD
document.body.addEventListener('htmx:afterSwap', setupAPOD);
