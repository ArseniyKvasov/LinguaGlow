function generateAI(params, payloads) {
    // Вызов функции генерации заданий
}

function saveTask(params, payloads) {
    // Сохранение задания в БД
}

function addTask(params, payloads) {
    // Получаем тип задания
    // Создаем необходимые поля и окно для генерации
    // Вешаем обработчики событий
}

function editTask(taskContainer) {
    // Получаем тип задания, идентификатор задания
    // Загружаем данные с сервера
    // Вешаем обработчики событий
}

function showAIWindow(taskType) {
    // Отображение окна для генерации заданий
    // Добавление обработчиков событий
}

function uploadTaskData(taskId) {
    // Вызов функции для загрузки данных задания
}

function createWords(taskId=null) {
    // Создаем Список слов
    // Добавляем обработчики событий
}

function createMatch(taskId=null) {
    // Создаем задание на соотнесение слов
    // Добавляем обработчики событий
}

function deleteTask(taskContainer) {
    // Удаляем задание из БД
    // Удаляем контейнер с заданием
}

function createSimilarTask(taskContainer) {
    // Создаем похожее задание
}

function attachContext(taskContainer) {
    // Передаем задание в контекст
}

function attachTextToContext(taskContainer) {
    // Создаем заметку
}

function askToProhibitCopying(taskContainer) {
    // Запрещаем копирование страницы
}

function askToAllowCopying(taskContainer) {
    // Разрешаем копирование страницы
}

// Функция для автоматической прокрутки к последнему элементу
function scrollToBottom(container) {
    const overflowContainer = container.closest('.overflow-y-auto');
    if (overflowContainer) {
        overflowContainer.scrollTo({
            top: overflowContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Отображение уведомлений
function showNotification(text, color) {
    console.log(text, color);
    let alertContainer = document.getElementById("alert-container");
    if (!alertContainer) {
        alertContainer = document.createElement("div");
        alertContainer.id = "alert-container";
        alertContainer.style.position = "fixed";
        alertContainer.style.bottom = "20px";
        alertContainer.style.right = "20px";
        alertContainer.style.zIndex = "1050";
        document.body.appendChild(alertContainer);
    }

    // Создаем элемент предупреждения
    let alert = document.createElement("div");
    alert.className = `alert alert-${color} fade show`;
    alert.setAttribute("role", "alert");
    alert.style.minWidth = "200px";
    alert.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    alert.innerHTML = text;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove("show");
        alert.classList.add("fade");
        setTimeout(() => alert.remove(), 500);
    }, 5000);
}



function handleSectionNameEdit(sectionId, name) {
    // Отправляем запрос на сервер для обновления названия раздела
    fetch(`/hub/section/${sectionId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') // Получаем CSRF-токен
        },
        body: JSON.stringify({ name: name })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка при обновлении названия раздела.');
        }
    })
    .catch(error => {
        showNotification('Не удалось обновить название раздела.', "danger");
    });
}

function handleAddSection(lessonId, sectionName) {
    return fetch(`/hub/lesson/${lessonId}/add_section/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ name: sectionName })
    })
    .then(response => {
        if (response.ok) return response.json();
        else throw new Error('Ошибка при добавлении раздела');
    })
    .then(data => {
        // Создаем новый элемент раздела в DOM
        const sectionList = document.querySelector('#section-list');
        const newSection = document.createElement('li');
        newSection.className = 'list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center text-primary section-link';
        newSection.dataset.sectionId = data.section_id;
        newSection.innerHTML = `
            <span class="section-name">${data.name}</span>
            <div class="section-action-buttons d-flex align-items-center">
                <i class="bi bi-pencil-fill text-secondary edit-section-icon me-2"
                   data-section-id="${data.section_id}"
                   title="Редактировать название"></i>
                <form method="POST" action="/hub/section/${data.section_id}/delete/" onsubmit="return confirm('Вы уверены?');">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${getCookie('csrftoken')}">
                    <button class="btn btn-link" title="Удалить">
                        <i class="bi bi-trash3-fill text-secondary text-danger-hover"></i>
                    </button>
                </form>
            </div>
        `;
        sectionList.appendChild(newSection);

        // Инициализируем обработчики для нового раздела
        sectionListInitialization();

        // Автоматическая прокрутка к последнему элементу
        scrollToBottom(sectionList);

        const addSectionButton = document.querySelector('.add-section-link');
        addSectionButton.style.display = 'block';

        return data;
    })
    .catch(error => {
        showNotification(error.message, "danger");
    });
}

