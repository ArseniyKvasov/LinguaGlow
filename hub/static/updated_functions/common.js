function convertMarkdownToHTML(text) {
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<u>$1</u>');
    return DOMPurify.sanitize(text);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function removeAccordionElementFromContextWindow(taskId) {
    const button = document.querySelector(`.remove-task-btn[data-task-id="${taskId}"]`);
    if (button) {
        const accordionElement = button.closest(".accordion");
        if (accordionElement) {
            accordionElement.remove();
        }
    }
}

function showTaskInContextWindow(task_id, header, content, color) {
    const contextWindow = document.getElementById("context-window");

    // Создаем уникальный ID для дропдауна
    const dropdownId = `dropdown-${task_id || Date.now()}`;

    const permanentText = document.getElementById("permanent-context-text");
    if (permanentText) {
        permanentText.remove();
    }

    const text_color = (color == "secondary" ? "black" : "white")

    // Создаем контейнер для дропдауна
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("mb-2");

    // Разметка дропдауна
    dropdownContainer.innerHTML = `
        <div class="accordion" id="accordion-${dropdownId}">
            <div class="accordion-item">
                <h2 class="accordion-header position-relative" id="heading-${dropdownId}">
                    <button class="accordion-button bg-${color} text-${text_color} flex-grow-1 border-0 shadow-none text-start"
                            type="button" data-bs-toggle="collapse" data-bs-target="#${dropdownId}"
                            aria-expanded="true" aria-controls="${dropdownId}">
                        ${header || "Заметка"}
                    </button>
                </h2>
                <div id="${dropdownId}" class="accordion-collapse collapse" aria-labelledby="heading-${dropdownId}">
                    <div class="accordion-body">
                        ${content}
                        <div class="d-flex justify-content-end">
                            <button class="btn border-0 mt-2 remove-task-btn p-0" data-task-id="${task_id}" title="Удалить">
                                <i class="bi bi-x-lg text-danger"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    dropdownContainer.querySelector(".remove-task-btn").addEventListener("click", function() {
        removeTaskFromContext(task_id);
    });

    // Добавляем элемент в контекстное окно
    contextWindow.appendChild(dropdownContainer);
}



async function fetchTaskData(taskId) {
    try {
        const response = await fetch(`/hub/api/tasks/${taskId}/`);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        showNotification("Ошибка при получении данных. Обратитесь в поддержку.", "danger");
        return null; // Возвращаем null в случае ошибки
    }
}

// Функции для отображения заданий
function generateWordListHTML(words) {
    let html = '';
    for (const [word, translation] of Object.entries(words)) {
        html += `
            <div class="word-item mb-2 d-flex align-items-center position-relative">
                <div class="me-3">
                    <span class="fw-bold me-1">${word}</span>-<span class="ms-1">${translation}</span>
                </div>
                <button class="btn-mark-word btn btn-link p-0 position-absolute end-0 opacity-0"
                        style="width: 10px; height: 10px; border-radius: 50%; background-color: orange; transition: opacity 0.2s;"
                        title="Отметить слово">
                </button>
            </div>
        `;
    }
    return html;
}

// Функция для создания DOM-элемента списка слов
function handleWords(task_id, payloads) {
    const { id, title, words } = payloads;

    const taskElem = document.getElementById(`${id}`);

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header d-flex align-items-center justify-content-between bg-primary text-white">
            <span class="task-title fw-bold">${title}</span>
            <div class="d-flex justify-content-end align-items-center">
                <div class="actions-container d-none align-items-center rounded-3 me-2 border border-white bg-opacity-25 bg-white">
                    <button class="btn btn-link p-0 me-2 ms-2 text-light" title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2 text-light" title="Закрепить">
                        <i class="bi bi-paperclip"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2 text-light" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <span class="fw-bold">Words</span>
            </div>
        </div>

        <!-- Список слов -->
        <div class="card-body">
            <div class="words-list">
                ${Object.entries(words).map(([word, translation]) => `
                    <div class="word-item mb-2 d-flex align-items-center justify-content-between position-relative p-2 border rounded">
                        <div class="me-3">
                            <span class="fw-bold me-1">${word}</span>-<span class="ms-1">${translation}</span>
                        </div>
                        <button class="btn-mark-word btn btn-link text-primary" title="Отметить незнакомое слово">
                            <i class="bi bi-square"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Обработчик нажатия для отметки слов
    const markButtons = taskElem.querySelectorAll('.btn-mark-word');
    markButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const wordItem = btn.closest('.word-item');
            const icon = btn.querySelector('i');

            if (wordItem) {
                wordItem.classList.toggle('bg-light');
                icon.classList.toggle('bi-square');
                icon.classList.toggle('bi-square-fill');
                btn.classList.toggle('text-warning'); // Меняем цвет кнопки
            }
        });
    });
}

