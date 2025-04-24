// js/apod.js

// Основна ініціалізація APOD-інтерфейсу
function setupAPOD() {
  // 1) Отримуємо API Key з localStorage або через prompt
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
  const imgEl     = document.getElementById('apod-img');
  const titleEl   = document.getElementById('apod-title');
  const descEl    = document.getElementById('apod-desc');

  if (!dateInput) return; // переконатися, що partial вже завантажений

  // 3) Ініціалізація date picker
  const today = new Date().toISOString().split('T')[0];
  dateInput.max   = today;
  dateInput.value = today;

  // 4) Функція fetch
  async function fetchAPOD(date) {
    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}&thumbs=true`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // 5) Оновлення UI
  async function updateAPOD() {
    try {
      const date = dateInput.value;
      titleEl.textContent = 'Завантаження…';
      descEl.textContent  = '';
      imgEl.style.display = 'none';

      const data = await fetchAPOD(date);
      if (data.media_type === 'video' && data.thumbnail_url) {
        imgEl.src         = data.thumbnail_url;
        imgEl.alt         = 'Video thumbnail';
        imgEl.style.display = '';
      } else {
        imgEl.src         = data.url;
        imgEl.alt         = data.title;
        imgEl.style.display = '';
      }

      titleEl.textContent = data.title;
      descEl.textContent  = data.explanation;
    } catch (err) {
      titleEl.textContent = 'Помилка';
      descEl.textContent  = err.message;
      imgEl.style.display = 'none';
    }
  }

  // 6) Виклик update при зміні дати та на старті
  dateInput.addEventListener('change', updateAPOD);
  updateAPOD();
}

// Слухаємо HTMX подію: після swap викликаємо налаштування
document.body.addEventListener('htmx:afterSwap', setupAPOD);