function sectionListInitialization() {
    // Проходим по каждому значку редактирования секции и добавляем обработчик события
    document.querySelectorAll('.edit-section-icon').forEach(icon => {
        icon.addEventListener('click', async (event) => {
            const sectionId = event.target.dataset.sectionId;
            const listItem = event.target.closest('.list-group-item');
            // Находим кнопку, содержащую название секции
            const sectionLinkButton = listItem.querySelector('.section-link');
            if (!sectionLinkButton) return;

            const currentName = sectionLinkButton.textContent.trim();
            // Создаем input для редактирования
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.value = currentName;
            inputField.classList.add('form-control', 'form-control-sm');

            // Заменяем кнопку на input
            sectionLinkButton.replaceWith(inputField);
            inputField.focus();

            // Функция для сохранения изменений
            const saveChanges = async () => {
                const newName = inputField.value.trim();
                // Если имя изменилось и не пустое, отправляем изменения на сервер
                if (newName && newName !== currentName) {
                    await handleSectionNameEdit(sectionId, newName);
                }
                // Создаем новую кнопку с обновленным (или прежним) названием
                const newSectionLinkButton = document.createElement('button');
                newSectionLinkButton.type = 'button';
                newSectionLinkButton.className = 'btn btn-link p-0 section-link text-decoration-none';
                newSectionLinkButton.dataset.sectionId = sectionId;
                newSectionLinkButton.textContent = newName || currentName;
                // Возвращаем кнопку вместо input
                inputField.replaceWith(newSectionLinkButton);
            };

            // Сохраняем изменения по нажатию Enter
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveChanges();
                }
            });
            // Или при потере фокуса
            inputField.addEventListener('blur', () => {
                saveChanges();
            });
        });
    });
}

function addSectionButtonInitialization() {
    // Обработчик для кнопки "Добавить раздел"
    document.querySelector('.add-section-link').addEventListener('click', (e) => {
        e.preventDefault();
        const lessonId = e.target.dataset.lessonId;

        // Создаем поле ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Название раздела';
        input.className = 'form-control form-control-sm mb-2';

        // Убираем ссылку "Добавить раздел"
        const addSectionButton = document.querySelector('.add-section-link');
        addSectionButton.style.display = 'none';

        // Кнопка сохранения
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-primary btn-sm w-100';
        saveButton.textContent = 'Создать';

        // Контейнер для формы
        const formContainer = document.createElement('div');
        formContainer.className = 'mb-2';
        formContainer.appendChild(input);
        formContainer.appendChild(saveButton);

        // Вставляем форму перед ссылкой "Добавить раздел"
        e.target.parentNode.insertBefore(formContainer, e.target);

        // Обработчик сохранения
        saveButton.addEventListener('click', () => {
            const sectionName = input.value.trim();
            if (sectionName) {
                handleAddSection(lessonId, sectionName)
                    .then(() => {
                        formContainer.remove();
                    });
            }
        });
    });
}

