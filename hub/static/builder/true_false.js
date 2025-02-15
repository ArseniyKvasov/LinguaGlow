export function init(taskData = null, selectedTasksData = null) {
    const trueFalseContainer = document.getElementById('trueFalseTaskFormContainer');
    const addQuestionButton = document.getElementById('addTrueFalseQuestionButton');
    const saveTrueFalseButton = document.getElementById('saveTrueFalseTaskButton');
    const questionList = document.getElementById('trueFalseQuestionsContainer');

    function createQuestionBlock(questionData = null) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-block my-2';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex align-items-center mt-2 justify-content-end';

        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.className = 'form-control';
        questionInput.placeholder = 'Введите вопрос';
        questionInput.value = questionData ? DOMPurify.sanitize(questionData.question) : '';
        questionDiv.appendChild(questionInput);

        const answerContainer = document.createElement('div');
        answerContainer.className = 'answer-container';

        const trueCheckbox = document.createElement('input');
        trueCheckbox.type = 'checkbox';
        trueCheckbox.id = `true-${questionDiv.dataset.index}`;
        trueCheckbox.className = 'me-2';
        trueCheckbox.checked = questionData ? questionData.trueAnswer : false;
        trueCheckbox.addEventListener('change', () => {
            if (trueCheckbox.checked) {
                falseCheckbox.checked = false;
            }
        });

        const trueLabel = document.createElement('label');
        trueLabel.htmlFor = `true-${questionDiv.dataset.index}`;
        trueLabel.textContent = 'Правда';
        answerContainer.appendChild(trueCheckbox);
        answerContainer.appendChild(trueLabel);

        const falseCheckbox = document.createElement('input');
        falseCheckbox.type = 'checkbox';
        falseCheckbox.id = `false-${questionDiv.dataset.index}`;
        falseCheckbox.className = 'me-2';
        falseCheckbox.checked = questionData ? questionData.falseAnswer : false;
        falseCheckbox.addEventListener('change', () => {
            if (falseCheckbox.checked) {
                trueCheckbox.checked = false;
            }
        });

        const falseLabel = document.createElement('label');
        falseLabel.htmlFor = `false-${questionDiv.dataset.index}`;
        falseLabel.textContent = 'Ложь';
        answerContainer.appendChild(falseCheckbox);
        answerContainer.appendChild(falseLabel);

        const removeQuestionBtn = document.createElement('button');
        removeQuestionBtn.className = 'btn btn-danger btn-sm';
        removeQuestionBtn.innerHTML = '×';
        removeQuestionBtn.onclick = () => questionDiv.remove();
        buttonContainer.appendChild(removeQuestionBtn);

        questionDiv.appendChild(buttonContainer);
        questionDiv.appendChild(answerContainer);
        questionList.appendChild(questionDiv);
    }

    if (taskData) {
        taskData.questions.forEach(q => createQuestionBlock(q));
    } else {
        createQuestionBlock();
    }

    addQuestionButton.onclick = () => {
        createQuestionBlock();
    };

    saveTrueFalseButton.onclick = async () => {
        const questions = [];
        document.querySelectorAll('.question-block').forEach(qBlock => {
            const question = qBlock.querySelector('input[type=text]').value.trim();
            if (!question) return;

            const trueAnswer = qBlock.querySelector(`input[id^='true-']`).checked;
            const falseAnswer = qBlock.querySelector(`input[id^='false-']`).checked;

            if (!trueAnswer && !falseAnswer) {
                alert('Выберите правильный ответ для каждого вопроса');
                return;
            }

            questions.push({ question: DOMPurify.sanitize(question), trueAnswer, falseAnswer });
        });

        if (questions.length === 0) {
            alert('Добавьте хотя бы один вопрос');
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
                    task_type: 'true_false',
                    payloads: { questions }
                }),
            });

            const result = await response.json();
            if (result.success) {
                const taskHtml = createTrueFalseHtml(result.task);

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
    };
}

function createTrueFalseHtml(task) {
    return `
        <div class="task-item" id="task-${task.id}">
            <div class="true-false-item">
                <div class="questions-list">
                    ${task.content.questions && task.content.questions.length > 0
                        ? `<ul class="list-group">
                            ${task.content.questions.map(question => `
                                <li class="list-group-item">
                                    <strong>${escapeHtml(question.question)}</strong>
                                    <p class="mt-2">${question.trueAnswer ? 'Правда' : 'Ложь'}</p>
                                </li>
                            `).join("")}
                        </ul>`
                        : "<p>Вопросы не заданы.</p>"
                    }
                </div>

                <div class="mt-3">
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="true_false">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        </div>
    `;
}

// Экранирование HTML
function escapeHtml(unsafe) {
    return unsafe?.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") || '';
}