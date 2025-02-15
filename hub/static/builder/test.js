export function init(taskData = null, selectedTasksData = null) {
    const testContainer = document.getElementById('testTaskFormContainer');
    const addQuestionButton = document.getElementById('addQuestionButton');
    const saveTestButton = document.getElementById('saveTestTaskButton');
    const questionList = document.getElementById('questionsContainer');
    const AITestButton = document.getElementById('AITestButton');
    const AITestBlock = document.getElementById('AITestBlock');
    const testTopic = AITestBlock.querySelector('#testTopic');
    const testRequirements = AITestBlock.querySelector('#testRequirements');
    const testQuestionCountRange = AITestBlock.querySelector('#testQuestionCountRange');
    const testQuestionCountValue = AITestBlock.querySelector('#testQuestionCountValue');
    const aiGenerationOptions = AITestBlock.querySelectorAll('input[name="ai-generation-option"]');
    const generateAITestButton = document.getElementById('generateAITestButton');

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

        const answerList = document.createElement('div');
        answerList.className = 'answer-list';
        questionDiv.appendChild(answerList);

        function createAnswerBlock(answerData = null) {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-block d-flex align-items-center mb-2'; // Flexbox для выравнивания по одной линии

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = answerData ? answerData.correct : false;
            checkbox.className = 'me-2'; // Добавляем небольшой отступ справа
            answerDiv.appendChild(checkbox);

            const answerInput = document.createElement('input');
            answerInput.type = 'text';
            answerInput.className = 'form-control me-2'; // Отступ справа для кнопки
            answerInput.placeholder = 'Введите вариант ответа';
            answerInput.value = answerData ? DOMPurify.sanitize(answerData.answer) : '';
            answerDiv.appendChild(answerInput);

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '&times;'; // Символ "×"
            deleteButton.className = 'btn btn-danger btn-sm'; // Красная маленькая кнопка
            deleteButton.addEventListener('click', () => answerDiv.remove());
            answerDiv.appendChild(deleteButton);

            deleteButton.addEventListener('click', () => {
                answerDiv.remove();
                updateDeleteButtons(answerList);
            });

            answerList.appendChild(answerDiv);
            updateDeleteButtons(answerList); // Обновляем видимость крестиков
        }

        for (let i = 0; i < (questionData ? questionData.answers.length : 3); i++) {
            createAnswerBlock(questionData ? questionData.answers[i] : null);
        }

        const addAnswerBtn = document.createElement('button');
        addAnswerBtn.className = 'btn btn-primary me-2 add-answer';
        addAnswerBtn.textContent = 'Добавить вариант ответа';
        addAnswerBtn.onclick = () => createAnswerBlock();
        buttonContainer.appendChild(addAnswerBtn);

        const removeQuestionBtn = document.createElement('button');
        removeQuestionBtn.className = 'btn btn-danger btn-sm';
        removeQuestionBtn.innerHTML = '🗑';
        removeQuestionBtn.onclick = () => questionDiv.remove();
        buttonContainer.appendChild(removeQuestionBtn);

        questionDiv.appendChild(buttonContainer);
        questionList.appendChild(questionDiv);
    }

    function updateDeleteButtons(answerList) {
        const deleteButtons = answerList.querySelectorAll('.btn-danger');
        deleteButtons.forEach(btn => {
            btn.style.display = deleteButtons.length > 2 ? 'inline-block' : 'none';
        });
    }


    if (taskData) {
        taskData.questions.forEach(q => createQuestionBlock(q));
    } else {
        createQuestionBlock();
    }

    addQuestionButton.onclick = () => {
        const lastQuestion = questionList.lastElementChild;
        const answerCount = lastQuestion ? Math.max(2, lastQuestion.querySelectorAll('.answer-list > div').length) : 3;
        createQuestionBlock({ question: '', answers: Array(answerCount).fill({ answer: '', correct: false }) });
    };

    saveTestButton.onclick = async () => {
        const questions = [];
        document.querySelectorAll('.question-block').forEach(qBlock => {
            const question = qBlock.querySelector('input[type=text]').value.trim();
            if (!question) return;

            const answers = [];
            qBlock.querySelectorAll('.answer-block').forEach(aBlock => {
                const answer = aBlock.querySelector('input[type=text]').value.trim();
                const correct = aBlock.querySelector('input[type=checkbox]').checked;
                if (answer) answers.push({ answer: DOMPurify.sanitize(answer), correct });
            });

            if (answers.length < 2) {
                alert('Каждый вопрос должен иметь минимум 2 варианта ответа');
                return;
            }

            questions.push({ question: DOMPurify.sanitize(question), answers });
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
                    task_type: 'test',
                    payloads: { questions }
                }),
            });

            const result = await response.json();
            if (result.success) {
                const taskHtml = createTestHtml(result.task);

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

    AITestButton.addEventListener('click', () => {
        console.log('AITestButton clicked');
        AITestBlock.style.display = 'block';
        AITestBlock.scrollIntoView({ behavior: 'smooth' });
        testTopic.focus();
    });

    generateAITestButton.addEventListener('click', async () => {
        generateAITestButton.disabled = true;
        testTopic.disabled = true;
        testRequirements.disabled = true;
        testQuestionCountRange.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });

        try {
            const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;
            if (selectedOption === 'first' && testTopic.value.trim() === '') {
                alert('Придумайте тему');
                return;
            }
            const topic = testTopic.value.trim();
            const requirements = testRequirements.value.trim();
            const questionCount = testQuestionCountRange.value;
            const questionTypes = [];

            const payload = {
                'topic': topic,
                'requirements': requirements,
                'question_count': questionCount,
                'selectedTasksData': (selectedOption === 'selected' ? selectedTasksData : ''),
            };

            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'test',
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

                const test = JSON.parse(result.result);

                // Обработка данных и вызов функции createQuestionBlock
                test.forEach((questionData) => {
                    // Преобразуем ответы в нужный формат
                    const answers = Object.entries(questionData.options).map(([key, value]) => ({
                        answer: value,
                        correct: questionData.correct_option === key
                    }));
                    shuffleArray(answers);

                    // Создаем блок вопроса
                    createQuestionBlock({
                        question: questionData.question_title,
                        answers: answers
                    });
                });
                AITestBlock.style.display = 'none';
                saveTestButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAITestButton.disabled = false;
            testTopic.disabled = false;
            testRequirements.disabled = false;
            testQuestionCountRange.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
        }
    });

    // Обновление значения количества вопросов при изменении ползунка
    testQuestionCountRange.addEventListener('input', (event) => {
        testQuestionCountValue.textContent = event.target.value;
    });


}

function createTestHtml(task) {
    return `
        <div class="task-item" id="task-${task.id}">
            <div class="test-item">
                <div class="questions-list">
                    ${task.content.questions && task.content.questions.length > 0
                        ? `<ul class="list-group">
                            ${task.content.questions.map(question => `
                                <li class="list-group-item">
                                    <strong>${escapeHtml(question.question)}</strong>
                                    <ul class="list-group mt-2">
                                        ${question.answers.map(answer => `
                                            <li class="list-group-item ${answer.correct ? 'list-group-item-success' : 'list-group-item-secondary'}">
                                                ${escapeHtml(answer.answer)}
                                            </li>`).join("")}
                                    </ul>
                                </li>`).join("")}
                        </ul>`
                        : "<p>Вопросы не заданы.</p>"
                    }
                </div>

                <div class="mt-3">
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="test">Редактировать</button>
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
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") || '';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}