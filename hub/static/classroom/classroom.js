// Common Functions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showToast(message) {
    const toastTemplate = document.getElementById('toast-template');
    const toastClone = toastTemplate.cloneNode(true);
    toastClone.removeAttribute('id');
    toastClone.querySelector('.toast-message').textContent = message;
    document.querySelector('.toast-container').appendChild(toastClone);
    const toast = new bootstrap.Toast(toastClone);
    toast.show();
    setTimeout(() => {
        toastClone.remove();
    }, 2000);
}

function sendMessage(type, receivers, payloads) {
    socket.send(JSON.stringify({
        'message_type': type,
        'sender': username,
        'payloads': payloads,
        'receivers': receivers,
    }));
}

async function saveUserAnswer(taskId, classroomId, payloads, request_type=null) {
    console.log('Saving user answer...');
    const url = '/hub/save_user_answer/';

    const studentSelector = document.querySelector('.student-selector');

    let selectedUserId;

    if (studentSelector) {
        selectedUserId = studentSelector.value;
    }
    console.log(taskId, classroomId, payloads, request_type, selectedUserId)

    const data = {
        task_id: taskId,
        classroom_id: classroomId,
        payloads: payloads,
        request_type: request_type,
        user_id: selectedUserId,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
        } else {
            const error = await response.json();
            console.error(error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}


// Invitation Functionality
function copyInvitationLink() {
    const linkInput = document.getElementById("invitationLink");
    linkInput.select();
    document.execCommand("copy");
}

document.getElementById("inviteStudentModal").addEventListener("show.bs.modal", function (event) {
    fetch(`/hub/invite/${classroomId}`)
        .then(response => response.json())
        .then(data => {
            const linkInput = document.getElementById("invitationLink");
            linkInput.value = data.invitation_url;
        });
});


// Section Management
document.addEventListener("DOMContentLoaded", function () {
    const sectionLinks = document.querySelectorAll('.section-link');
    const sections = document.querySelectorAll('.section-content');

    sectionLinks.forEach(link => {
        link.addEventListener('click', function () {
            const sectionId = link.getAttribute('data-section');
            sections.forEach(section => section.classList.add('d-none'));
            const activeSection = document.getElementById(`section-${sectionId}`);
            if (activeSection) {
                activeSection.classList.remove('d-none');
            }
            sectionLinks.forEach(item => item.classList.remove('fw-bold'));
            link.classList.add('fw-bold');
        });
    });
});


// WebSocket Communication
let socket = new WebSocket(`ws://${window.location.host}/ws/classroom/${classroomId}/`);

socket.onopen = function () {
    sendMessage('join', 'all', {});
};

socket.onmessage = function (event) {
    let data = JSON.parse(event.data);
    console.log('i reveived');
    if (data.message_type === "reset") {
        if (data.payloads.type === "match_words") {
            resetMatchWordsTask(data.payloads.task_id);
        } else if (data.payloads.type === "unscramble") {
            resetUnscrambleTask(data.payloads.task_id);
        }
    } else if (data.message_type === 'join') {
        showToast(`${data.sender} вошел в класс!`);
    } else if (data.message_type === 'match_pair') {
        const payloads = data.payloads;
        handlePairSelection(payloads.task_id, payloads.word, payloads.translation);
    } else if (data.message_type === "letter_selected") {
        let taskElement = document.getElementById(`task-${data.payloads.task_id}`);
        if (taskElement) {
            let emptySlot = taskElement.querySelector(".empty-slot");
            let letterButton = document.querySelector(`.letter-button:not([disabled])[data-letter='${data.payloads.letter}']`);

            if (emptySlot && letterButton) {
                emptySlot.textContent = data.payloads.letter;
                emptySlot.classList.remove("empty-slot");
                emptySlot.classList.add("active-slot");
                letterButton.disabled = true;
            }
        }
    } else if (data.message_type === 'unscramble_action' && data.sender !== username) {
        const payload = data.payloads;
        const taskId = payload.taskId;
        const wordIndex = payload.wordIndex;
        const letter = payload.letter;
        const action = payload.action;

        const taskElement = document.getElementById(`task-${taskId}`);
        if (!taskElement) return;

        const wordContainers = taskElement.querySelectorAll(".word-container");
        if (wordIndex >= wordContainers.length) return;

        const wordContainer = wordContainers[wordIndex];

        if (action === 'insert') {
            const button = wordContainer.querySelector(`.letter-button[data-letter="${letter}"]`);
            if (button) handleLetterClick(button, true);
        } else if (action === 'reset_word') {
            showWordAndReset(wordContainer);
        }
    } else if (data.message_type === 'FILL_BLANK_ANSWER') {
        const payload = data.payloads;
        const taskId = payload.taskId;
        const blankId = payload.blankId;
        const status = payload.status;

        // Находим контейнер задачи
        const taskElement = document.getElementById(`task-${taskId}`);
        if (!taskElement) return;

        // Находим input, соответствующий blankId
        const input = taskElement.querySelector(`.blank-input[data-blank-id="${blankId}"]`);
        if (!input) return;

        // Обновляем визуальное состояние
        if (status === 'completed') {
            input.classList.add('answered');
            input.disabled = true; // Блокируем редактирование
            input.value = data.payloads.answer;
        } else if (status === 'incorrect') {
            input.classList.add('incorrect-answer');
            input.value = data.payloads.answer;
            setTimeout(() => {
                input.disabled = false;
                input.classList.remove('incorrect-answer');
            }, 2000);
        } else if (status === 'reset') {
            input.classList.remove('answered');
            input.disabled = false;
            input.value = '';
        }
    } else if (data.message_type === 'TEST_ANSWER' && data.sender !== username) {
        const payload = data.payloads;
        const taskElement = document.getElementById(`task-${payload.taskId}`);
        if (taskElement) {
            const input = taskElement.querySelector(
                `input[data-question-id="${payload.questionId}"][data-answer-id="${payload.answerId}"]`
            );
            if (input) {
                input.checked = true;
            }
        }
    } else if (data.message_type === 'LABEL_IMAGE_ANSWER' && data.sender !== username) {
        const taskContainer = document.getElementById(`task-${data.payloads.taskId}`);
        if (taskContainer) {
            const input = taskContainer.querySelector(`.label-image[data-image-id="${data.payloads.imageId}"]`);
            if (input) {
                console.log(input);
                input.value = data.payloads.label;
                input.classList.remove('is-valid', 'is-invalid');
                input.classList.add(data.payloads.isCorrect ? 'is-valid' : 'is-invalid');
            }
        }
    } else if (data.message_type === 'CHECK_TRANSLATOR' && data.sender !== username) {
        const protection_elements = document.querySelectorAll('.protection-element');
        sendMessage(
            'CHECK_TRANSLATOR_RESULT',
            'all',
            {result: true},
        );
        protection_elements.forEach(element => {
            if (element.innerText !== 'protection element') {
                sendMessage(
                    'CHECK_TRANSLATOR_RESULT',
                    'all',
                    {result: false},
                );
                location.reload();
            }
        });
    } else if (data.message_type === 'CHECK_TRANSLATOR_RESULT') {
        const antitranslatorResult = document.querySelector('.antitranslator-result');
        if (data.payloads.result && antitranslatorResult) {
            antitranslatorResult.innerText = data.payloads.result ? 'Нарушений нет' : 'Страница ученика обновлена. Включите запрет копирования.';
        }
    } else if (data.message_type === 'COPYING_RIGHTS') {
        const isBlock = data.payloads.isBlock;
        console.log("Обработка COPYING_RIGHTS:", isBlock); // Отладка

        if (isBlock) {
            // Запрещаем копирование
            document.body.addEventListener('copy', function(event) {
                console.log("Копирование запрещено"); // Проверка, что обработчик срабатывает
                event.preventDefault(); // Предотвращаем копирование
            });
            console.log("Копирование запрещено установлено"); // Отладка
        } else {
            // Разрешаем копирование
            document.body.removeEventListener('copy', arguments.callee); // Удаляем обработчик
            console.log("Копирование разрешено"); // Отладка
        }
    } else {
        console.log(`Received message: ${JSON.stringify(data)}`);
    }

    const studentSelector = document.querySelector('.student-selector');
    if (studentSelector && data.payloads.task_id) {
        const taskContainer = document.getElementById(`task-${data.payloads.task_id}`);
        if (taskContainer) {
            const statContainer = taskContainer.querySelector('.stats-container');
            if (statContainer) {
                loadStats(data.payloads.task_id, statContainer, studentSelector.options[studentSelector.selectedIndex].text);
            }
        }
    }
};

socket.onerror = function (error) {
    console.error("Ошибка WebSocket:", error);
};

socket.onclose = function () {
    console.log("WebSocket закрыт");
};

function handleStudentSelection(selectedUserId, studentUsername) {
    const taskContainers = document.querySelectorAll(".task-item");

    if (!studentUsername) {
        const studentUsername = username;
    }

    taskContainers.forEach(taskContainer => {
        const taskId = taskContainer.id.replace("task-", "");
        const statContainer = taskContainer.querySelector(".stats-container");
        console.log(taskContainer.dataset.taskType);

        if (taskContainer.dataset.taskType === "match-words") {
            loadSavedTasks(taskContainer, "match-words", selectedUserId);
            loadStats(taskId, statContainer, studentUsername);
        } else if (taskContainer.dataset.taskType === "unscramble") {
            loadSavedTasks(taskContainer, "unscramble", selectedUserId);
            loadStats(taskId, statContainer, studentUsername);
        } else if (taskContainer.dataset.taskType === "fillblanks") {
            loadSavedTasks(taskContainer, "fill_blanks", selectedUserId);
        } else if (taskContainer.dataset.taskType === "test") {
            loadSavedTasks(taskContainer, "test", selectedUserId);
        }  else if (taskContainer.dataset.taskType === "label_images") {
            loadSavedTasks(taskContainer, "label_images", selectedUserId);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Проверяем, есть ли элемент выбора ученика (если пользователь — учитель)
    const studentSelector = document.querySelector('.student-selector');

    let selectedUserId;

    if (studentSelector) {
        const selectedUserId = studentSelector.value;
        const selectedUserName = studentSelector.options[studentSelector.selectedIndex].text;
        handleStudentSelection(selectedUserId, selectedUserName);
        studentSelector.addEventListener('change', function () {
            reset_all_tasks();
            const selectedUserId = studentSelector.value;
            const selectedUserName = studentSelector.options[studentSelector.selectedIndex].text;
            handleStudentSelection(selectedUserId, selectedUserName);
        });
    } else {
        handleStudentSelection();
    }
});


// Функция для загрузки сохраненных ответов
async function loadSavedTasks(taskContainer, type, selectedUserId) {
    const taskId = taskContainer.id.replace('task-', '');

    try {
        const response = await fetch(
            `/hub/get_solved_tasks/?task_id=${taskId}&classroom_id=${classroomId}&user_id=${selectedUserId}&type=${type}`
        );
        const data = await response.json();

        if (data.status === 'success') {
            if (type === 'match-words') {
                data.pairs.forEach(pair => {
                    // pair — это массив, где pair[0] — слово, pair[1] — перевод
                    handlePairSelection(taskId, pair[0], pair[1], false);
                });
                matchPairsScoreUpdate(taskId, data.score);
            } else if (type === 'unscramble') {
                insertWords(data.words, taskId);
            } else if (type === 'fill_blanks') {
                // Обработка для fill-blanks
                data.blanks.forEach(blank => {
                    const input = taskContainer.querySelector(`.blank-input[data-blank-id="${blank.blankId}"]`);
                    if (input) {
                        input.value = blank.answer; // Вставляем сохраненный ответ
                        // Имитация нажатия Enter с учетом флага isRemote
                        const event = new KeyboardEvent('blur');
                        event.isRemote = true; // Добавляем кастомное свойство
                        input.dispatchEvent(event);
                    }
                });
            } else if (type === 'test') {
                data.answers.forEach(answer => {
                    const input = taskContainer.querySelector(
                        `input[data-question-id="${answer.question_id}"][data-answer-id="${answer.answer_id}"]`
                    );
                    if (input) {
                        input.checked = true;
                    }
                });
            } else if (type === 'label_images') {
                // Обработка для label_images
                data.labels.forEach(label => {
                    const input = taskContainer.querySelector(`.label-input[data-image-id="${label.image_id}"]`);
                    if (input) {
                        input.value = label.label; // Вставляем сохраненный ответ
                        input.classList.remove('is-valid', 'is-invalid');
                        input.classList.add(label.is_correct ? 'is-valid' : 'is-invalid');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading saved tasks:', error);
    }
}

function loadStats(taskId, statContainer, currentUser) {
    console.log('Loading stats for task', taskId, currentUser);

    fetch(`/hub/get_stats/?task_id=${taskId}&classroom_id=${classroomId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const wrapper = statContainer.querySelector(".scroll-wrapper");
                const columnsContainer = statContainer.querySelector(".stats-columns");
                columnsContainer.innerHTML = "";

                let students = Object.entries(data.stat)
                    .map(([username, score]) => ({ username, score }))
                    .sort((a, b) => a.score - b.score); // Сортируем от меньшего к большему

                // Проверяем, есть ли хотя бы один ненулевой результат
                const hasNonZeroScores = students.some(student => student.score > 0);
                if (!hasNonZeroScores) {
                    statContainer.style.display = "none"; // Если все 0, скрываем блок
                    return;
                } else {
                    statContainer.style.display = "block"; // Показываем, если есть смысл
                }

                const maxScore = Math.max(...students.map(s => s.score), 1); // Находим лучший результат
                const containerHeight = 150; // Высота контейнера

                students.forEach(student => {
                    const barHeight = student.score > 0
                        ? Math.max((student.score / maxScore) * containerHeight, 5)
                        : 5;

                    const barColor = student.username === currentUser ? "bg-success" : "bg-primary";

                    const column = `
                        <div class="d-flex flex-column align-items-center text-center" style="width: 30%;">
                            <span class="text-muted small">${student.username}</span>
                            <div class="${barColor} text-white fw-bold rounded-top d-flex align-items-end justify-content-center"
                                 style="width: 100%; height: ${barHeight}px; border-radius: 10px 10px 0 0;">
                            </div>
                            <span class="small">${student.score}</span>
                        </div>
                    `;

                    columnsContainer.innerHTML += column;
                });

                // Если колонок больше 3, включаем скролл
                if (students.length > 3) {
                    wrapper.style.overflowX = "auto";
                    columnsContainer.style.minWidth = `${students.length * 30}%`;
                } else {
                    wrapper.style.overflowX = "hidden";
                    columnsContainer.style.minWidth = "100%";
                }
            }
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

function reset_all_tasks() {
    const taskContainers = document.querySelectorAll('.task-item');
    taskContainers.forEach(taskContainer => {
        const taskId = taskContainer.id.replace('task-', '');
        if (taskContainer.dataset.taskType === 'match-words') {
            resetMatchWordsTask(taskId);
        } else if (taskContainer.dataset.taskType === 'unscramble') {
            resetUnscrambleTask(taskId);
        } else if (taskContainer.dataset.taskType === 'fill-blanks') {
            resetFillBlanksTask(taskId);
        } else if (taskContainer.dataset.taskType === 'test') {
            resetTestTask(taskId);
        } else if (taskContainer.dataset.taskType === 'label_images') {
            resetLabelImagesTask(taskId);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const taskContainers = document.querySelectorAll('.task-item');
    taskContainers.forEach(taskContainer => {
        const button = taskContainer.querySelector(".reset-button");
        if (button) {
            button.addEventListener("click", () => {
                const taskId = taskContainer.id.replace("task-", "");

                // Отправляем сообщение о сбросе
                sendMessage('reset', 'all', {
                    task_id: taskId,
                    classroom_id: classroomId,
                    type: taskContainer.dataset.taskType,
                });

                // Сохраняем состояние сброса
                saveUserAnswer(taskId, classroomId, {}, "reset");
            })
        }
    });

    const contextButtons = document.querySelectorAll('.add-context-btn');
    contextButtons.forEach(button => {
        button.style.display = "none";
    });
});



// Функции защиты от списывания
const antitranslatorSelect = document.getElementById('antitranslator');
if (antitranslatorSelect) {
    antitranslatorSelect.addEventListener('change', function(event) {
        const selectedValue = event.target.value;
        if (selectedValue === 'check') {
            sendMessage("CHECK_TRANSLATOR", 'all', {}); // Отправка сообщения для проверки на списывание
            console.log("Проверка на списывание...");
        }
    });
}

const anticopyingSelect = document.getElementById('anticopying');
if (anticopyingSelect) {
    anticopyingSelect.addEventListener('change', function(event) {
        const selectedValue = event.target.value;
        if (selectedValue === 'block') {
            sendMessage("COPYING_RIGHTS", 'all', { isBlock: true }); // Запретить копирование
            console.log("Копирование запрещено");
        } else if (selectedValue === 'allow') {
            sendMessage("COPYING_RIGHTS", 'all', { isBlock: false }); // Разрешить копирование
            console.log("Копирование разрешено");
        }
    });
}


function toggleEmbed(button, embedCode) {
    const wrapper = button.closest('.embed-wrapper');
    const iframeContainer = wrapper.querySelector('.embed-container');
    const iframe = iframeContainer.querySelector('iframe');

    // Показываем контейнер и скрываем кнопку
    iframeContainer.classList.remove('d-none');
    button.classList.add('d-none');

    // Извлекаем URL из iframe-кода
    const srcMatch = embedCode.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
        iframe.src = srcMatch[1];
        iframe.classList.add('vh-100', 'w-100');
    }
}

function closeEmbed(button) {
    const iframeContainer = button.closest('.embed-container');
    const iframe = iframeContainer.querySelector('iframe');
    const wrapper = iframeContainer.closest('.embed-wrapper');
    const launchButton = wrapper.querySelector('button.btn-primary');

    // Очищаем и скрываем iframe
    iframe.src = '';
    iframeContainer.classList.add('d-none');

    // Показываем кнопку запуска
    launchButton.classList.remove('d-none');
}