function addTaskToContext(lesson_id, task_id, header, content) {
    fetch(`/hub/add-context-element/${lesson_id}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify({
            task_id: task_id,
            header: header,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, "danger");
        } else {
            showTaskInContextWindow(data.task_id, data.header, data.content);
        }
    })
    .catch(error => {
        showNotification("Произошла ошибка. Попробуйте выбрать другое задание или обратитесь в поддержку.", "danger");
    });
}

function removeTaskFromContext(taskId) {
    const lessonId = document.getElementById("main-container").dataset.lessonId;

    fetch(`/hub/remove-context-element/${lessonId}/${taskId}/`, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json"
        }
    }).then(response => response.json())
      .then(data => {
          if (data.error && data.error !== "Такого задания в контексте нет.") {
              showNotification(data.error, "danger");
          } else {
            removeAccordionElementFromContextWindow(data.task_id)
          }
      }).catch(error => showNotification("Произошла ошибка. Измените параметры или обратитесь в поддержку.", "danger"));
}

function addTextContext() {
    const container = document.getElementById("noteContainer");
    const addTextContextButton = document.getElementById("addTextContentButton");
    const lessonId = document.getElementById("main-container").dataset.lessonId;

    addTextContextButton.style.display = "none";

    // Создаем текстовое поле, если его еще нет
    let textarea = container.querySelector("textarea");
    if (!textarea) {
        textarea = document.createElement("textarea");
        textarea.classList.add("form-control", "mb-2");
        textarea.placeholder = "Введите текст...";
        container.appendChild(textarea);
    }
    textarea.focus();

    // Проверяем, есть ли уже кнопка сохранения
    let saveButton = container.querySelector(".save-note-btn");
    if (!saveButton) {
        saveButton = document.createElement("button");
        saveButton.classList.add("btn", "btn-primary", "save-note-btn", "d-flex", "ms-auto");
        saveButton.textContent = "Сохранить";
        container.appendChild(saveButton);

        // Добавляем обработчик клика для сохранения заметки
        saveButton.addEventListener("click", function () {
            const content = textarea.value.trim();
            if (content) {
                addTaskToContext(lessonId, null, null, content);
                textarea.remove();
                saveButton.remove();
                addTextContextButton.style.display = "block";
            } else {
                showNotification("Заметка не может быть пустой", "warning")
            }
        });
    }
}


// Инициализация панели управления
function deleteListener(taskContainer) {
    // Получаем task_id из переданного контейнера
    const taskId = taskContainer.id;

    // Находим кнопку "Удалить" внутри переданного контейнера
    const deleteButton = taskContainer.querySelector('.bi-trash').parentElement;

    if (!deleteButton || !taskId) return; // Если кнопки или task_id нет, выходим

    deleteButton.addEventListener('click', async function () {
        const confirmDelete = confirm("Вы уверены, что хотите удалить это задание?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/hub/tasks/${taskId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
            });

            if (response.ok) {
                removeTaskFromContext(taskId);
                taskContainer.remove();
            } else {
                showNotification("Ошибка при удалении задания", "danger");
            }
        } catch (error) {
            showNotification("Проверьте подключение к интернету.", "danger");
        }
    });
}

const elementRussianNames = {
    "wordlist": "Список слов",
    "matchupthewords": "Соотнесите слова",
    "essay": "Эссе",
    "note": "Заметка",
    "image": "Изображение",
    "sortintocolumns": "Разбить на колонки",
    "makeasentence": "Составить предложение",
    "unscramble": "Расставить по порядку",
    "fillintheblanks": "Заполнить пропуски",
    "dialogue": "Диалог",
    "article": "Статья",
    "audio": "Аудио",
    "test": "Тест",
    "trueorfalse": "Правда или ложь",
    "labelimages": "Подпишите изображения",
    "embeddedtask": "Встроенное задание"
};

function formatTaskContent(taskType, raw_content) {
    let content;
    if (taskType === "wordlist") {
        content = Object.entries(raw_content)
            .map(([word, translation]) => `<b>${word}</b> - ${translation}`)
            .join('<br>');
    } else if (taskType === "matchupthewords") {
        content = Object.entries(raw_content)
            .map(([word, translation]) => `${word} - ${translation}`)
            .join('\n');
    } else if (taskType === "labelimages") {
        content = raw_content.join(', ');
    } else if (taskType === "unscramble") {
        content = raw_content.map(({ word, shuffled_word, hint }) => {
            let formatted = `${word.replaceAll("␣", " ")}`;
            if (hint) {
                formatted += ` (${hint})`;
            }
            return formatted;
        }).join(', ');
    } else if (taskType === "fillintheblanks") {
        content = raw_content.replaceAll(/\[(.*?)\]/g, "_");
    } else if (taskType === "test") {
        content = raw_content.map((q, qIndex) => {
            let answers = q.answers.map((a, aIndex) =>
                `   ${aIndex + 1}. ${a.answer} ${a.correct ? "(✔)" : ""}`
            ).join("\n");
            return `${qIndex + 1}. ${q.question}:${answers}<br>`;
        }).join("\n\n");
    } else if (taskType === "makeasentence") {
        content = raw_content.map(sentence => sentence.correct).join("<br>");
    } else if (taskType === "sortintocolumns") {
        content = Object.entries(raw_content)
            .map(([columnTitle, wordsArray]) => `${columnTitle}: ${wordsArray.join(", ")}`)
            .join("<br>");
    } else if (taskType === "trueorfalse") {
        content = raw_content.map(statement => `${statement.question}: ${statement.correct ? "Правда" : "Ложь"}`)
            .join("<br>");
    } else {
        content = raw_content;
    }
    return content;
}

function initAttachTaskListeners(taskContainer) {
    const icon = taskContainer.querySelector(".bi-bookmark");

    if (!icon) return;

    icon.addEventListener("click", async function () {
        const taskContainer = this.closest(".task-item"); // Родительский контейнер
        if (!taskContainer) return;

        const taskId = taskContainer.id;
        const taskType = taskContainer.dataset.taskType;
        const lessonId = document.getElementById("main-container").dataset.lessonId;

        if (!taskId || !taskType || !lessonId) {
            showNotification("Ошибка: отсутствуют данные задания.", "danger");
            return;
        }

        // Получаем данные с сервера
        const taskData = await fetchTaskData(taskId);
        if (!taskData) return;

        let header = elementRussianNames[taskType];
        if (taskData.title) {
            header += ` - ${taskData.title}`;
        }

        // Убираем id и title, оставляем только контент
        const { id, title, image_urls, audio_url, display_format, ...contentData } = taskData;
        const raw_content = Object.values(contentData)[0] || "Нет данных";

        const content = formatTaskContent(taskType, raw_content);

        // Добавляем задание в контекст
        addTaskToContext(lessonId, taskId, header, content);
    });
}

// Загрузка функций, доступных только учителю
document.addEventListener('DOMContentLoaded', () => {
    sectionListInitialization();
    addSectionButtonInitialization();

    const sectionList = document.querySelector('#section-list');
    scrollToBottom(sectionList);

    // Инициализируем кнопку добавления заметки контекста
    document.getElementById("addTextContentButton").addEventListener("click", addTextContext);
});



socket.onmessage = (event) => {
    // Обрабатываем ответ пользователя
    // Указываем, что пользователь онлайн и ставим таймер на 2 минуты
}