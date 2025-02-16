export function init(taskData = null, selectedTasksData = null) {
    const titleInput = document.getElementById('articleTaskTitleInput');
    const editor = document.getElementById('articleEditor');
    const saveButton = document.getElementById('saveArticleTaskButton');
    const AIArticleButton = document.getElementById('AIArticleButton');
    const AIArticleBlock = document.getElementById('AIArticleBlock');
    const articleTitle = AIArticleBlock.querySelector('#articleTitle');
    const articleRequirements = AIArticleBlock.querySelector('#articleRequirements');
    const articleLengthRange = AIArticleBlock.querySelector('#articleLengthRange');
    const articleLengthValue = AIArticleBlock.querySelector('#articleLengthValue');
    const generateAIArticleButton = document.getElementById('generateAIArticleButton');
    const aiGenerationOptions = AIArticleBlock.querySelectorAll('input[name="ai-generation-option"]');

    // Загрузка данных при редактировании
    if (taskData) {
        titleInput.value = taskData.title || '';
        editor.innerHTML = DOMPurify.sanitize(taskData.text || '');
    }

    if (!selectedTasksData) {
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
    };

    // Форматирование текста
    document.querySelectorAll('.format-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.execCommand(button.dataset.command, false, null);
        });
    });

    // Обработчик сохранения
    saveButton.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const content = editor.innerHTML.trim();

        if (!title || !content) {
            alert('Заполните заголовок и текст!');
            return;
        }

        const addActivityButton = document.getElementById('addActivityButton');
        const activityCreationBlock = document.getElementById('activityCreationBlock');
        addActivityButton.style.display = 'block';
        activityCreationBlock.style.display = 'none';
        document.getElementById('overlay').style.display = 'none';

        try {
            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'article',
                    payloads: {
                        title: title,
                        content: DOMPurify.sanitize(content)
                    }
                }),
            });

            const result = await response.json();
            if (result.success) {
                const taskHtml = createArticleHtml(result.task);

                if (!taskData) {
                    // Добавление новой задачи
                    const loadedTasks = document.getElementById('loadedTasks');
                    loadedTasks.insertAdjacentHTML('beforeend', taskHtml);
                    const newTaskElement = document.getElementById(`task-${result.task.id}`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    // Обновление существующей задачи
                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    elementToUpdate.innerHTML = taskHtml;
                    elementToUpdate.scrollIntoView({ block: 'start' });
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка при сохранении.');
        }
    });

    AIArticleButton.addEventListener('click', () => {
        AIArticleBlock.style.display = 'block';
        AIArticleBlock.scrollIntoView({ behavior: 'smooth' });
        articleTitle.focus();
    });

    generateAIArticleButton.addEventListener('click', async () => {
        generateAIArticleButton.disabled = true;
        articleTitle.disabled = true;
        articleRequirements.disabled = true;
        articleLengthRange.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });

        try {
            const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;
            if (selectedOption === 'first' && articleTitle.value.trim() === '') {
                alert('Придумайте заголовок');
                return
            }
            const title = articleTitle.value.trim();
            const requirements = articleRequirements.value.trim();
            const length = articleLengthRange.value;

            const payload = {
                'title': title,
                'requirements': requirements,
                'length': length,
                'basics': (selectedOption === 'selected' ? selectedTasksData : ''),
            };

            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'article',
                    payloads: payload,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const result = await response.json();
            if (result && result.result) {
                if (result.result === "Измените свой запрос и попробуйте снова. Вероятно, Вам стоит избегать спорных и (или) политических тем.") {
                    alert(result.result);
                    return;
                }
                const article = JSON.parse(result.result);
                titleInput.value = article.title;
                let processedContent = convertMarkdownToHTML(article.content);
                editor.innerHTML = processedContent;
                AIArticleBlock.style.display = 'none';
                saveButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAIArticleButton.disabled = false;
            articleTitle.disabled = false;
            articleRequirements.disabled = false;
            articleLengthRange.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
        }
    });

    // Обновление значения длины статьи при изменении ползунка
    articleLengthRange.addEventListener('input', (event) => {
        articleLengthValue.textContent = event.target.value;
    });
}

// Генерация HTML статьи
function createArticleHtml(task) {
    return `
        <div class="task-item" id="task-${task.id}" data-task-type="article">
            <input type="checkbox" class="task-checkbox" data-task-id="${ task.id }" checked>
            <label for="task-{{ task.id }}"></label>
            <div class="article-item">
                <h3>${convertMarkdownToHTML(task.content.title)}</h3>
                <div class="article-content">${DOMPurify.sanitize(task.content.content)}</div>
                <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="article">Редактировать</button>
                <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
            </div>
        </div>
    `;
}
