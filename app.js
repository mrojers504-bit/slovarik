/* ===== STATE ===== */
const STORAGE_KEY = 'leyla_dictionary';

let state = {
  languages: [],
  words: [],
  activeLangId: null,
};

let searchQuery = '';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (_) {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ===== DOM REFS ===== */
const btnAddLang    = document.getElementById('btn-add-lang');
const btnFlashcards = document.getElementById('btn-flashcards');
const sectionWords  = document.getElementById('section-words');
const sectionFC     = document.getElementById('section-flashcards');

const modalWord     = document.getElementById('modal-word');
const formWord      = document.getElementById('form-word');
const modalWordTitle= document.getElementById('modal-word-title');
const fieldWord     = document.getElementById('field-word');
const fieldTrans    = document.getElementById('field-translation');
const fieldTranscr  = document.getElementById('field-transcription');
const fieldExample  = document.getElementById('field-example');
const fieldComment  = document.getElementById('field-comment');
const btnCancelWord = document.getElementById('btn-cancel-word');

const modalLang     = document.getElementById('modal-lang');
const formLang      = document.getElementById('form-lang');
const fieldLangName = document.getElementById('field-lang-name');
const fieldLangEmoji= document.getElementById('field-lang-emoji');
const emojiPreview     = document.getElementById('emoji-preview');
const flagSearchInput  = document.getElementById('flag-search-input');
const flagDropdown     = document.getElementById('flag-dropdown');
const flagClearBtn     = document.getElementById('flag-clear-btn');
const btnCancelLang    = document.getElementById('btn-cancel-lang');

const modalConfirm  = document.getElementById('modal-confirm');
const confirmText   = document.getElementById('confirm-text');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmNo  = document.getElementById('btn-confirm-no');

/* ===== LANG DROPDOWN ===== */
const langSelectBtn  = document.getElementById('lang-select-btn');
const langSelectWrap = document.getElementById('lang-select-wrap');
const langDropdownEl = document.getElementById('lang-dropdown');
const langSelectFlag = document.getElementById('lang-select-flag');
const langSelectName = document.getElementById('lang-select-name');

function renderTabs() {
  const lang = state.languages.find(l => l.id === state.activeLangId);

  // обновляем кнопку
  langSelectFlag.className = lang && lang.emoji ? `fi fi-${lang.emoji}` : '';
  langSelectFlag.style.display = lang && lang.emoji ? 'inline-block' : 'none';
  langSelectName.textContent = lang ? lang.name : 'Выбери язык';

  // рендерим список
  langDropdownEl.innerHTML = '';
  if (state.languages.length === 0) {
    langDropdownEl.innerHTML = '<div class="lang-dropdown-empty">Нет языков — добавь первый!</div>';
    return;
  }
  state.languages.forEach(l => {
    const item = document.createElement('div');
    item.className = 'lang-dropdown-item' + (l.id === state.activeLangId ? ' active' : '');

    if (l.emoji) {
      const flag = document.createElement('span');
      flag.className = `fi fi-${l.emoji}`;
      item.appendChild(flag);
    }
    const name = document.createElement('span');
    name.className = 'lang-dropdown-item-name';
    name.textContent = l.name;
    item.appendChild(name);

    const del = document.createElement('span');
    del.className = 'lang-dropdown-delete';
    del.textContent = '✕';
    del.title = 'Удалить';
    del.addEventListener('click', e => {
      e.stopPropagation();
      closeLangDropdown();
      confirmDeleteLang(l);
    });
    item.appendChild(del);

    item.addEventListener('click', () => {
      state.activeLangId = l.id;
      searchQuery = '';
      saveState();
      closeLangDropdown();
      render();
    });

    langDropdownEl.appendChild(item);
  });
}

function openLangDropdown() {
  langDropdownEl.style.display = '';
  langSelectWrap.classList.add('open');
}
function closeLangDropdown() {
  langDropdownEl.style.display = 'none';
  langSelectWrap.classList.remove('open');
}

langSelectBtn.addEventListener('click', e => {
  e.stopPropagation();
  langDropdownEl.style.display === 'none' ? openLangDropdown() : closeLangDropdown();
});
document.addEventListener('click', () => closeLangDropdown());

/* ===== HIGHLIGHT ===== */
function highlight(text, query) {
  if (!query) return esc(text);
  const escaped = esc(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQuery, 'gi'),
    m => `<mark class="search-highlight">${m}</mark>`);
}

