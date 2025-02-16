export function init(taskData = null, selectedTasksData = null) {
    const titleInput = document.getElementById('interactionTitleInput');
    const embedInput = document.getElementById('interactionEmbedInput');
    const saveButton = document.getElementById('saveInteractionButton');

    // XSS-защита: очищаем HTML
    function sanitizeInput(input) {
        return input
            .replace(/<script.*?>.*?<\/script>/gi, "")
            .replace(/javascript:/gi, "")
            .replace(/on\w+=".*?"/gi, "")
            .replace(/\s*on\w+=".*?"/gi, "")
            .replace(/<iframe[^>]*src\s*=\s*["'](https:\/\/(wordwall\.net|quizlet\.com|miro\.com)[^"']+)["'][^>]*\s*>.*?<\/iframe>/gi, (match, src) => {
                return `<iframe src="${src}" allowfullscreen></iframe>`;
            });
    }

    // Заполняем данные, если редактируем задание
    if (taskData) {
        titleInput.value = taskData.title || '';
        embedInput.value = taskData.embed_code || '';
    }

    // Сохранение задания
    saveButton.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const embedCode = sanitizeInput(embedInput.value.trim());

        if (!title || !embedCode.includes('<iframe')) {
            alert("Введите корректное название и iframe-код.");
            return;
        }

        const addActivityButton = document.getElementById('addActivityButton');
        const activityCreationBlock = document.getElementById('activityCreationBlock');
        addActivityButton.style.display = 'block';
        activityCreationBlock.style.display = 'none';

        try {
            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'embedded_task',
                    payloads: { title: title, embed_code: embedCode },
                }),
            });

            const result = await response.json();

            if (result.success) {
                const taskHtml = generateTaskHtml(result.task);

                if (!taskData) {
                    const loadedTasks = document.getElementById('loadedTasks');
                    loadedTasks.insertAdjacentHTML('beforeend', taskHtml);
                    const newTaskElement = document.getElementById(`task-${result.task.id}`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    elementToUpdate.innerHTML = taskHtml;
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

    function generateTaskHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}">
                <div class="interaction-item">
                    <h3>${task.content.title}</h3>
                    <div class="embed-container">${task.content.embed_code}</div>
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="interactions">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        `;
    }
}
