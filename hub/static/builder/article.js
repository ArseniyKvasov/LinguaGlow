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
                    const addContextBtn = newTaskElement.querySelector('.add-context-btn');
                    addContextBtn.addEventListener('click', () => {
                        const contextTextarea = document.getElementById('context-textarea');
                        addDataToContext(contextTextarea, addContextBtn);
                    });
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    // Обновление существующей задачи
                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    elementToUpdate.innerHTML = taskHtml;
                    const addContextBtn = newTaskElement.querySelector('.add-context-btn');
                    addContextBtn.addEventListener('click', () => {
                        const contextTextarea = elementToUpdate.getElementById('context-textarea');
                        addDataToContext(contextTextarea, addContextBtn);
                    });
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
            <div class="card mb-3 border-0 shadow-lg rounded-3">
                <div class="card-header bg-primary bg-opacity-10 d-flex align-items-center justify-content-between">
                    <button class="add-context-btn my-2 btn btn-primary">+</button>
                    <h3 class="card-title mb-0 text-primary fw-bold">${convertMarkdownToHTML(task.content.title)}</h3>
                    <span class="badge bg-primary text-white fs-6">Article Task</span>
                </div>
                <div class="card-body">
                    <div class="article-content mb-4 text-part">${DOMPurify.sanitize(task.content.content)}</div>
                </div>
            </div>
        </div>
    `;
}
