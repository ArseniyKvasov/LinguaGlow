export function init(taskData = null, selectedTasksData = null) {
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');
    const saveNoteButton = document.getElementById('saveNoteButton');
    const AINoteButton = document.getElementById('AINoteButton');
    const AINoteBlock = document.getElementById('AINoteBlock');
    const noteTopic = AINoteBlock.querySelector('#noteTopic');
    const noteRequirements = AINoteBlock.querySelector('#noteRequirements');
    const aiGenerationOptions = AINoteBlock.querySelectorAll('input[name="ai-generation-option"]');
    const shortNoteCheckbox = AINoteBlock.querySelector('#shortNote');
    const generateAINoteButton = document.getElementById('generateAINoteButton');

    // Инициализация данных, если они переданы (для редактирования)
    if (taskData) {
        noteTitleInput.value = taskData.title || '';
        noteContentInput.value = taskData.content || '';
    }

    // Обработчик для кнопки "Сохранить"
    saveNoteButton.addEventListener('click', async () => {
        const title = noteTitleInput.value.trim();
        const content = convertMarkdownToHTML(noteContentInput.value.trim());

        if (!title) {
            alert('Поле "Заголовок" не может быть пустым.');
            return;
        }

        try {
            const addActivityButton = document.getElementById('addActivityButton');
            const activityCreationBlock = document.getElementById('activityCreationBlock');
            addActivityButton.style.display = 'block';
            activityCreationBlock.style.display = 'none';

            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'note',
                    payloads: {"title": title, "content": content},
                }),
            });

            const result = await response.json();

            if (result.success) {
                const taskHtml = generateNoteHtml(result.task);

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
                    const addContextBtn = elementToUpdate.querySelector('.add-context-btn');
                    addContextBtn.addEventListener('click', () => {
                        const contextTextarea = document.getElementById('context-textarea');
                        addDataToContext(contextTextarea, addContextBtn);
                    });
                    elementToUpdate.scrollIntoView({ block: 'start' });
                }

                document.getElementById('overlay').style.display = 'none';
            } else {
                alert('Ошибка при сохранении данных.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке данных.');
        }
    });

    function generateNoteHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}" data-task-type="note">
                <div class="card mb-3 border-0 shadow-lg rounded-3">
                    <div class="card-header bg-primary bg-opacity-10 d-flex align-items-center justify-content-between">
                        <button class="add-context-btn my-2 btn btn-primary">+</button>
                        <h3 class="card-title mb-0 text-primary fw-bold">${task.content.title}</h3>
                        <span class="badge bg-primary text-white fs-6">Note Task</span>
                    </div>
                    <div class="card-body">
                        <div class="article-content mb-4 text-part">${task.content.content || ''}</div>
                    </div>
                </div>
            </div>
        `;
    }

    AINoteButton.addEventListener('click', () => {
        AINoteBlock.style.display = 'block';
        AINoteBlock.scrollIntoView({ behavior: 'smooth' });
        noteTopic.focus();
    });

    generateAINoteButton.addEventListener('click', async () => {
        generateAINoteButton.disabled = true;
        noteTopic.disabled = true;
        noteRequirements.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
        shortNoteCheckbox.disabled = true;

        try {
            const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;
            const topic = noteTopic.value.trim();
            const requirements = noteRequirements.value.trim();
            const isShortNote = shortNoteCheckbox.checked;

            const payload = {
                'topic': topic,
                'requirements': requirements,
                'basics': (selectedOption === 'selected' ? selectedTasksData : ''),
                'is_short_note': isShortNote,
            };

            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'note',
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
                const note = JSON.parse(result.result);
                noteTitleInput.value = note.title;
                noteContentInput.value = note.content;
                AINoteBlock.style.display = 'none';
                saveNoteButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAINoteButton.disabled = false;
            noteTopic.disabled = false;
            noteRequirements.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
            shortNoteCheckbox.disabled = false;
        }
    });

}