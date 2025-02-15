const TaskManager = (() => {
    const components = {};

    // Регистрация компонентов
    function registerComponent(type, handler) {
        components[type] = handler;
    }

    // Инициализация всех компонентов
    function initAll() {
        document.querySelectorAll('[data-task-type]').forEach(element => {
            const type = element.dataset.taskType;
            if (components[type]) {
                components[type](element);
            }
        });
    }

    return { registerComponent, initAll };
})();

// Модуль для заполнения пропусков
TaskManager.registerComponent('fillInTheBlanks', (element) => {
    const textContainer = element.querySelector('.task-content');
    const answers = JSON.parse(element.dataset.answers);

    textContainer.innerHTML = textContainer.textContent.replace(
        /\[(.*?)\]/g,
        (_, answer) => `<input type="text" data-correct="${answer}">`
    );
});

// Модуль для сопоставления слов
TaskManager.registerComponent('matchUpTheWords', (element) => {
    const pairs = JSON.parse(element.dataset.pairs);
    const container = element.querySelector('.match-container');

    container.innerHTML = `
        <div class="source-words">${pairs.map(p => `<div class="draggable">${p[0]}</div>`).join('')}</div>
        <div class="target-words">${pairs.map(p => `<div class="dropzone">${p[1]}</div>`).join('')}</div>
    `;

    // Реализация Drag & Drop
    // ... (добавить логику перетаскивания)
});

// Модуль для сортировки по колонкам
TaskManager.registerComponent('sortIntoColumns', (element) => {
    const columns = JSON.parse(element.dataset.columns);
    element.innerHTML = columns.map(col => `
        <div class="column">
            <h4>${col.title}</h4>
            <div class="droppable">${col.items.map(item => `<div class="draggable">${item}</div>`).join('')}</div>
        </div>
    `).join('');
});

// Остальные компоненты аналогично...

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => TaskManager.initAll());