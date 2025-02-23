document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".letter-button").forEach(button => {
        const taskItem = button.closest(".task-item");
        const taskId = taskItem.id.replace("task-", "");

        button.addEventListener("click", function() {
            const wordContainer = this.closest(".word-container");
            const emptySlot = wordContainer.querySelector(".empty-slot");
            const expectedLetter = emptySlot?.dataset.expected;
            const crossIcons = wordContainer.querySelectorAll(".bi-x-circle");
            const errorCount = parseInt(wordContainer.dataset.errors || 0);

            if (emptySlot && expectedLetter) {
                // Проверяем корректность буквы
                if (this.dataset.letter === expectedLetter) {
                    // Правильный ввод
                    emptySlot.textContent = this.dataset.letter;
                    emptySlot.classList.remove("empty-slot");
                    emptySlot.classList.add("active-slot");
                    this.disabled = true;

                    // Проверяем завершение слова
                    if (!wordContainer.querySelector(".empty-slot")) {
                        wordContainer.querySelector(".word-fields").classList.add("bg-success", "bg-opacity-25");
                        wordContainer.querySelectorAll(".letter-button").forEach(btn => btn.disabled = true);
                    }

                    // Сохранение прогресса
                    saveUserAnswer(taskId, classroomId, {
                        letter: this.dataset.letter,
                        word_index: Array.from(taskItem.querySelectorAll(".word-container")).indexOf(wordContainer)
                    });
                } else {
                    // Неправильный ввод
                    wordContainer.dataset.errors = errorCount + 1;

                    // Анимация ошибки
                    crossIcons[errorCount].classList.add("text-danger");
                    emptySlot.classList.add("invalid");

                    emptySlot.textContent = "";
                    emptySlot.classList.add("empty-slot");
                    emptySlot.classList.remove("active-slot");
                    this.disabled = false;

                    // Обработка трех ошибок
                    if (errorCount + 1 >= 3) {
                        showWordAndReset(wordContainer);
                        saveUserAnswer(taskId, classroomId, {
                                letter: this.dataset.letter,
                                word_index: Array.from(taskItem.querySelectorAll(".word-container")).indexOf(wordContainer)
                            }, "reset_word")
                    }
                }
            }
        });
    });
});

function insertWords(words, taskId) {
    console.log(words);
    const taskElement = document.getElementById(`task-${taskId}`);
    if (!taskElement) return;

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

    // Показываем правильное слово
    slots.forEach((slot, index) => {
        slot.textContent = originalWord[index];
        slot.classList.remove("empty-slot");
        slot.classList.add("active-slot");
        slot.classList.add("bg-success", "bg-opacity-25");
    });

    setTimeout(() => {
        // Сбрасываем состояние
        slots.forEach(slot => {
            slot.textContent = "";
            slot.classList.remove("active-slot");
            slot.classList.add("empty-slot");
            slot.classList.remove("bg-success", "bg-opacity-25", "invalid");
        });

        // Восстанавливаем кнопки
        wordContainer.querySelectorAll(".letter-button").forEach(btn => {
            btn.disabled = false;
        });

        // Сбрасываем крестики
        wordContainer.dataset.errors = 0;
        wordContainer.querySelectorAll(".bi-x-circle").forEach(icon => {
            icon.classList.remove("text-danger");
        });
    }, 3000);
}