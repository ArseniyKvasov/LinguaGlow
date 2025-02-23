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
    const data = {
        task_id: taskId,
        classroom_id: classroomId,
        payloads: payloads,
        request_type: request_type,
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
    if (data.message_type === "reset") {
        if (data.payloads.type === "match_words") {
            resetMatchWordsTask(data.payloads.task_id);
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
            let letterButton = taskElement.querySelector(`.letter-button[data-letter='${data.payloads.letter}']`);

            if (emptySlot && letterButton) {
                emptySlot.textContent = data.payloads.letter;
                emptySlot.classList.remove("empty-slot");
                letterButton.disabled = true;
            }
        }
    } else {
        console.log(`Received message: ${JSON.stringify(data)}`);
    }
};

socket.onerror = function (error) {
    console.error("Ошибка WebSocket:", error);
};

socket.onclose = function () {
    console.log("WebSocket закрыт");
};


// Функция для загрузки сохраненных ответов
async function loadSavedTasks(taskContainer, type) {
    const taskId = taskContainer.id.replace('task-', '');

    try {
        const response = await fetch(
            `/hub/get_solved_tasks/?task_id=${taskId}&classroom_id=${classroomId}&user_id=${userId}&type=${type}`
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
            }
        }
    } catch (error) {
        console.error('Error loading saved tasks:', error);
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    const taskContainers = document.querySelectorAll(".task-item");
    taskContainers.forEach(taskContainer => {
        if (taskContainer.dataset.taskType === "match-words") {
            addMatchWordsButtonsListeners(taskContainer);
            loadSavedTasks(taskContainer, 'match-words');
        } else if (taskContainer.dataset.taskType === "unscramble") {
            loadSavedTasks(taskContainer, 'unscramble');
        }
    });
});

