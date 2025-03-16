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
            const taskItem = document.getElementById(taskId);
            if (taskItem) {
                taskItem.querySelector(".added-to-context").remove();
                taskItem.querySelector(".bi-bookmark").parentElement.style.display = "block";
            }
        }
    }
}

function showTaskInContextWindow(taskId, header, content) {
    const contextWindow = document.getElementById("context-window");

    // Создаем уникальный ID для дропдауна
    const dropdownId = `dropdown-${taskId || Date.now()}`;

    const permanentText = document.getElementById("permanent-context-text");
    if (permanentText) {
        permanentText.remove();
    }

    const taskItem = document.getElementById(taskId);
    let taskType;
    if (taskItem) {
        // Создаем кнопку
        const bookmarkButton = document.createElement('button');
        bookmarkButton.className = "btn btn-link p-0 me-2 added-to-context";
        bookmarkButton.title = "Удалить из контекста";

        // Создаем иконку внутри кнопки
        const icon = document.createElement('i');
        icon.className = "bi bi-bookmark-check";

        // Вставляем иконку внутрь кнопки
        bookmarkButton.appendChild(icon);

        // Скрываем старую кнопку, если она есть
        const oldButton = taskItem.querySelector(".bi-bookmark").parentElement;
        if (oldButton) {
            oldButton.style.display = "none";
            if (taskItem.querySelector(".bi-bookmark").classList.contains("text-dark")) {
                icon.classList.add("text-dark");
            } else {
                icon.classList.add("text-light");
            }
        }
        taskItem.querySelector('.actions-container').insertBefore(bookmarkButton, oldButton);

        // Можно добавить обработчик событий на новую кнопку
        bookmarkButton.addEventListener('click', () => {
            removeTaskFromContext(taskId);
        });

        taskType = taskItem.getAttribute("data-task-type");
    }


    // Создаем контейнер для дропдауна
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("mb-2");

    // Разметка дропдауна
    dropdownContainer.innerHTML = `
        <div class="accordion" id="accordion-${dropdownId}">
            <div class="accordion-item" data-task-id="${taskId}" data-task-type="${taskType || 'undefined'}">
                <h2 class="accordion-header position-relative" id="heading-${dropdownId}">
                    <button class="accordion-button bg-light text-black flex-grow-1 border-0 shadow-none text-start"
                            type="button" data-bs-toggle="collapse" data-bs-target="#${dropdownId}"
                            aria-expanded="true" aria-controls="${dropdownId}">
                        ${header || "Заметка"}
                    </button>
                </h2>
                <div id="${dropdownId}" class="accordion-collapse collapse" aria-labelledby="heading-${dropdownId}">
                    <div class="accordion-body">
                        ${content}
                        <div class="d-flex justify-content-end">
                            <button class="btn border-0 mt-2 remove-task-btn p-0" data-task-id="${taskId}" title="Удалить">
                                <i class="bi bi-x-lg text-danger"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    dropdownContainer.querySelector(".remove-task-btn").addEventListener("click", function() {
        removeTaskFromContext(taskId);
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
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-light"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-light"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-light"></i>
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
                        <i class="bi bi-bookmark text-dark"></i>
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
    // Элементы массива – либо обычный текст, либо "[ответ]"
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
                    <span class="correct-tooltip position-absolute start-50 translate-middle-x px-1 py-1 bg-dark text-white small rounded"
                          style="display: none; z-index: 10; bottom: 100%;">
                        ${answer}
                    </span>
                    <input type="text"
                           class="blank-input form-control m-1 rounded text-center"
                           data-task-id="${id}"
                           data-blank-id="${blankIndex}"
                           data-correct-answer="${answer}"
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

    // Перемешиваем blanksAnswers
    const shuffledAnswers = [...blanksAnswers]; // Создаем копию массива, чтобы не менять исходный
    shuffleArray(shuffledAnswers);

    // Если формат "list" - выводим список ответов
    let wordListHTML = '';
    if (display_format === 'list') {
        wordListHTML = `
            <div class="word-list mb-3">
                <ul class="list-unstyled d-flex flex-wrap gap-2">
                    ${shuffledAnswers.map((word) => `
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
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
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

    // Добавляем обработчики событий для показа подсказки
    const blankInputs = taskElem.querySelectorAll('.blank-input');
    blankInputs.forEach(input => {
        const tooltip = input.parentElement.querySelector('.correct-tooltip');
        // Показываем подсказку при наведении и фокусе
        input.addEventListener('mouseenter', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        input.addEventListener('focus', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        // Скрываем подсказку при уходе мыши и потере фокуса
        input.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
        input.addEventListener('blur', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
    });
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

    // Генерация сетки изображений с полями ввода.
    // Для каждого изображения подбирается метка из исходного массива labels по индексу.
    const imagesHTML = image_urls.map((image, index) => {
        const correctLabel = labels[index]; // правильная метка для данного изображения
        return `
            <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6">
                <div class="card h-100 border-0">
                    <!-- Контейнер для квадратного изображения -->
                    <div class="square-image-container position-relative">
                        <div class="square-image">
                            <img src="${image.image_url}" class="img-fluid rounded" style="object-fit: cover;">
                        </div>
                    </div>
                    <!-- Поле ввода с плашкой для правильного ответа -->
                    <div class="card-body p-0 mt-3">
                        <span class="label-container position-relative d-inline-block w-100">
                            <span class="correct-tooltip position-absolute start-50 translate-middle-x px-2 py-1 bg-dark text-white small rounded"
                                  style="display: none; z-index: 10; bottom: 100%; margin-bottom: 5px;">
                                ${correctLabel}
                            </span>
                            <input type="text"
                                   class="form-control label-image w-100"
                                   data-task-id="${id}"
                                   data-image-id="${image.id}"
                                   data-correct-label="${correctLabel}"
                                   inputmode="text"
                                   enterkeyhint="done">
                        </span>
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
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
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

    // Добавляем обработчики событий для показа/скрытия плашки (tooltip)
    const labelInputs = taskElem.querySelectorAll('.label-image');
    labelInputs.forEach(input => {
        const tooltip = input.parentElement.querySelector('.correct-tooltip');
        input.addEventListener('mouseenter', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        input.addEventListener('focus', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        input.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
        input.addEventListener('blur', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
    });
}

function handleArticle(task_id, payloads) {
    const { id, title, content, isTeacher } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header d-flex align-items-center justify-content-between bg-success">
            <span class="task-title text-white me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end align-items-center">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-white fw-bold">Article</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body rounded-bottom" style="border: 1px solid #F5F5F5; border-top: 0;">
            <div class="article-content text-part">
                ${content}
            </div>
        </div>
    `;
}

function closeAllEmbeds() {
    document.querySelectorAll('.embed-container').forEach(container => {
        container.classList.add('d-none');
        const iframe = container.querySelector('iframe');
        if (iframe) {
            iframe.src = "";
            iframe.classList.remove('w-100', 'vh-100');
        }
    });

    document.querySelectorAll('.btn.btn-primary.btn-lg.d-none').forEach(button => {
        button.classList.remove('d-none');
    });

    document.querySelectorAll('.badge-element').forEach(header => {
        header.textContent = "Interaction";
    });
}

function toggleEmbed(button, embedCode) {
    closeAllEmbeds();

    const wrapper = button.closest('.embed-wrapper');
    const iframeContainer = wrapper.querySelector('.embed-container');
    const iframe = iframeContainer.querySelector('iframe');
    const card = button.closest('.card');
    const headerText = card.querySelector('.badge-element');

    // Показываем контейнер с iframe и скрываем кнопку запуска
    iframeContainer.classList.remove('d-none');
    button.classList.add('d-none');

    // Добавляем элемент загрузки
    let loader = document.createElement('div');
    loader.className = 'loading-spinner d-flex justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75';
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    iframeContainer.appendChild(loader);

    // Извлекаем URL из embed-кода
    const srcMatch = embedCode.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
        iframe.src = srcMatch[1];
        iframe.classList.add('w-100', 'vh-100');
    }

    // Убираем загрузку при полной загрузке iframe или максимум через 5 секунд
    const removeLoader = () => {
        if (loader) {
            loader.remove();
            loader = null;
        }
    };

    iframe.onload = removeLoader;
    setTimeout(removeLoader, 10000);

    // Меняем заголовок
    if (headerText) {
        headerText.innerHTML = '<button class="btn btn-danger btn-sm" onclick="closeEmbed(this)"><i class="bi bi-x-circle"></i> Закрыть доску</button>';
    }
}

function closeEmbed(button) {
    const card = button.closest('.card');
    const wrapper = card.querySelector('.embed-wrapper');
    const iframeContainer = wrapper.querySelector('.embed-container');
    const launchButton = wrapper.querySelector('button.btn.btn-primary.btn-lg');
    const headerText = card.querySelector('.badge-element')
    const iframe = iframeContainer.querySelector('iframe');

    // Скрываем контейнер с iframe и сбрасываем src
    iframeContainer.classList.add('d-none');
    iframe.src = "";
    iframe.classList.remove('w-100', 'vh-100');

    // Показываем кнопку запуска
    launchButton.classList.remove('d-none');

    // Восстанавливаем заголовочный текст "Interaction"
    if (headerText) {
        headerText.textContent = "Interaction";
    }
}

function handleEmbedded(task_id, payloads) {
    const { id, title, embed_code } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    // Экранируем двойные кавычки для корректной подстановки в onclick
    const escapedEmbedCode = embed_code.replace(/"/g, '&quot;');

    taskElem.innerHTML = `
        <div class="card border-0 shadow-lg rounded">
            <!-- Заголовок -->
            <div class="card-header bg-light d-flex align-items-center justify-content-between">
                <span class="task-title text-dark me-2 fw-bold">${title}</span>
                <div class="d-flex justify-content-end align-items-center">
                    <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255,255,255,0.3);">
                        <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                            <i class="bi bi-pencil text-dark"></i>
                        </button>
                        <button class="btn btn-link p-0 me-2" title="Удалить">
                            <i class="bi bi-trash text-dark"></i>
                        </button>
                    </div>
                    <span class="badge-element text-dark fw-bold">Interaction</span>
                </div>
            </div>

            <!-- Тело карточки -->
            <div class="card-body p-4">
                <div class="embed-wrapper">
                    <!-- Кнопка запуска, embed_code передается через onclick -->
                    <button class="btn btn-primary btn-lg w-100 mb-3 d-flex justify-content-between align-items-center"
                            onclick="toggleEmbed(this, '${escapedEmbedCode}')">
                        <span>Перейти к доске</span>
                        <i class="bi bi-arrow-right-circle-fill fs-4"></i>
                    </button>

                    <!-- Контейнер для iframe (изначально скрыт); кнопка выхода удалена -->
                    <div class="embed-container embed-responsive embed-responsive-16by9 d-none">
                        <iframe class="embed-responsive-item" allowfullscreen style="border: none; height: 400px;"></iframe>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function handleImage(task_id, payloads) {
    const { id, image_url, caption, isTeacher } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header d-flex align-items-center justify-content-end bg-primary">
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255,255,255,0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-white fw-bold">Image</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body" style="border: 1px solid #F5F5F5; border-top: 0;">
            <img src="${image_url}" alt="${caption ? caption : ''}" class="img-fluid rounded">
            ${caption ? `<div class="caption text-center fw-bold">${caption}</div>` : ''}
        </div>
    `;
}

// Функция для склонения слова "слово" (например: 1 слово, 2 слова, 5 слов)
function getWordEnding(count) {
    if (count === 1) return "слово";
    if (count >= 2 && count <= 4) return "слова";
    return "слов";
}

// Функция для обновления счётчика слов в эссе
function updateWordCount(taskId) {
    const editor = document.getElementById(`essay-editor-${taskId}`);
    const wordCountSpan = document.getElementById(`word-count-${taskId}`);
    if (editor && wordCountSpan) {
        // Получаем текст без лишних пробелов
        const text = editor.innerText.trim();
        // Разбиваем по пробельным символам и отфильтровываем пустые строки
        const words = text.length ? text.split(/\s+/).filter(Boolean) : [];
        wordCountSpan.textContent = words.length + " " + getWordEnding(words.length);

        // Сохраняем текст в скрытый textarea (если нужно для отправки)
        const textarea = document.getElementById(`essay-content-${taskId}`);
        if (textarea) {
            textarea.value = editor.innerHTML;
        }
    }
}

// Функция для применения форматирования к выделенному тексту
function formatText(command, taskId) {
    // Используем document.execCommand (работает в большинстве браузеров, хоть и устаревший)
    document.execCommand(command, false, null);
    // Обновляем счётчик слов, если нужно
    updateWordCount(taskId);
}

// Функция для добавления обработчиков событий для эссе
function initEssayEvents(taskId) {
    // Обновляем счётчик слов при вводе (на случай, если oninput не сработал или чтобы добавить дополнительные обработчики)
    const editor = document.getElementById(`essay-editor-${taskId}`);
    if (editor) {
        editor.addEventListener('input', function () {
            updateWordCount(taskId);
        });
    }

    // Обработчики для кнопок форматирования
    const card = document.getElementById(taskId);
    if (card) {
        const formatButtons = card.querySelectorAll('.btn-group button');
        formatButtons.forEach(button => {
            button.addEventListener('click', function () {
                const command = button.getAttribute('data-command');
                if (command) {
                    formatText(command, taskId);
                }
            });
        });
    }
}

// Функция для склонения "балл"
function getBallWord(number) {
    if (number % 10 === 1 && number % 100 !== 11) {
        return "балл";
    } else if ([2, 3, 4].includes(number % 10) && ![12, 13, 14].includes(number % 100)) {
        return "балла";
    } else {
        return "баллов";
    }
}

// Функция для генерации карточки задания "Essay"
function handleEssay(task_id, payloads) {
    const { id, title, conditions } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    // Формируем HTML для списка условий
    let conditionsHTML = "";
    if (conditions && typeof conditions === 'object') {
        for (const [condition, score] of Object.entries(conditions)) {
            conditionsHTML += `
                <div class="condition-item mb-3 p-3 rounded-3 border border-light-subtle">
                    <div class="d-flex align-items-center justify-content-between">
                        <label class="mb-0">
                            <span class="d-block fw-semibold">${condition}</span>
                            <small class="text-muted">Критерий оценки</small>
                        </label>
                        <div class="d-flex align-items-center ms-3">
                            <span class="badge bg-primary-subtle text-primary border border-primary rounded-pill px-3 py-2">
                                ${score} ${getBallWord(score)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    taskElem.innerHTML = `
        <div class="card border-0 shadow-lg rounded" data-task-type="essay">
            <!-- Заголовок -->
            <div class="card-header d-flex align-items-center justify-content-between bg-f5f5f5">
                <span class="task-title text-black me-2 fw-bold">${title}</span>
                <div class="d-flex justify-content-end">
                    <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255,255,255,0.3);">
                        <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                            <i class="bi bi-pencil text-dark"></i>
                        </button>
                        <button class="btn btn-link p-0 me-2" title="Удалить">
                            <i class="bi bi-trash text-dark"></i>
                        </button>
                    </div>
                    <span class="text-black fw-bold" style="white-space: nowrap">Essay</span>
                </div>
            </div>

            <!-- Содержимое -->
            <div class="card-body p-4">
                <div class="conditions-list mb-4">
                    ${conditionsHTML}
                </div>

                <!-- Панель форматирования -->
                <div class="btn-group mb-3 w-100" role="group">
                    <button type="button" class="btn btn-outline-secondary" data-command="bold">
                        <i class="bi bi-type-bold"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-command="italic">
                        <i class="bi bi-type-italic"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-command="underline">
                        <i class="bi bi-type-underline"></i>
                    </button>
                </div>

                <!-- Поле для эссе -->
                <div id="essay-editor-${id}"
                     class="essay-editor border rounded-3 p-3 mb-3"
                     contenteditable="true"
                     style="min-height: 200px; overflow-y: auto;">
                </div>

                <!-- Скрытый textarea для отправки данных -->
                <textarea id="essay-content-${id}"
                          name="essay-content"
                          class="d-none"></textarea>

                <!-- Счётчик слов -->
                <div class="d-flex justify-content-end text-muted">
                    <span id="word-count-${id}">0 слов</span>
                </div>
            </div>
        </div>
    `;

    // Инициализируем обработчики событий для форматирования и подсчёта слов
    initEssayEvents(id);
}

function handleNote(task_id, payloads) {
    const { id, title, content } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header d-flex align-items-center justify-content-between bg-success">
            <span class="task-title text-white me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2" style="border: 1px solid white; background-color: rgba(255,255,255,0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-white fw-bold">Note</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body">
            <div class="article-content text-part">
                ${content}
            </div>
        </div>
    `;
}

function handleStatements(task_id, payloads) {
    const { id, title, statements } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    let statementsHTML = "";
    if (Array.isArray(statements)) {
        statements.forEach((statement, index) => {
            const counter = index + 1; // для уникальности name/id
            // Если statement.correct === true, то правильный ответ – "Верно", иначе – "Неверно"
            statementsHTML += `
                <div class="statement-item card mb-3">
                    <div class="card-body">
                        <!-- Вопрос -->
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi bi-question-circle text-primary fs-4 me-3"></i>
                            <span class="fw-bold">${statement.question}</span>
                        </div>
                        <!-- Варианты ответов -->
                        <div class="form-check mb-2">
                            <input class="form-check-input ${statement.correct ? 'correct-radio' : ''}"
                                   type="radio" name="statement_${counter}"
                                   id="true_${counter}" value="true">
                            <label class="form-check-label" for="true_${counter}">
                                Верно
                            </label>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input ${!statement.correct ? 'correct-radio' : ''}"
                                   type="radio" name="statement_${counter}"
                                   id="false_${counter}" value="false">
                            <label class="form-check-label" for="false_${counter}">
                                Неверно
                            </label>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    const html = `
        <!-- Заголовок -->
        <div class="card-header d-flex align-items-center justify-content-between bg-light">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Statements</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body">
            <div class="statements-list">
                ${statementsHTML}
                <!-- Кнопка проверки -->
                <button type="button" class="btn btn-primary check-statements-btn w-100 mt-4" style="display: none;">
                    Проверить
                </button>
            </div>
        </div>
    `;

    taskElem.innerHTML = html;
}

function handleTest(task_id, payloads) {
    const { id, title, questions } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    // Формируем HTML для вопросов
    let questionsHTML = "";
    if (Array.isArray(questions)) {
        questions.forEach((question, qIndex) => {
            let answersHTML = "";
            if (Array.isArray(question.answers)) {
                question.answers.forEach((answer, aIndex) => {
                    const correctClass = answer.correct ? "correct-radio" : ""; // Добавляем класс, если ответ правильный
                    answersHTML += `
                        <div class="form-check answer-item mb-2">
                            <input class="form-check-input ${correctClass}" type="radio"
                                   name="question-${qIndex}"
                                   id="answer-${id}-${qIndex}-${aIndex}"
                                   value="${aIndex}"
                                   data-question-id="${qIndex}"
                                   data-answer-id="${aIndex}">
                            <label class="form-check-label fs-6"
                                   for="answer-${id}-${qIndex}-${aIndex}">
                                ${answer.answer}
                            </label>
                        </div>
                    `;
                });
            }
            questionsHTML += `
                <div class="question-item mb-4 p-3 rounded border border-light" data-question-id="${qIndex}">
                    <h5 class="fw-bold mb-3">${question.question}</h5>
                    <div class="answers-list">
                        ${answersHTML}
                    </div>
                </div>
            `;
        });
    }

    // Собираем итоговую разметку карточки
    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                 style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                    <i class="bi bi-pencil text-dark"></i>
                </button>
                <button class="btn btn-link p-0 me-2" title="Сбросить">
                    <i class="bi bi-arrow-clockwise text-dark"></i>
                </button>
                <button class="btn btn-link p-0 me-2" title="Закрепить">
                    <i class="bi bi-bookmark text-dark"></i>
                </button>
                <button class="btn btn-link p-0 me-2" title="Удалить">
                    <i class="bi bi-trash text-dark"></i>
                </button>
            </div>
                <span class="text-dark fw-bold">Test</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body">
            ${questions && questions.length ? `
            <form class="test-form" data-task-id="${id}">
                ${questionsHTML}
                <!-- Кнопка проверки -->
                <button type="button" class="btn btn-primary check-test-btn w-100 mt-4" style="display: none;">
                    Проверить
                </button>
            </form>
            ` : ""}
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>
    `;
}

function handleUnscramble(task_id, payloads) {
    const { id, title, words } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    let wordsHTML = "";
    if (Array.isArray(words)) {
        words.forEach((element) => {
            // Используем исходное слово напрямую для data-атрибута
            const wordData = element.word;

            // Формируем поля для букв: для каждой буквы исходного слова
            let wordFieldsHTML = "";
            for (let i = 0; i < element.word.length; i++) {
                wordFieldsHTML += `
                    <div class="border border-primary border-2 rounded text-center fw-bold fs-5 empty-slot position-relative"
                         style="width: 40px; height: 40px; line-height: 40px;"
                         data-letter-id="${i}" data-correct-letter="${element.word[i]}">
                        <span class="correct-tooltip position-absolute start-50 translate-middle-x px-2 py-1 bg-dark text-white small rounded"
                              style="display: none; z-index: 10; bottom: 100%; margin-bottom: 5px;">
                            ${element.word[i]}
                        </span>
                    </div>
                `;
            }

            // Формируем кнопки с буквами: перебираем каждую букву перемешанного слова
            let letterButtonsHTML = "";
            let shuffledLetters = [];
            if (typeof element.shuffled_word === "string") {
                shuffledLetters = element.shuffled_word.split('');
            } else if (Array.isArray(element.shuffled_word)) {
                shuffledLetters = element.shuffled_word;
            }
            shuffledLetters.forEach(letter => {
                letterButtonsHTML += `
                    <button class="btn btn-outline-dark fw-bold letter-button"
                            style="width: 40px; height: 40px;" data-letter="${letter}">
                        ${letter}
                    </button>
                `;
            });

            // Если есть подсказка
            let hintHTML = "";
            if (element.hint) {
                hintHTML = `
                    <div class="hint-container mt-3 text-center text-muted">
                        <i class="bi bi-lightbulb"></i> Подсказка: ${element.hint}
                    </div>
                `;
            }

            // Иконки статуса (фиксированное количество, как в шаблоне)
            const statusIconsHTML = `
                <div class="d-flex align-items-center mb-2 justify-content-center">
                    <i class="bi bi-x-circle text-success fs-4 me-2"></i>
                    <i class="bi bi-x-circle text-success fs-4 me-2"></i>
                    <i class="bi bi-x-circle text-success fs-4"></i>
                </div>
            `;

            wordsHTML += `
                <div class="word-container mb-4">
                    ${statusIconsHTML}
                    <div class="d-flex flex-wrap gap-2 mb-2 word-fields d-flex justify-content-center" data-word="${wordData}">
                        ${wordFieldsHTML}
                    </div>
                    <div class="d-flex flex-wrap gap-2 letter-buttons d-flex justify-content-center">
                        ${letterButtonsHTML}
                    </div>
                    ${hintHTML}
                </div>
            `;
        });
    }

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255,255,255,0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Unscramble</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body rounded-bottom">
            ${wordsHTML}
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 rounded-bottom d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>
    `;

    // Добавляем обработчики событий для пустых слотов
    const emptySlots = taskElem.querySelectorAll('.empty-slot');
    emptySlots.forEach(slot => {
        const tooltip = slot.querySelector('.correct-tooltip');
        slot.addEventListener('mouseenter', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        slot.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
        // Делаем слот фокусируемым, если нужно
        slot.setAttribute('tabindex', 0);
        slot.addEventListener('focus', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        slot.addEventListener('blur', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
    });
}

function handleColumns(task_id, payloads) {
    const { id, title, columns } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    let allWords = Object.values(columns).flat();

    shuffleArray(allWords);

    let wordBankHTML = allWords.map(word => `
        <span class="badge bg-primary draggable-word fs-5 px-3 py-2" draggable="true" data-word="${word}">
            ${word}
        </span>
    `).join('');

    // Формируем HTML для колонок: проходим по каждому столбцу
    let columnsHTML = "";
    Object.entries(columns).forEach(([columnTitle, wordsArray]) => {
        // Собираем правильный ответ для данной колонки (например, через запятую)
        const correctText = wordsArray.join(", ");
        columnsHTML += `
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card h-100 column-dropzone" data-column="${columnTitle}">
                    <div class="card-header bg-light text-center fw-bold">
                        ${columnTitle}
                    </div>
                    <div class="card-body drop-area p-3 position-relative">
                        <!-- Tooltip с правильными ответами -->
                        <span class="correct-tooltip position-absolute start-50 translate-middle-x px-2 py-1 bg-dark text-white small rounded"
                              style="display: none; z-index: 10; top: 0; transform: translate(-50%, -110%);">
                            ${correctText}
                        </span>
                        <div class="d-flex flex-column gap-2 min-vh-25 overflow-y-auto">
                            <!-- Сюда будут помещаться слова -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Columns</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body position-relative">
            <!-- Список слов (sticky) -->
            <div class="sticky-top bg-white py-3 border-bottom" style="top: 55px;">
                <div class="d-flex flex-wrap gap-2 mb-3 word-bank">
                    ${wordBankHTML}
                </div>
            </div>

            <!-- Контейнер с колонками -->
            <div class="row g-3 mt-3 sortable-columns d-flex justify-content-center">
                ${columnsHTML}
            </div>
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 rounded-bottom d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>
    `;

    // Добавляем обработчики событий для drop-area: при наведении показываем tooltip с правильными ответами
    const dropAreas = taskElem.querySelectorAll('.drop-area');
    dropAreas.forEach(dropArea => {
        const tooltip = dropArea.querySelector('.correct-tooltip');
        dropArea.addEventListener('mouseenter', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        dropArea.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
        // При необходимости сделаем drop-area фокусируемой
        dropArea.setAttribute('tabindex', 0);
        dropArea.addEventListener('focus', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        dropArea.addEventListener('blur', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
    });
}

function handleSentence(task_id, payloads) {
    const { id, title, sentences } = payloads;
    const taskElem = document.getElementById(id);
    if (!taskElem) return;

    let sentencesHTML = "";
    if (Array.isArray(sentences)) {
        sentences.forEach((sentence) => {
            // Разбиваем корректное предложение на слова по пробелам
            const correctWords = sentence.correct.split(" ");
            // Разбиваем перемешанное предложение на слова по пробелам
            const shuffledWords = sentence.shuffled.split(" ");

            // Формируем пустые слоты для слов с подсказкой
            let sentenceFieldsHTML = "";
            correctWords.forEach((word, index) => {
                sentenceFieldsHTML += `
                    <div class="border border-primary border-2 rounded text-center fw-bold fs-5 empty-slot position-relative"
                         style="min-width: 100px; height: 40px; line-height: 40px;"
                         data-word-position="${index}"
                         data-correct-answer="${word}">
                        <span class="correct-tooltip position-absolute start-50 translate-middle-x px-2 py-1 bg-dark text-white small rounded"
                              style="display: none; z-index: 10; bottom: 100%; margin-bottom: 5px;">
                            ${word}
                        </span>
                    </div>
                `;
            });

            // Формируем кнопки со словами
            let wordButtonsHTML = "";
            shuffledWords.forEach((word) => {
                wordButtonsHTML += `
                    <button class="btn btn-outline-dark fw-bold word-button"
                            style="min-width: 100px; height: 40px;"
                            data-word="${word}">
                        ${word}
                    </button>
                `;
            });

            // Иконки статуса (фиксированное количество, как в шаблоне)
            const statusIconsHTML = `
                <div class="d-flex align-items-center mb-2 justify-content-center">
                    <i class="bi bi-x-circle text-success fs-4 me-2"></i>
                    <i class="bi bi-x-circle text-success fs-4 me-2"></i>
                    <i class="bi bi-x-circle text-success fs-4"></i>
                </div>
            `;

            sentencesHTML += `
                <div class="sentence-container mb-4">
                    ${statusIconsHTML}
                    <div class="d-flex flex-wrap gap-2 mb-2 sentence-fields justify-content-center">
                        ${sentenceFieldsHTML}
                    </div>
                    <div class="d-flex flex-wrap gap-2 word-buttons justify-content-center">
                        ${wordButtonsHTML}
                    </div>
                </div>
            `;
        });
    }

    taskElem.innerHTML = `
        <!-- Заголовок -->
        <div class="card-header bg-light d-flex align-items-center justify-content-between">
            <span class="task-title text-dark me-2 fw-bold">${title}</span>
            <div class="d-flex justify-content-end">
                <div class="actions-container d-none align-items-center rounded-3 me-2"
                     style="border: 1px solid white; background-color: rgba(255, 255, 255, 0.3);">
                    <button class="btn btn-link p-0 me-2 ms-2" title="Редактировать">
                        <i class="bi bi-pencil text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Сбросить">
                        <i class="bi bi-arrow-clockwise text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Закрепить">
                        <i class="bi bi-bookmark text-dark"></i>
                    </button>
                    <button class="btn btn-link p-0 me-2" title="Удалить">
                        <i class="bi bi-trash text-dark"></i>
                    </button>
                </div>
                <span class="text-dark fw-bold">Sentence</span>
            </div>
        </div>

        <!-- Тело карточки -->
        <div class="card-body">
            ${sentencesHTML}
        </div>

        <!-- Футер с баллами -->
        <div class="card-footer bg-white text-center py-3 d-none">
            <div class="fs-5 fw-bold text-danger">
                <span class="score-value">0</span>%
            </div>
        </div>
    `;

    // Добавляем обработчики событий для показа/скрытия подсказки у пустых слотов
    const emptySlots = taskElem.querySelectorAll('.empty-slot');
    emptySlots.forEach(slot => {
        const tooltip = slot.querySelector('.correct-tooltip');
        slot.addEventListener('mouseenter', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        slot.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
        // Если нужно, чтобы слот был фокусируемым:
        slot.setAttribute('tabindex', 0);
        slot.addEventListener('focus', () => {
            if (tooltip) tooltip.style.display = 'block';
        });
        slot.addEventListener('blur', () => {
            if (tooltip) tooltip.style.display = 'none';
        });
    });
}


function getContext(lesson_id) {
    fetch(`/hub/context/${lesson_id}/get/`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Ошибка получения данных контекста");
            }
            return response.json();
        })
        .then(data => {
            // Очистим окно контекста перед добавлением новых задач
            document.querySelector('#context-window').innerHTML = "";

            // Проходим по всем задачам
            Object.entries(data.context).forEach(([task_id, taskData]) => {
                if (typeof taskData === 'object' && taskData !== null) {
                    let header = taskData.header ? taskData.header : "Заметка";
                    let content = taskData.content || "";

                    showTaskInContextWindow(task_id, header, content, "light");
                } else {
                    console.warn(`Неожиданный формат данных для ${task_id}:`, taskData);
                }
            });
        })
        .catch(error => {
            console.error(error);
            showNotification("Не удалось загрузить контекст", "danger");
        });
}

async function primaryInitialization(sectionId) {
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
            const taskData = await fetchTaskData(taskId);
            if (taskType === 'wordlist') {
                handleWords(taskId, taskData);
            } else if (taskType === 'matchupthewords') {
                handleMatch(taskId, taskData);
            } else if (taskType === 'fillintheblanks') {
                handleFillBlanks(taskId, taskData);
            } else if (taskType === 'labelimages') {
                handleLabel(taskId, taskData);
            } else if (taskType === 'article') {
                handleArticle(taskId, taskData);
            } else if (taskType === 'embeddedtask') {
                handleEmbedded(taskId, taskData);
            } else if (taskType === 'image') {
                handleImage(taskId, taskData);
            } else if (taskType === 'essay') {
                handleEssay(taskId, taskData);
            } else if (taskType === 'note') {
                handleNote(taskId, taskData);
            } else if (taskType === 'test') {
                handleTest(taskId, taskData);
            } else if (taskType === 'trueorfalse') {
                handleStatements(taskId, taskData);
            } else if (taskType === 'unscramble') {
                handleUnscramble(taskId, taskData);
            } else if (taskType === 'sortintocolumns') {
                handleColumns(taskId, taskData);
            } else if (taskType === 'makeasentence') {
                handleSentence(taskId, taskData);
            }
            taskContainer.classList.remove('border-0');
            taskContainer.classList.add('border-light');
            deleteListener(taskContainer);
            initAttachTaskListeners(taskContainer)
        } catch (error) {
            showNotification(`Ошибка при загрузке данных задания ${taskType}. Обратитесь в поддержку.`, "danger");
        }
    }
}

function resetContainer(taskContainer) {
    taskContainer.innerHTML = '';
    taskContainer.classList.add('border-0');
    taskContainer.classList.remove('border-light');
}

document.addEventListener('DOMContentLoaded', async function() {
    const mainContainer = document.getElementById('main-container');
    const sectionButtons = document.querySelectorAll('.section-link');
    const lessonId = document.getElementById('main-container').dataset.lessonId;

    // Функция для проверки загрузки всех task-item для указанного раздела
    function checkTasksLoaded(sectionId) {
        const interval = setInterval(() => {
            const taskItems = document.querySelectorAll(`.task-item[data-section-id="${sectionId}"]`);

            // Если есть task-item и у каждого заполнен innerHTML, считаем, что загрузка завершена
            const allLoaded = Array.from(taskItems).every(task => task.innerHTML.trim() !== "");

            if (allLoaded) {
                sectionButtons.forEach(btn => btn.disabled = false);
                clearInterval(interval);
            }
        }, 300); // Проверяем каждые 300 мс
    }

    // Функция для загрузки раздела
    async function loadSection(sectionId) {
        // Блокируем кнопки разделов
        sectionButtons.forEach(btn => btn.disabled = true);

        // Находим все обёртки заданий и очищаем их содержимое
        const taskItems = document.querySelectorAll(`.task-item`);
        taskItems.forEach(item => resetContainer(item));

        // Инициализируем загрузку раздела (например, AJAX-запрос или другая логика)
        await primaryInitialization(sectionId);

        // Запускаем периодическую проверку, когда задания загрузятся
        if (document.querySelectorAll(`.task-item[data-section-id="${sectionId}"]`).length > 0) {
            checkTasksLoaded(sectionId);
        } else {
            sectionButtons.forEach(btn => btn.disabled = false);
        }
    }

    // При загрузке страницы выбираем первый раздел
    if (sectionButtons.length > 0) {
        const firstSectionId = sectionButtons[0].getAttribute('data-section-id');
        await loadSection(firstSectionId);
    }

    // Обработчик клика для каждого раздела
    sectionButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const sectionId = this.getAttribute('data-section-id');
            await loadSection(sectionId);
        });
    });

    getContext(lessonId);
});