/* ===== RENDER WORDS TABLE ===== */
function renderWords() {
  const lang = state.languages.find(l => l.id === state.activeLangId);

  if (!lang) {
    sectionWords.innerHTML = `
      <div id="no-lang-state">
        <h2>Нет языковых блоков</h2>
        <p>Нажми «+ Язык» чтобы создать первый блок</p>
        <button class="btn-primary" id="btn-add-lang-inline">+ Добавить язык</button>
      </div>`;
    document.getElementById('btn-add-lang-inline').addEventListener('click', openLangModal);
    return;
  }

  // Restore section HTML if it was replaced by "no lang" state
  if (!document.getElementById('words-title')) {
    sectionWords.innerHTML = `
      <div class="words-header">
        <h2 id="words-title"></h2>
        <button class="btn-primary" id="btn-add-word">+ Добавить слово</button>
      </div>
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="Поиск по слову или переводу..." autocomplete="off" />
        <button class="search-clear" id="search-clear" style="display:none">✕</button>
      </div>
      <div id="words-empty" class="empty-state" style="display:none"></div>
      <table id="words-table">
        <thead><tr>
          <th>Слово</th><th>Перевод</th>
          <th>Транскрипция</th><th>Пример</th><th></th>
        </tr></thead>
        <tbody id="words-body"></tbody>
      </table>`;
    document.getElementById('btn-add-word').addEventListener('click', () => openWordModal(null));
    bindSearchInput();
  }

  const titleEl = document.getElementById('words-title');
  titleEl.innerHTML = '';
  if (lang.emoji) {
    const flag = document.createElement('span');
    flag.className = `fi fi-${lang.emoji}`;
    flag.style.cssText = 'width:22px;height:17px;border-radius:3px;display:inline-block;vertical-align:middle;margin-right:8px;background-size:cover;';
    titleEl.appendChild(flag);
  }
  titleEl.appendChild(document.createTextNode(lang.name));

  // sync search input value
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = searchQuery;
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = searchQuery ? '' : 'none';
  }

  const allWords = state.words.filter(w => w.langId === state.activeLangId);
  const q = searchQuery.toLowerCase().trim();
  const words = q
    ? allWords.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        (w.transcription || '').toLowerCase().includes(q) ||
        (w.example || '').toLowerCase().includes(q)
      )
    : allWords;

  const tbody = document.getElementById('words-body');
  const table = document.getElementById('words-table');
  const empty = document.getElementById('words-empty');

  if (allWords.length === 0) {
    table.style.display = 'none';
    empty.style.display = '';
    empty.innerHTML = '<p>Пока нет слов. Нажми «+ Добавить слово» чтобы начать.</p>';
  } else if (words.length === 0) {
    table.style.display = 'none';
    empty.style.display = '';
    empty.innerHTML = `<p>По запросу «${esc(searchQuery)}» ничего не найдено.</p>`;
  } else {
    table.style.display = '';
    empty.style.display = 'none';
    tbody.innerHTML = '';
    words.forEach(w => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-word">${highlight(w.word, q)}</td>
        <td class="td-translation">${highlight(w.translation, q)}</td>
        <td class="td-transcription">${highlight(w.transcription || '', q)}</td>
        <td class="td-example">
          ${highlight(w.example || '', q)}
          ${w.comment ? `<span class="td-comment">${esc(w.comment)}</span>` : ''}
        </td>
        <td class="td-actions">
          <button class="btn-icon edit" title="Редактировать">✏️</button>
          <button class="btn-icon delete" title="Удалить">🗑</button>
        </td>`;
      tr.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); openWordModal(w); });
      tr.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); confirmDeleteWord(w); });
      tr.addEventListener('click', () => openWordView(w));
      tbody.appendChild(tr);
    });
  }
}

function render() {
  renderTabs();
  renderWords();
}

/* ===== SEARCH ===== */
function bindSearchInput() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  if (!input) return;

  input.addEventListener('input', () => {
    searchQuery = input.value;
    clearBtn.style.display = searchQuery ? '' : 'none';
    renderWords();
  });

  clearBtn.addEventListener('click', () => {
    searchQuery = '';
    input.value = '';
    clearBtn.style.display = 'none';
    input.focus();
    renderWords();
  });
}

/* ===== ESCAPE HTML ===== */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== WORD MODAL ===== */
let editingWordId = null;

function openWordModal(word) {
  editingWordId = word ? word.id : null;
  modalWordTitle.textContent = word ? 'Редактировать слово' : 'Новое слово';
  fieldWord.value        = word ? word.word : '';
  fieldTrans.value       = word ? word.translation : '';
  fieldTranscr.value     = word ? (word.transcription || '') : '';
  fieldExample.value     = word ? (word.example || '') : '';
  fieldComment.value     = word ? (word.comment || '') : '';
  modalWord.style.display = 'flex';
  fieldWord.focus();
}

function closeWordModal() {
  modalWord.style.display = 'none';
  formWord.reset();
  editingWordId = null;
}

formWord.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    word:          fieldWord.value.trim(),
    translation:   fieldTrans.value.trim(),
    transcription: fieldTranscr.value.trim(),
    example:       fieldExample.value.trim(),
    comment:       fieldComment.value.trim(),
    langId:        state.activeLangId,
  };
  if (!data.word || !data.translation) return;

  if (editingWordId) {
    const idx = state.words.findIndex(w => w.id === editingWordId);
    if (idx !== -1) state.words[idx] = { ...state.words[idx], ...data };
  } else {
    state.words.push({ id: uid(), ...data });
  }
  saveState();
  closeWordModal();
  render();
});

btnCancelWord.addEventListener('click', closeWordModal);
modalWord.addEventListener('click', e => { if (e.target === modalWord) closeWordModal(); });

/* ===== LANG MODAL ===== */
function openLangModal() {
  fieldLangName.value = '';
  flagSearchInput.value = '';
  setFlagPreview('');
  flagDropdown.style.display = 'none';
  const hint = document.getElementById('flag-search-hint');
  if (hint) hint.style.display = '';
  modalLang.style.display = 'flex';
  fieldLangName.focus();
}

function closeLangModal() {
  modalLang.style.display = 'none';
  formLang.reset();
  flagSearchInput.value = '';
  setFlagPreview('');
  flagDropdown.style.display = 'none';
}

/* ===== FLAG SEARCH DATA ===== */
const ALL_COUNTRIES = [
  {code:'ac',name:'Остров Вознесения'},{code:'ad',name:'Андорра'},{code:'ae',name:'ОАЭ'},
  {code:'af',name:'Афганистан'},{code:'ag',name:'Антигуа и Барбуда'},{code:'ai',name:'Ангилья'},
  {code:'al',name:'Албания'},{code:'am',name:'Армения'},{code:'ao',name:'Ангола'},
  {code:'ar',name:'Аргентина'},{code:'at',name:'Австрия'},{code:'au',name:'Австралия'},
  {code:'az',name:'Азербайджан'},{code:'ba',name:'Босния и Герцеговина'},{code:'bb',name:'Барбадос'},
  {code:'bd',name:'Бангладеш'},{code:'be',name:'Бельгия'},{code:'bf',name:'Буркина-Фасо'},
  {code:'bg',name:'Болгария'},{code:'bh',name:'Бахрейн'},{code:'bi',name:'Бурунди'},
  {code:'bj',name:'Бенин'},{code:'bl',name:'Сен-Бартелеми'},{code:'bm',name:'Бермуды'},
  {code:'bn',name:'Бруней'},{code:'bo',name:'Боливия'},{code:'br',name:'Бразилия'},
  {code:'bs',name:'Багамы'},{code:'bt',name:'Бутан'},{code:'bw',name:'Ботсвана'},
  {code:'by',name:'Беларусь'},{code:'bz',name:'Белиз'},{code:'ca',name:'Канада'},
  {code:'cd',name:'ДР Конго'},{code:'cf',name:'ЦАР'},{code:'cg',name:'Конго'},
  {code:'ch',name:'Швейцария'},{code:'ci',name:'Кот-д\'Ивуар'},{code:'cl',name:'Чили'},
  {code:'cm',name:'Камерун'},{code:'cn',name:'Китай'},{code:'co',name:'Колумбия'},
  {code:'cr',name:'Коста-Рика'},{code:'cu',name:'Куба'},{code:'cv',name:'Кабо-Верде'},
  {code:'cy',name:'Кипр'},{code:'cz',name:'Чехия'},{code:'de',name:'Германия'},
  {code:'dj',name:'Джибути'},{code:'dk',name:'Дания'},{code:'dm',name:'Доминика'},
  {code:'do',name:'Доминиканская Республика'},{code:'dz',name:'Алжир'},{code:'ec',name:'Эквадор'},
  {code:'ee',name:'Эстония'},{code:'eg',name:'Египет'},{code:'er',name:'Эритрея'},
  {code:'es',name:'Испания'},{code:'et',name:'Эфиопия'},{code:'fi',name:'Финляндия'},
  {code:'fj',name:'Фиджи'},{code:'fr',name:'Франция'},{code:'ga',name:'Габон'},
  {code:'gb',name:'Великобритания'},{code:'gd',name:'Гренада'},{code:'ge',name:'Грузия'},
  {code:'gh',name:'Гана'},{code:'gm',name:'Гамбия'},{code:'gn',name:'Гвинея'},
  {code:'gq',name:'Экваториальная Гвинея'},{code:'gr',name:'Греция'},{code:'gt',name:'Гватемала'},
  {code:'gw',name:'Гвинея-Бисау'},{code:'gy',name:'Гайана'},{code:'hn',name:'Гондурас'},
  {code:'hr',name:'Хорватия'},{code:'ht',name:'Гаити'},{code:'hu',name:'Венгрия'},
  {code:'id',name:'Индонезия'},{code:'ie',name:'Ирландия'},{code:'il',name:'Израиль'},
  {code:'in',name:'Индия'},{code:'iq',name:'Ирак'},{code:'ir',name:'Иран'},
  {code:'is',name:'Исландия'},{code:'it',name:'Италия'},{code:'jm',name:'Ямайка'},
  {code:'jo',name:'Иордания'},{code:'jp',name:'Япония'},{code:'ke',name:'Кения'},
  {code:'kg',name:'Кыргызстан'},{code:'kh',name:'Камбоджа'},{code:'ki',name:'Кирибати'},
  {code:'km',name:'Коморы'},{code:'kn',name:'Сент-Китс и Невис'},{code:'kp',name:'Северная Корея'},
  {code:'kr',name:'Южная Корея'},{code:'kw',name:'Кувейт'},{code:'kz',name:'Казахстан'},
  {code:'la',name:'Лаос'},{code:'lb',name:'Ливан'},{code:'lc',name:'Сент-Люсия'},
  {code:'li',name:'Лихтенштейн'},{code:'lk',name:'Шри-Ланка'},{code:'lr',name:'Либерия'},
  {code:'ls',name:'Лесото'},{code:'lt',name:'Литва'},{code:'lu',name:'Люксембург'},
  {code:'lv',name:'Латвия'},{code:'ly',name:'Ливия'},{code:'ma',name:'Марокко'},
  {code:'mc',name:'Монако'},{code:'md',name:'Молдова'},{code:'me',name:'Черногория'},
  {code:'mg',name:'Мадагаскар'},{code:'ml',name:'Мали'},{code:'mm',name:'Мьянма'},
  {code:'mn',name:'Монголия'},{code:'mr',name:'Мавритания'},{code:'mt',name:'Мальта'},
  {code:'mu',name:'Маврикий'},{code:'mv',name:'Мальдивы'},{code:'mw',name:'Малави'},
  {code:'mx',name:'Мексика'},{code:'my',name:'Малайзия'},{code:'mz',name:'Мозамбик'},
  {code:'na',name:'Намибия'},{code:'ne',name:'Нигер'},{code:'ng',name:'Нигерия'},
  {code:'ni',name:'Никарагуа'},{code:'nl',name:'Нидерланды'},{code:'no',name:'Норвегия'},
  {code:'np',name:'Непал'},{code:'nr',name:'Науру'},{code:'nz',name:'Новая Зеландия'},
  {code:'om',name:'Оман'},{code:'pa',name:'Панама'},{code:'pe',name:'Перу'},
  {code:'pg',name:'Папуа — Новая Гвинея'},{code:'ph',name:'Филиппины'},{code:'pk',name:'Пакистан'},
  {code:'pl',name:'Польша'},{code:'pt',name:'Португалия'},{code:'pw',name:'Палау'},
  {code:'py',name:'Парагвай'},{code:'qa',name:'Катар'},{code:'ro',name:'Румыния'},
  {code:'rs',name:'Сербия'},{code:'ru',name:'Россия'},{code:'rw',name:'Руанда'},
  {code:'sa',name:'Саудовская Аравия'},{code:'sb',name:'Соломоновы Острова'},{code:'sc',name:'Сейшелы'},
  {code:'sd',name:'Судан'},{code:'se',name:'Швеция'},{code:'sg',name:'Сингапур'},
  {code:'si',name:'Словения'},{code:'sk',name:'Словакия'},{code:'sl',name:'Сьерра-Леоне'},
  {code:'sm',name:'Сан-Марино'},{code:'sn',name:'Сенегал'},{code:'so',name:'Сомали'},
  {code:'sr',name:'Суринам'},{code:'ss',name:'Южный Судан'},{code:'st',name:'Сан-Томе и Принсипи'},
  {code:'sv',name:'Сальвадор'},{code:'sy',name:'Сирия'},{code:'sz',name:'Эсватини'},
  {code:'td',name:'Чад'},{code:'tg',name:'Того'},{code:'th',name:'Таиланд'},
  {code:'tj',name:'Таджикистан'},{code:'tl',name:'Восточный Тимор'},{code:'tm',name:'Туркменистан'},
  {code:'tn',name:'Тунис'},{code:'to',name:'Тонга'},{code:'tr',name:'Турция'},
  {code:'tt',name:'Тринидад и Тобаго'},{code:'tv',name:'Тувалу'},{code:'tz',name:'Танзания'},
  {code:'ua',name:'Украина'},{code:'ug',name:'Уганда'},{code:'us',name:'США'},
  {code:'uy',name:'Уругвай'},{code:'uz',name:'Узбекистан'},{code:'va',name:'Ватикан'},
  {code:'vc',name:'Сент-Винсент'},{code:'ve',name:'Венесуэла'},{code:'vn',name:'Вьетнам'},
  {code:'vu',name:'Вануату'},{code:'ws',name:'Самоа'},{code:'ye',name:'Йемен'},
  {code:'za',name:'ЮАР'},{code:'zm',name:'Замбия'},{code:'zw',name:'Зимбабве'},
];

/* ===== FLAG SEARCH LOGIC ===== */
let flagFocusedIndex = -1;

function setFlagPreview(code) {
  if (code) {
    emojiPreview.className = `fi fi-${code} flag-selected-preview visible`;
    fieldLangEmoji.value = code;
    flagClearBtn.style.display = '';
  } else {
    emojiPreview.className = 'flag-selected-preview';
    fieldLangEmoji.value = '';
    flagClearBtn.style.display = 'none';
  }
}

function positionFlagDropdown() {
  const rect = flagSearchInput.getBoundingClientRect();
  flagDropdown.style.top  = (rect.bottom + 6) + 'px';
  flagDropdown.style.left = rect.left + 'px';
  flagDropdown.style.width = rect.width + 'px';
}

function renderFlagDropdown(query) {
  const q = query.toLowerCase().trim();
  if (!q) { flagDropdown.style.display = 'none'; return; }

  const results = ALL_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.includes(q)
  ).slice(0, 12);

  if (results.length === 0) {
    flagDropdown.innerHTML = '<div class="flag-no-results">Ничего не найдено</div>';
  } else {
    flagDropdown.innerHTML = results.map((c, i) => `
      <div class="flag-option" data-code="${c.code}" data-index="${i}">
        <span class="fi fi-${c.code}"></span>
        <span class="flag-option-name">${esc(c.name)}</span>
        <span class="flag-option-code">${c.code}</span>
      </div>`).join('');
    flagDropdown.querySelectorAll('.flag-option').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        selectFlag(el.dataset.code, el.querySelector('.flag-option-name').textContent);
      });
    });
  }
  flagFocusedIndex = -1;
  positionFlagDropdown();
  flagDropdown.style.display = '';
}

function selectFlag(code, name) {
  setFlagPreview(code);
  flagSearchInput.value = name;
  flagDropdown.style.display = 'none';
}

flagSearchInput.addEventListener('input', () => {
  const hint = document.getElementById('flag-search-hint');
  if (hint) hint.style.display = flagSearchInput.value ? 'none' : '';
  renderFlagDropdown(flagSearchInput.value);
});

flagSearchInput.addEventListener('keydown', e => {
  const options = flagDropdown.querySelectorAll('.flag-option');
  if (!options.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    flagFocusedIndex = Math.min(flagFocusedIndex + 1, options.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    flagFocusedIndex = Math.max(flagFocusedIndex - 1, 0);
  } else if (e.key === 'Enter' && flagFocusedIndex >= 0) {
    e.preventDefault();
    const el = options[flagFocusedIndex];
    selectFlag(el.dataset.code, el.querySelector('.flag-option-name').textContent);
    return;
  }
  options.forEach((el, i) => el.classList.toggle('focused', i === flagFocusedIndex));
  if (flagFocusedIndex >= 0) options[flagFocusedIndex].scrollIntoView({block:'nearest'});
});

flagSearchInput.addEventListener('blur', () => {
  setTimeout(() => { flagDropdown.style.display = 'none'; }, 150);
});

flagClearBtn.addEventListener('click', () => {
  setFlagPreview('');
  flagSearchInput.value = '';
  flagSearchInput.focus();
  flagDropdown.style.display = 'none';
});

btnAddLang.addEventListener('click', openLangModal);
btnCancelLang.addEventListener('click', closeLangModal);
modalLang.addEventListener('click', e => { if (e.target === modalLang) closeLangModal(); });

formLang.addEventListener('submit', e => {
  e.preventDefault();
  const name = fieldLangName.value.trim();
  const emoji = fieldLangEmoji.value.trim();
  if (!name) return;
  const lang = { id: uid(), name, emoji };
  state.languages.push(lang);
  state.activeLangId = lang.id;
  saveState();
  closeLangModal();
  render();
});

/* ===== CONFIRM DELETE ===== */
let pendingDeleteWordId = null;
let pendingDeleteLangId = null;

function confirmDeleteWord(word) {
  pendingDeleteLangId = null;
  pendingDeleteWordId = word.id;
  confirmText.textContent = `Удалить «${word.word}»?`;
  modalConfirm.style.display = 'flex';
}

function confirmDeleteLang(lang) {
  const wordCount = state.words.filter(w => w.langId === lang.id).length;
  confirmText.textContent =
    `Удалить блок «${lang.name}»?` +
    (wordCount > 0 ? ` Вместе с ним удалятся ${wordCount} сл${wordCount === 1 ? 'ово' : wordCount < 5 ? 'ова' : 'ов'}.` : '');
  pendingDeleteWordId = null;
  pendingDeleteLangId = lang.id;
  modalConfirm.style.display = 'flex';
}

btnConfirmYes.addEventListener('click', () => {
  if (pendingDeleteWordId) {
    state.words = state.words.filter(w => w.id !== pendingDeleteWordId);
    saveState();
    render();
  } else if (pendingDeleteLangId) {
    state.languages = state.languages.filter(l => l.id !== pendingDeleteLangId);
    state.words = state.words.filter(w => w.langId !== pendingDeleteLangId);
    if (state.activeLangId === pendingDeleteLangId) {
      state.activeLangId = state.languages.length ? state.languages[0].id : null;
    }
    saveState();
    render();
  }
  pendingDeleteWordId = null;
  pendingDeleteLangId = null;
  modalConfirm.style.display = 'none';
});

btnConfirmNo.addEventListener('click', () => {
  pendingDeleteWordId = null;
  pendingDeleteLangId = null;
  modalConfirm.style.display = 'none';
});
modalConfirm.addEventListener('click', e => {
  if (e.target === modalConfirm) {
    pendingDeleteWordId = null;
    pendingDeleteLangId = null;
    modalConfirm.style.display = 'none';
  }
});

/* ===== FLASHCARDS ===== */
let fcWords = [];
let fcIndex = 0;
let fcScore = 0;

btnFlashcards.addEventListener('click', startFlashcards);
document.getElementById('btn-back-to-list').addEventListener('click', exitFlashcards);
document.getElementById('btn-fc-back').addEventListener('click', exitFlashcards);
document.getElementById('btn-restart').addEventListener('click', startFlashcards);

function startFlashcards() {
  const words = state.words.filter(w => w.langId === state.activeLangId);
  if (words.length === 0) {
    alert('Сначала добавь слова в этот языковой блок.');
    return;
  }
  fcWords = shuffle([...words]);
  fcIndex = 0;
  fcScore = 0;
  sectionWords.style.display = 'none';
  sectionFC.style.display = '';
  document.getElementById('fc-done').style.display = 'none';
  document.getElementById('fc-card').style.display = 'flex';
  showFCCard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showFCCard() {
  const w = fcWords[fcIndex];
  document.getElementById('fc-progress').textContent = `${fcIndex + 1} / ${fcWords.length}`;

  const front  = document.getElementById('fc-front');
  const back   = document.getElementById('fc-back');
  const reveal = document.getElementById('btn-reveal');
  const btns   = document.getElementById('fc-buttons');

  front.textContent = w.word;
  back.style.display = 'none';
  back.innerHTML = `
    <div class="translation">${esc(w.translation)}</div>
    ${w.transcription ? `<div class="transcription">${esc(w.transcription)}</div>` : ''}
    ${w.example ? `<div class="example">${esc(w.example)}</div>` : ''}`;
  reveal.style.display = '';
  btns.style.display = 'none';
}

document.getElementById('btn-reveal').addEventListener('click', () => {
  document.getElementById('fc-back').style.display = 'flex';
  document.getElementById('btn-reveal').style.display = 'none';
  document.getElementById('fc-buttons').style.display = 'flex';
});

document.getElementById('btn-yes').addEventListener('click', () => { fcScore++; nextFCCard(); });
document.getElementById('btn-no').addEventListener('click', () => { nextFCCard(); });

function nextFCCard() {
  fcIndex++;
  if (fcIndex >= fcWords.length) showFCDone();
  else showFCCard();
}

function showFCDone() {
  document.getElementById('fc-card').style.display = 'none';
  document.getElementById('fc-done').style.display = 'flex';
  document.getElementById('fc-score').textContent = `Знал: ${fcScore} из ${fcWords.length}`;
}

function exitFlashcards() {
  sectionFC.style.display = 'none';
  sectionWords.style.display = '';
}

/* ===== WORD VIEW MODULE ===== */
const modalView    = document.getElementById('modal-view');
const viewWord     = document.getElementById('view-word');
const viewTranscr  = document.getElementById('view-transcription');
const viewTrans    = document.getElementById('view-translation');
const viewExample  = document.getElementById('view-example');
const viewComment  = document.getElementById('view-comment');
const viewLangBadge= document.getElementById('view-lang-badge');
let viewingWordId  = null;

function openWordView(word) {
  viewingWordId = word.id;
  const lang = state.languages.find(l => l.id === word.langId);

  // язык-бейдж
  viewLangBadge.innerHTML = '';
  if (lang) {
    if (lang.emoji) {
      const flag = document.createElement('span');
      flag.className = `fi fi-${lang.emoji}`;
      viewLangBadge.appendChild(flag);
    }
    viewLangBadge.appendChild(document.createTextNode(lang ? lang.name : ''));
    viewLangBadge.style.display = 'inline-flex';
  } else {
    viewLangBadge.style.display = 'none';
  }

  viewWord.textContent   = word.word;
  viewTranscr.textContent= word.transcription || '';
  viewTrans.textContent  = word.translation;

  const exSec = document.getElementById('view-example-section');
  const cmSec = document.getElementById('view-comment-section');
  if (word.example) { viewExample.textContent = word.example; exSec.style.display = ''; }
  else exSec.style.display = 'none';
  if (word.comment) { viewComment.textContent = word.comment; cmSec.style.display = ''; }
  else cmSec.style.display = 'none';

  modalView.style.display = 'flex';
}

function closeWordView() {
  modalView.style.display = 'none';
  viewingWordId = null;
}

document.getElementById('btn-view-close').addEventListener('click', closeWordView);
modalView.addEventListener('click', e => { if (e.target === modalView) closeWordView(); });

document.getElementById('view-btn-edit').addEventListener('click', () => {
  const word = state.words.find(w => w.id === viewingWordId);
  if (word) { closeWordView(); openWordModal(word); }
});

document.getElementById('view-btn-delete').addEventListener('click', () => {
  const word = state.words.find(w => w.id === viewingWordId);
  if (word) { closeWordView(); confirmDeleteWord(word); }
});

/* ===== ADD WORD BUTTON (initial binding) ===== */
document.getElementById('btn-add-word').addEventListener('click', () => openWordModal(null));

/* ===== SEARCH (initial binding for page load) ===== */
bindSearchInput();

/* ===== KEYBOARD ESC ===== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeWordModal();
    closeLangModal();
    closeWordView();
    modalConfirm.style.display = 'none';
  }
});

/* ===== DEMO DATA ===== */
document.getElementById('btn-demo').addEventListener('click', () => {
  if (confirm('Загрузить 20 примеров необычных слов? Твои слова останутся.')) {
    loadDemoData();
    render();
  }
});

function loadDemoData() {
  const langId = uid();
  state.languages.push({ id: langId, name: 'Английский', emoji: 'gb' });
  state.activeLangId = langId;
  const words = [
    { word: 'Serendipity', translation: 'Счастливая случайность', transcription: '/ˌser.ənˈdɪp.ɪ.ti/', example: 'Finding that old letter was pure serendipity.', comment: 'Приятное событие, которое случилось само собой' },
    { word: 'Petrichor', translation: 'Запах земли после дождя', transcription: '/ˈpet.rɪ.kɔːr/', example: 'She loved the petrichor after a summer storm.', comment: 'От греч. petra — камень, ichor — кровь богов' },
    { word: 'Ephemeral', translation: 'Мимолётный, недолговечный', transcription: '/ɪˈfem.ər.əl/', example: 'The beauty of cherry blossoms is ephemeral.', comment: 'О чём-то прекрасном но быстро исчезающем' },
    { word: 'Sonder', translation: 'Осознание, что у каждого своя жизнь', transcription: '/ˈsɒn.dər/', example: 'Sitting in a café, she felt a deep sense of sonder.', comment: 'Неологизм из Dictionary of Obscure Sorrows' },
    { word: 'Mellifluous', translation: 'Медоточивый, сладкозвучный', transcription: '/məˈlɪf.lu.əs/', example: 'Her mellifluous voice filled the concert hall.', comment: 'О приятном звучании голоса или музыки' },
    { word: 'Ineffable', translation: 'Невыразимый словами', transcription: '/ɪnˈef.ə.bəl/', example: 'The view from the mountain was ineffable.', comment: 'Когда красота настолько велика, что нет слов' },
    { word: 'Hiraeth', translation: 'Тоска по родине или прошлому', transcription: '/ˈhɪər.aɪθ/', example: 'She felt hiraeth every time she heard that old song.', comment: 'Валлийское слово, нет точного перевода на русский' },
    { word: 'Limerence', translation: 'Состояние влюблённости и навязчивых мыслей', transcription: '/ˈlɪm.ər.əns/', example: 'He was lost in limerence, thinking of her constantly.', comment: 'Психологический термин Дороти Теннов' },
    { word: 'Catharsis', translation: 'Очищение через сильные эмоции', transcription: '/kəˈθɑː.sɪs/', example: 'Crying during the film was a real catharsis for her.', comment: 'Из античной философии Аристотеля' },
    { word: 'Susurrus', translation: 'Шёпот, тихий шелест', transcription: '/suːˈsʌr.əs/', example: 'The susurrus of leaves calmed her nerves.', comment: 'Поэтическое слово для нежного звука' },
    { word: 'Vellichor', translation: 'Странная меланхолия в старом книжном магазине', transcription: '/ˈvel.ɪ.kɔːr/', example: 'She felt vellichor browsing dusty shelves for hours.', comment: 'Ещё один неологизм из Dictionary of Obscure Sorrows' },
    { word: 'Phosphene', translation: 'Свет, который видишь когда трёшь глаза', transcription: '/ˈfɒs.fiːn/', example: 'Pressing her palms to her eyes, she saw bright phosphenes.', comment: 'Визуальное ощущение без реального источника света' },
    { word: 'Eudaimonia', translation: 'Счастье как состояние расцвета', transcription: '/juːˌdaɪˈməʊ.ni.ə/', example: 'True eudaimonia comes from living a meaningful life.', comment: 'Аристотель считал это высшей целью человека' },
    { word: 'Kenopsia', translation: 'Жуткое ощущение от пустого многолюдного места', transcription: '/kɛˈnɒp.si.ə/', example: 'The empty stadium filled her with kenopsia.', comment: 'Торговый центр ночью, пустая школа летом' },
    { word: 'Yugen', translation: 'Глубокое осознание красоты вселенной', transcription: '/juːˈɡen/', example: 'Watching the fog roll over the mountains, he felt yugen.', comment: 'Японская эстетическая концепция' },
    { word: 'Quiddity', translation: 'Сущность, самая суть вещи', transcription: '/ˈkwɪd.ɪ.ti/', example: 'The quiddity of her art was impossible to define.', comment: 'Философский термин — то, что делает вещь собой' },
    { word: 'Lassitude', translation: 'Усталость, вялость, апатия', transcription: '/ˈlæs.ɪ.tjuːd/', example: 'A profound lassitude overcame her after the journey.', comment: 'Более поэтично чем просто tiredness' },
    { word: 'Sempiternal', translation: 'Вечный, бесконечный', transcription: '/ˌsem.pɪˈtɜː.nəl/', example: 'Their love felt sempiternal, beyond time itself.', comment: 'Возвышеннее чем eternal — вечность без начала и конца' },
    { word: 'Labyrinthine', translation: 'Запутанный как лабиринт', transcription: '/ˌlæb.ɪˈrɪn.θaɪn/', example: 'The labyrinthine streets of the old city confused every tourist.', comment: 'О чём-то сложном и запутанном' },
    { word: 'Numinous', translation: 'Внушающий благоговейный страх и восторг', transcription: '/ˈnjuː.mɪ.nəs/', example: 'Standing in the ancient temple felt truly numinous.', comment: 'Ощущение чего-то священного и таинственного' },
  ];
  words.forEach(w => state.words.push({ id: uid(), langId, ...w }));
  saveState();
}

/* ===== INIT ===== */
loadState();
if (state.languages.length > 0 && !state.activeLangId) {
  state.activeLangId = state.languages[0].id;
}
render();
