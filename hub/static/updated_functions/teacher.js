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
    // Проходим по каждому названию секции и добавляем обработчики событий
    document.querySelectorAll('.edit-section-icon').forEach(icon => {
        icon.addEventListener('click', async (event) => {
            const sectionId = event.target.dataset.sectionId;
            const listItem = event.target.closest('.list-group-item');
            const sectionNameSpan = listItem.querySelector('.section-name');

            const currentName = sectionNameSpan.textContent.trim();
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.value = currentName;
            inputField.classList.add('form-control', 'form-control-sm');

            sectionNameSpan.replaceWith(inputField);
            inputField.focus();

            const saveChanges = async () => {
                const newName = inputField.value.trim();
                if (newName && newName !== currentName) {
                    handleSectionNameEdit(sectionId, newName);

                    sectionNameSpan.textContent = newName;
                }
                if (inputField) {
                    inputField.replaceWith(sectionNameSpan);
                }
            };

            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveChanges();
                }
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
            showTaskInContextWindow(data.task_id, data.header, data.content, "success");
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
          if (data.error) {
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