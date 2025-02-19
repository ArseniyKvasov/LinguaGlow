export function init(taskData = null, selectedTasksData = null) {
    const essayTaskInput = document.getElementById('essayTaskInput');
    const conditionsContainer = document.getElementById('conditionsContainer');
    const addConditionButton = document.getElementById('addConditionButton');
    const resetConditionsButton = document.getElementById('resetConditionsButton');
    const saveEssayButton = document.getElementById('saveEssayButton');
    const AIEssayButton = document.getElementById('AIEssayButton');
    const AIEssayBlock = document.getElementById('AIEssayBlock');
    const rangeInput = AIEssayBlock.querySelector('input[type="range"]');
    const rangeValue = AIEssayBlock.querySelector('.range-value');
    const aiGenerationOptions = AIEssayBlock.querySelectorAll('input[name="ai-generation-option"]');
    const additionalEssayRequirementsButton = AIEssayBlock.querySelector('.add-additional-essay-requirements-button');
    const additionalEssayRequirements = AIEssayBlock.querySelector('.additional-essay-requirements');
    const generateAIEssayButton = document.getElementById('generateAIEssayButton');

    // Инициализация данных, если они переданы (для редактирования)
    if (taskData) {
        essayTaskInput.value = taskData.title || '';
        if (taskData.conditions) {
            Object.entries(taskData.conditions).forEach(([text, points]) => {
                addConditionWithValues(text, points);
            });
        }
    }

    rangeInput.addEventListener('input', () => {
        rangeValue.textContent = rangeInput.value;
    });

    rangeValue.textContent = rangeInput.value;

    // Обработчик для кнопки "Добавить условие"
    addConditionButton.addEventListener('click', () => {
        if (conditionsContainer.children.length < 5) {
            addConditionWithValues();
            updateRemoveConditionButtons();
        } else {
            alert('Максимальное количество условий - 5.');
        }
    });

    // Обработчик для кнопки "Обнулить условия"
    resetConditionsButton.addEventListener('click', () => {
        conditionsContainer.innerHTML = '';
        updateRemoveConditionButtons();
    });

    if (!selectedTasksData) {
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
    }

    AIEssayButton.addEventListener('click', () => {
        AIEssayBlock.style.display = 'block';
        AIEssayBlock.scrollIntoView({ behavior: 'smooth' });
        rangeInput.focus();
    });

    additionalEssayRequirementsButton.addEventListener('click', () => {
        additionalEssayRequirements.style.display = 'block';
        additionalEssayRequirementsButton.display = 'none';
        additionalEssayRequirements.focus();
    });

    generateAIEssayButton.addEventListener('click', async () => {
        generateAIEssayButton.disabled = true;
        rangeInput.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
        additionalEssayRequirements.disabled = true;
        additionalEssayRequirementsButton.disabled = true;

        const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;

        try {
            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'essay',
                    payloads: {
                        'size': rangeInput.value.trim(),
                        'requirements': additionalEssayRequirements.value.trim(),
                        'basics': (selectedOption === 'selected' ? selectedTasksData : ''),
                    },
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

                const essay = JSON.parse(result.result);

                essayTaskInput.value = essay.instructions;
                if (typeof essay.conditions === 'object') {
                    for (const [conditionName, value] of Object.entries(essay.conditions)) {
                        console.log("Condition Name:", conditionName, "Value:", value);
                        addConditionWithValues(conditionName, value);
                    }
                }

                AIEssayBlock.scrollIntoView({ behavior: 'smooth' })

                AIEssayBlock.scrollIntoView({ behavior: 'smooth' });
                rangeInput.value = '';
                additionalEssayRequirements.value = '';
                AIEssayBlock.style.display = 'none';
                saveEssayButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }

        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAIEssayButton.disabled = false;
            rangeInput.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
            additionalEssayRequirements.disabled = false;
            additionalEssayRequirementsButton.disabled = false;
        }
    });

    // Обработчик для кнопки "Сохранить"
    saveEssayButton.addEventListener('click', async () => {
        const taskText = essayTaskInput.value.trim();
        const conditions = getConditions();

        if (!taskText) {
            alert('Поле "Задание" не может быть пустым.');
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
                    task_type: 'essay',
                    task: taskText,
                    payloads: conditions,
                }),
            });

            const result = await response.json();

            if (result.success) {
                const taskHtml = generateTaskHtml(result.task);

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

                document.getElementById('overlay').style.display = 'none';
            } else {
                alert('Ошибка при сохранении данных.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке данных.');
        }
    });

    function getConditions() {
        const conditions = {};
        const conditionElements = conditionsContainer.querySelectorAll('.row.mb-2');

        conditionElements.forEach(conditionElement => {
            const textInput = conditionElement.querySelector('.condition-text-input');
            const pointsInput = conditionElement.querySelector('.condition-points-input');

            const text = textInput.value.trim();
            const points = parseInt(pointsInput.value.trim(), 10);

            if (text && !isNaN(points)) {
                conditions[text] = points; // Добавляем условие и баллы в объект
            }
        });

        // Возвращаем объект с title и conditions
        return {
            title: essayTaskInput.value.trim(), // Добавляем title
            conditions: conditions, // Добавляем условия
        };
    }

    // Функция для добавления условия с заданными значениями
    function addConditionWithValues(text = '', points = 0) {
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'row mb-2';

        conditionDiv.innerHTML = `
            <div class="col">
                <div class="row g-1 align-items-center">
                    <div class="col-9">
                        <input type="text" class="form-control condition-text-input" placeholder="Текст условия" value="${text}">
                    </div>
                    <div class="col-3">
                        <input type="number" class="form-control condition-points-input" placeholder="Баллы" value="${points}">
                    </div>
                </div>
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-danger remove-condition-button">×</button>
            </div>
        `;

        conditionsContainer.appendChild(conditionDiv);

        const removeButton = conditionDiv.querySelector('.remove-condition-button');
        removeButton.addEventListener('click', () => {
            conditionDiv.remove();
            updateRemoveConditionButtons();
        });

        updateRemoveConditionButtons();
    }

    // Функция для обновления видимости кнопок удаления условий
    function updateRemoveConditionButtons() {
        const removeButtons = document.querySelectorAll('.remove-condition-button');
        removeButtons.forEach(button => {
            button.style.display = conditionsContainer.children.length > 1 ? 'block' : 'none';
        });
    }

    function generateTaskHtml(task) {
        const conditionsHtml = Object.entries(task.content.conditions)
            .map(([text, points]) => `
                <div class="row g-3">
                    <div class="col-8 card shadow p-2 text-center">${text}</div>
                    <div class="col-4 card shadow p-2 text-center">${points} баллов</div>
                </div>
            `)
            .join('');

        return `
            <div class="task-item" id="task-${task.id}">
                <div class="essay-item">
                    <h3>${task.content.title}</h3>
                    ${conditionsHtml}
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="essay">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        `;
    }
}