const sectionId = document.getElementById('sectionId').innerHTML;

// Функция для получения CSRF-токена из куки
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Получаем CSRF-токен
const csrftoken = getCookie('csrftoken');

const activityHandlers = {
    wordlist: {
        container: document.getElementById('wordListFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./wordList.js');
            init(taskData, selectedTasksData);
        },
    },
    matchupthewords: {
        container: document.getElementById('matchUpTheWordsFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./matchUpTheWords.js');
            init(taskData, selectedTasksData);
        },
    },
    essay: {
        container: document.getElementById('essayFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./essay.js');
            init(taskData, selectedTasksData);
        },
    },
    note: {
        container: document.getElementById('noteFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./note.js');
            init(taskData, selectedTasksData);
        },
    },
    image: {
        container: document.getElementById('imageFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./image.js');
            init(taskData, selectedTasksData);
        },
    },
    sortintocolumns: {
        container: document.getElementById('columnsFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./sortIntoColumns.js');
            init(taskData, selectedTasksData);
        },
    },
    makeasentence: {
        container: document.getElementById('sentenceFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./makeASentence.js');
            init(taskData, selectedTasksData);
        },
    },
    unscramble: {
        container: document.getElementById('unscrambleFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./unscramble.js');
            init(taskData, selectedTasksData);
        },
    },
    fillintheblanks: {
        container: document.getElementById('fillTaskFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./fillInTheBlanks.js');
            init(taskData, selectedTasksData);
        },
    },
    article: {
        container: document.getElementById('articleTaskFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./article.js');
            init(taskData, selectedTasksData);
        },
    },
    test: {
        container: document.getElementById('testTaskFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./test.js');
            init(taskData, selectedTasksData);
        },
    },
    trueorfalse: {
        container: document.getElementById('trueFalseTaskFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./true_false.js');
            init(taskData, selectedTasksData);
        },
    },
    labelimages: {
        container: document.getElementById('labelImagesFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./labelImages.js');
            init(taskData, selectedTasksData);
        },
    },
    embeddedtask: {
        container: document.getElementById('interactionsFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./interactions.js');
            init(taskData, selectedTasksData);
        },
    },
    audio: {
        container: document.getElementById('audioFormContainer'),
        init: async (taskData = null, selectedTasksData = null) => {
            const { init } = await import('./audio.js');
            init(taskData, selectedTasksData);
        },
    },
};

