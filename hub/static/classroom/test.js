document.querySelectorAll(".letter-button").forEach(button => {
    button.addEventListener("click", function() {
        handleLetterClick(this, false);
    });
});

function handleLetterClick(button, isRemote = false) {
    const wordContainer = button.closest(".word-container");
    const taskItem = button.closest(".task-item");
    const taskId = taskItem.id.replace("task-", "");
    const wordIndex = Array.from(taskItem.querySelectorAll(".word-container")).indexOf(wordContainer);
    const emptySlot = wordContainer.querySelector(".empty-slot");
    const expectedLetter = emptySlot?.dataset.expected;
    const crossIcons = wordContainer.querySelectorAll(".bi-x-circle");
    const errorCount = parseInt(wordContainer.dataset.errors || 0);

    if (emptySlot && expectedLetter) {
        if (button.dataset.letter === expectedLetter) {
            emptySlot.textContent = button.dataset.letter;
            emptySlot.classList.remove("empty-slot");
            emptySlot.classList.add("active-slot");
            button.disabled = true;

            if (!wordContainer.querySelector(".empty-slot")) {
                wordContainer.querySelectorAll(".active-slot").forEach(slot => {
                    slot.classList.add("bg-success", "bg-opacity-25");
                });
                wordContainer.querySelectorAll(".letter-button").forEach(btn => {
                    btn.disabled = true;
                });
            }

            if (!isRemote) {
                saveUserAnswer(taskId, classroomId, {
                    letter: button.dataset.letter,
                    word_index: wordIndex
                });
                sendMessage('unscramble_action', 'all', {
                    taskId: taskId,
                    wordIndex: wordIndex,
                    letter: button.dataset.letter,
                    action: 'insert'
                });
            }
        } else {
            wordContainer.dataset.errors = errorCount + 1;
            crossIcons[errorCount].classList.add("text-danger");
            emptySlot.classList.add("invalid");

            emptySlot.textContent = "";
            button.disabled = false;

            if (!isRemote) {
                sendMessage('unscramble_action', 'all', {
                    taskId: taskId,
                    wordIndex: wordIndex,
                    letter: button.dataset.letter,
                    action: 'insert'
                });

                if (errorCount + 1 >= 3) {
                    sendMessage('unscramble_action', 'all', {
                        taskId: taskId,
                        wordIndex: wordIndex,
                        action: 'reset'
                    });
                }
            }

            if (errorCount + 1 >= 3) {
                showWordAndReset(wordContainer);
                if (!isRemote) {
                    saveUserAnswer(taskId, classroomId, {
                        letter: button.dataset.letter,
                        word_index: wordIndex
                    }, "reset_word");
                }
            }
        }
    }
}

function insertWords(words, taskId) {
    const taskElement = document.getElementById(`task-${taskId}`);
    if (!taskElement) return;

    taskElement.querySelector(".reset-button").addEventListener("click", () => {
        const taskId = taskElement.id.replace("task-", "");

        // Отправляем сообщение о сбросе
        sendMessage('reset', 'all', {
            task_id: taskId,
            classroom_id: classroomId,
            type: 'unscramble'
        });

        // Сохраняем состояние сброса
        saveUserAnswer(taskId, classroomId, {}, "reset");
    });

    const wordContainers = taskElement.querySelectorAll(".word-container");

    words.forEach((wordData, wordIndex) => {
        if (wordIndex >= wordContainers.length) return;

        const wordContainer = wordContainers[wordIndex];
        const emptySlots = wordContainer.querySelectorAll(".empty-slot");
        const letterButtons = wordContainer.querySelectorAll(".letter-button");
        const crossIcons = wordContainer.querySelectorAll(".bi-x-circle");

        // Сбрасываем ошибки и крестики
        wordContainer.dataset.errors = 0;
        crossIcons.forEach(icon => icon.classList.remove("text-danger"));

        wordData.letters.forEach((letter, letterIndex) => {
            if (letterIndex < emptySlots.length) {
                const emptySlot = emptySlots[letterIndex];
                const expectedLetter = emptySlot.dataset.expected;

                // Если буква введена
                if (letter) {
                    // Проверяем, совпадает ли введённая буква с ожидаемой
                    if (letter === expectedLetter) {
                        // Отключаем кнопку с правильной буквой
                        const button = [...letterButtons].find(btn => btn.dataset.letter === letter && !btn.disabled);
                        if (button) button.disabled = true;
                        emptySlot.textContent = letter;
                        emptySlot.classList.remove("empty-slot");
                        emptySlot.classList.add("active-slot");

                        // Проверяем завершение слова
                        if (wordContainer && !wordContainer.querySelector(".empty-slot")) {
                            const slots = wordContainer.querySelectorAll(".active-slot");
                            slots.forEach(slot => {
                                slot.classList.add("bg-success", "bg-opacity-25");
                            });
                            wordContainer.querySelectorAll(".letter-button").forEach(btn => {
                                btn.disabled = true;
                            });
                        }
                    } else {
                        // Неправильная буква: увеличиваем счётчик ошибок и подсвечиваем крестик
                        const errorCount = parseInt(wordContainer.dataset.errors || 0);
                        wordContainer.dataset.errors = errorCount + 1;

                        if (crossIcons[errorCount]) {
                            crossIcons[errorCount].classList.add("text-danger");
                        }

                        // Если ошибок 3, сбрасываем слово
                        if (errorCount + 1 >= 3) {
                            showWordAndReset(wordContainer);
                        }
                    }
                }
            }
        });
    });
}

function showWordAndReset(wordContainer) {
    const slots = wordContainer.querySelectorAll(".empty-slot, .active-slot");
    const originalWord = wordContainer.querySelector(".word-fields").dataset.word;

    slots.forEach((slot, index) => {
        slot.textContent = originalWord[index];
        slot.classList.add("bg-success", "bg-opacity-25");
        slot.classList.remove("empty-slot", "invalid");
    });

    setTimeout(() => {
        slots.forEach(slot => {
            slot.textContent = "";
            slot.classList.add("empty-slot");
            slot.classList.remove("active-slot", "bg-success", "bg-opacity-25");
        });
        wordContainer.querySelectorAll(".letter-button").forEach(btn => {
            btn.disabled = false;
        });
        wordContainer.querySelectorAll(".bi-x-circle").forEach(icon => {
            icon.classList.remove("text-danger");
        });
        wordContainer.dataset.errors = 0;
    }, 3000);
}

function resetUnscrambleTask(taskId) {
    const taskElement = document.getElementById(`task-${taskId}`);
    if (!taskElement) return;

    // Сбрасываем все слова в задании
    taskElement.querySelectorAll(".word-container").forEach(wordContainer => {
        const slots = wordContainer.querySelectorAll(".empty-slot, .active-slot");
        const letterButtons = wordContainer.querySelectorAll(".letter-button");
        const crossIcons = wordContainer.querySelectorAll(".bi-x-circle");

        // Очищаем поля
        slots.forEach(slot => {
            slot.textContent = "";
            slot.classList.remove("active-slot", "bg-success", "bg-opacity-25", "invalid");
            slot.classList.add("empty-slot");
        });

        // Включаем все кнопки
        letterButtons.forEach(button => {
            button.disabled = false;
        });

        // Сбрасываем крестики
        crossIcons.forEach(icon => {
            icon.classList.remove("text-danger");
        });

        // Сбрасываем счётчик ошибок
        wordContainer.dataset.errors = 0;
    });
}