// Функция для перемешивания элементов массива (алгоритм Фишера-Йетса)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Функция для создания DOM-элемента для задания "Соотнести слово с переводом"
function handleMatch(task_id, payloads) {
    const { id, title, pairs } = payloads;
    const taskElem = document.getElementById(`${id}`);
    if (!taskElem) return;

    // Извлекаем слова и переводы из объекта пар
    const words = Object.keys(pairs);
    const translations = Object.values(pairs);

    // Перемешиваем каждую колонку отдельно
    const shuffledWords = shuffleArray([...words]);
    const shuffledTranslations = shuffleArray([...translations]);

    // Генерируем ряды, где каждая строка содержит пару кнопок с одинаковой высотой
    const rowsHTML = shuffledWords.map((word, index) => {
        const translation = shuffledTranslations[index];
        return `
            <div class="row pair mb-2 d-flex align-items-stretch g-2">
                <div class="col-6">
                    <button class="match-btn btn btn-outline-secondary fs-6 fw-bold w-100 h-100" data-word="${word}">
                        ${word}
                    </button>
                </div>
                <div class="col-6">
                    <button class="match-btn btn btn-outline-secondary fs-6 fw-bold w-100 h-100" data-translation="${translation}">
                        ${translation}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end align-items-center">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-paperclip text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Match</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body">
            <div class="container">
                ${rowsHTML}
            </div>
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 rounded-bottom d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>
    `;
}

function handleFillBlanks(task_id, payloads) {
    const { id, title, text, display_format } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    // Разбиваем текст по пропускам в квадратных скобках.
    // Получаем массив, где элементы – либо обычный текст, либо "[ответ]".
    const parts = text.split(/(\[.*?\])/g);

    let blanksHTML = '';
    let blanksAnswers = []; // Массив правильных ответов (без скобок)
    let blankIndex = 0;

    // Формируем HTML для текста с пропусками
    parts.forEach(part => {
        if (part.startsWith('[') && part.endsWith(']')) {
            // Извлекаем ответ, удаляя квадратные скобки
            const answer = part.slice(1, -1);
            blanksAnswers.push(answer);
            blanksHTML += `
                <span class="blank-container position-relative d-inline-block">
                    <input type="text"
                           class="blank-input form-control m-1 rounded text-center"
                           data-task-id="${id}"
                           data-blank-id="${blankIndex}"
                           style="min-width: 30px; width: auto; display: inline-block;"
                           inputmode="text"
                           enterkeyhint="done">
                </span>
            `;
            blankIndex++;
        } else {
            blanksHTML += `<span class="text-part">${part}</span>`;
        }
    });

    // Если формат "list" - выводим список ответов (без кастомных фильтров)
    let wordListHTML = '';
    if (display_format === 'list') {
        wordListHTML = `
            <div class="word-list mb-3">
                <ul class="list-unstyled d-flex flex-wrap gap-2">
                    ${blanksAnswers.map((word, index) => `
                        <li class="badge bg-primary text-white fs-6 word-item"
                            data-word="${word}">
                            ${word}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end align-items-center">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-paperclip text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Blanks</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body rounded-bottom">
            ${wordListHTML}
            <div class="blanks-text lh-base">
                ${blanksHTML}
            </div>
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 rounded-bottom d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>

        <!-- Скрытый контейнер с правильными ответами -->
        <div class="correct-words d-none" data-words='${JSON.stringify(blanksAnswers)}' data-blanks-num="${blanksAnswers.length}"></div>
    `;
}

function handleLabel(task_id, payloads) {
    const { id, title, labels, image_urls } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    // Перемешиваем метки для списка (не для привязки к изображениям)
    const shuffledLabels = shuffleArray([...labels]);

    // Генерация списка меток (badge list)
    const badgeListHTML = `
        <div class="word-list mb-4">
            <ul class="list-unstyled d-flex flex-wrap gap-2">
                ${shuffledLabels.map((label, index) => `
                    <li class="badge bg-primary text-white fs-6 word-item"
                        data-word="${label}"
                        data-label-id="label-${id}-${index}">
                        ${label}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    // Генерация сетки изображений с полями ввода
    // Для каждого изображения подбирается метка из исходного массива labels по индексу
    const imagesHTML = image_urls.map((image, index) => {
        const correctLabel = labels[index]; // исходный порядок для сопоставления
        return `
            <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6">
                <div class="card h-100 border-0">
                    <!-- Контейнер для квадратного изображения -->
                    <div class="square-image-container position-relative">
                        <div class="square-image">
                            <img src="${image.image_url}" class="img-fluid rounded" style="object-fit: cover;">
                        </div>
                    </div>
                    <!-- Поле ввода -->
                    <div class="card-body p-0 mt-3">
                        <input type="text"
                               class="form-control label-image w-100"
                               data-task-id="${id}"
                               data-image-id="${image.id}"
                               inputmode="text"
                               enterkeyhint="done">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Собираем итоговую разметку задания
    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end align-items-center">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-paperclip text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Label</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body rounded-bottom">
            ${badgeListHTML}
            <!-- Изображения с полями для ввода -->
            <div class="row g-4">
                ${imagesHTML}
            </div>
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 rounded-bottom d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>

        <!-- Скрытый контейнер с правильными подписями -->
        <div class="correct-words d-none" data-words='${JSON.stringify(labels)}' data-images-num="${image_urls.length}"></div>
    `;
}





async function primaryInitialization() {
    const sectionList = document.getElementById('section-list');
    let sectionId;
    if (sectionList) {
        const firstSection = sectionList.querySelector('.section-link');
        if (firstSection) {
            sectionId = firstSection.getAttribute('data-section-id');
        }
    }

    if (!sectionId) {
        return;
    }

    const taskItems = [...document.querySelectorAll('.task-item')].filter(task =>
        task.getAttribute('data-section-id') === sectionId
    );

    for (const taskContainer of taskItems) {
        const taskId = taskContainer.id;
        const taskType = taskContainer.getAttribute('data-task-type');

        try {
            if (taskType === 'wordlist') {
                const taskData = await fetchTaskData(taskId);
                handleWords(taskId, taskData);
            } else if (taskType === 'matchupthewords') {
                const taskData = await fetchTaskData(taskId);
                handleMatch(taskId, taskData);
            } else if (taskType === 'fillintheblanks') {
                const taskData = await fetchTaskData(taskId);
                handleFillBlanks(taskId, taskData);
            } else if (taskType === 'labelimages') {
                const taskData = await fetchTaskData(taskId);
                handleLabel(taskId, taskData);
            }
        } catch (error) {
            showNotification(`Ошибка при загрузке данных задания ${taskType}. Обратитесь в поддержку.`, "danger");
        }
    }
}

document.addEventListener('DOMContentLoaded', primaryInitialization);