function addDataToContext(contextTextarea, button) {
    const container = button.closest('å.task-item');
    const taskId = container.id.replace('task-', '');
    const taskType = container.dataset.taskType;

    fetchTaskData(taskId).then(taskData => {
        let content = '';
        switch (taskType) {
            case 'wordlist':
                content = `Список слов ${taskData.title}\n${JSON.stringify(taskData.words, null, 2)}`;
                break;
            case 'note':
                content = `Заметка ${taskData.title}\n${taskData.content}`;
                break;
            case 'article':
                content = `Статья ${taskData.title}\n${taskData.content}`;
                break;
            default:
                content = '';
        }

        // Добавляем текст в текстовое поле
        if (contextTextarea.value) {
            contextTextarea.value += '\n\n' + content;
        } else {
            contextTextarea.value = content;
        }

        // Сохраняем текст в localStorage
        localStorage.setItem('contextText', contextTextarea.value);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const addActivityButton = document.getElementById('addActivityButton');
    const overlay = document.getElementById('overlay');
    const activityBlock = document.getElementById('activityBlock');
    const activityCreationBlock = document.getElementById('activityCreationBlock');
    const closeActivityBlock = document.getElementById('closeActivityBlock');
    const closeActivityCreationBlock = document.getElementById('closeActivityCreationBlock');
    const loadedTasks = document.getElementById('loadedTasks');
    const viewContentButtonContainer = document.querySelector('.view-content-button-container');
    const viewContentButton = document.querySelector('.view-content-button');
    const selectedContentDiv = document.getElementById('selected-content');
    let selectedTasks = [];
    const contextTextarea = document.getElementById('context-textarea');
    const addButtons = document.querySelectorAll('.add-context-btn');

    // Показываем блок при нажатии на кнопку "Добавить задание"
    addActivityButton.addEventListener('click', () => {
        activityBlock.style.display = 'block';
        overlay.style.display = 'block';
        addActivityButton.style.display = 'none';
    });

    // Скрываем блок при нажатии на кнопку "Закрыть"
    closeActivityBlock.addEventListener('click', () => {
        activityBlock.style.display = 'none';
        overlay.style.display = 'none';
        addActivityButton.style.display = 'block';
        Object.values(activityHandlers).forEach(handler => {
            if (handler.container) {
                handler.container.style.display = 'none';
            }
        });
    });

    closeActivityCreationBlock.addEventListener('click', () => {
        activityBlock.style.display = 'block';
        activityCreationBlock.style.display = 'none';
    });

    // Загружаем сохраненный текст из localStorage
    if (localStorage.getItem('contextText')) {
        contextTextarea.value = localStorage.getItem('contextText');
    }
    // Добавляем обработчик для каждой кнопки "+"
    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            addDataToContext(contextTextarea, button);
        });
    });

    activityBlock.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-activity-type]');
        if (!button) return;

        const activityType = button.getAttribute('data-activity-type');

        if (activityHandlers[activityType]) {
            const { container, init } = activityHandlers[activityType];

            Object.values(activityHandlers).forEach(handler => {
                if (handler.container) {
                    handler.container.style.display = 'none';
                }
            });

            activityCreationBlock.querySelector('.card-body').innerHTML = container.innerHTML;

            activityCreationBlock.style.display = 'block';
            activityBlock.style.display = 'none';

            const selectedTasksData = contextTextarea.value;
            await init(null, selectedTasksData);
        } else {
            console.error(`Неизвестный тип задания: ${activityType}`);
        }
    });

    loadedTasks.addEventListener('click', async (event) => {
        // Обработка кнопки "Редактировать"
        const editButton = event.target.closest('.edit-task-button');
        if (editButton) {
            const taskId = editButton.getAttribute('data-task-id');
            const taskType = editButton.getAttribute('data-task-type');

            const taskData = await fetchTaskData(taskId);
            showEditForm(taskType, taskData);
            return; // Прерываем выполнение, чтобы не обрабатывать другие кнопки
        }

        // Обработка кнопки "Удалить"
        const deleteButton = event.target.closest('.delete-task-button');
        if (deleteButton) {
            const taskId = deleteButton.getAttribute('data-task-id');

            const confirmDelete = confirm('Вы уверены, что хотите удалить это задание?');
            if (!confirmDelete) return;

            try {
                const response = await fetch(`/hub/api/tasks/${taskId}/delete/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': csrftoken,
                    },
                });

                if (response.ok) {
                    const taskItem = document.getElementById(`task-${taskId}`);
                    if (taskItem) {
                        taskItem.remove();
                    }
                    const actionButtons = document.querySelectorAll('#button').dataset.taskId = taskId;
                    actionButtons.forEach(button => {
                        button.remove();
                    });
                } else {
                    alert('Ошибка при удалении задания.');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении задания.');
            }
            return;
        }
    });

    // Функция для отображения формы редактирования
    async function showEditForm(taskType, taskData) {
        const handler = activityHandlers[taskType];

        if (handler) {
            const { container, init } = handler;

            activityCreationBlock.querySelector('.card-body').innerHTML = container.innerHTML;
            activityCreationBlock.style.display = 'block';
            overlay.style.display = 'block';
            activityCreationBlock.scrollIntoView({ block: 'start' });
            activityBlock.style.display = 'none';
            addActivityButton.style.display = 'none';

            const selectedTasksData = contextTextarea.value;
            init(taskData, selectedTasksData);
        } else {
            console.error(`Неизвестный тип задания: ${taskType}`);
        }
    }


});

// Функция для получения данных задания
async function fetchTaskData(taskId) {
    try {
        const response = await fetch(`/hub/api/tasks/${taskId}/`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке данных задания');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при загрузке данных задания:', error);
        return null;
    }
}

function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this, args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

function convertMarkdownToHTML(text) {
    // Замена переносов строк (\n) на <br>
    text = text.replace(/\n/g, '<br>');
    // Замена полужирного выделения (**text**) на <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Замена курсива (*text*) на <em>text</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Замена подчеркивания (_text_) на <u>text</u>
    text = text.replace(/_(.*?)_/g, '<u>$1</u>');
    return DOMPurify.sanitize(text);
}