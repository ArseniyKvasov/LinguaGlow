from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
import uuid


class course(models.Model):
    STUDENT_LEVEL_CHOICES = (
        ("starter", "Starter"),
        ("elementary", "Elementary"),
        ("pre_intermediate", "Pre-Intermediate"),
        ("intermediate", "Intermediate"),
        ("upper_intermediate", "Upper-Intermediate"),
        ("advanced", "Advanced"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)  # Название курса
    description = models.TextField(blank=True, null=True)  # Описание курса
    student_level = models.CharField(max_length=20, choices=STUDENT_LEVEL_CHOICES, default="starter")  # Уровень ученика
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courses")  # Автор курса
    created_at = models.DateTimeField(auto_now_add=True)  # Дата создания курса
    updated_at = models.DateTimeField(auto_now=True)  # Дата последнего обновления

    def __str__(self):
        return self.name


class lesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(course, on_delete=models.CASCADE, related_name="lessons")  # Привязка урока к курсу
    name = models.CharField(max_length=255)  # Название урока
    description = models.TextField(blank=True, null=True)  # Описание урока
    lexical_topics = models.TextField(blank=True, null=True)  # Лексические темы
    grammar_topics = models.TextField(blank=True, null=True)  # Грамматические темы
    extra_topics = models.TextField(blank=True, null=True)  # Дополнительные темы
    created_at = models.DateTimeField(auto_now_add=True)  # Дата создания урока
    updated_at = models.DateTimeField(auto_now=True)  # Дата последнего обновления

    def __str__(self):
        return f"{self.name} (Course: {self.course.name})"


class section(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(lesson, on_delete=models.CASCADE, related_name="sections")  # Привязка секции к уроку
    name = models.CharField(max_length=255)  # Название секции
    topic = models.CharField(max_length=255)  # Тема секции
    order = models.PositiveIntegerField()  # Порядковый номер секции внутри урока

    class Meta:
        ordering = ["order"]  # Автоматическая сортировка секций по их порядковому номеру

    def __str__(self):
        return f"{self.name} (Lesson: {self.lesson.name})"

class task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey('section', on_delete=models.CASCADE, related_name="tasks")
    order = models.PositiveIntegerField()  # Порядок задания в секции

    # Поля для GenericForeignKey
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Task {self.id} in Section {self.section.name}"

# Список слов
class wordList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, null=True)
    words = models.JSONField()  # Список слов в формате JSON

    def __str__(self):
        return f"Word List: {self.title}"

# Соотнести слово с переводом
class matchUpTheWords(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pairs = models.JSONField()  # Пары слов в формате JSON

    def __str__(self):
        return f"Match Up The Words: {self.id}"

# Эссе
class essay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    answer = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Essay: {self.question}"

# Заметка
class note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField()

    def __str__(self):
        return f"Note: {self.content[:50]}..."

# Картинка
class image(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField()
    caption = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Image: {self.caption}"

# Распределить по колонкам
class sortIntoColumns(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    columns = models.JSONField()  # Колонки и их элементы в формате JSON

    def __str__(self):
        return f"Sort Into Columns: {self.id}"

# Составить предложение в правильном порядке
class makeASentence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    words = models.JSONField()  # Слова для составления предложения

    def __str__(self):
        return f"Make A Sentence: {self.id}"

# Составить слово
class unscramble(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scrambled_word = models.CharField(max_length=255)
    correct_word = models.CharField(max_length=255)

    def __str__(self):
        return f"Unscramble: {self.scrambled_word}"

# Заполнить пропуски словами из списка
class fillInTheBlanksFromTheList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    options = models.JSONField()  # Список слов для заполнения пропусков

    def __str__(self):
        return f"Fill In The Blanks From The List: {self.id}"

# Заполнить пропуски подходящими словами
class fillInTheBlanksWithSuitableWords(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()

    def __str__(self):
        return f"Fill In The Blanks With Suitable Words: {self.id}"

# Диалог
class dialogue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lines = models.JSONField()  # Реплики диалога в формате JSON

    def __str__(self):
        return f"Dialogue: {self.id}"

# Статья
class article(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()

    def __str__(self):
        return f"Article: {self.title}"

# Аудио
class audio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audio_url = models.URLField()
    transcript = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Audio: {self.audio_url}"

# Тест
class test(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    questions = models.JSONField()  # Вопросы и варианты ответов в формате JSON

    def __str__(self):
        return f"Test: {self.id}"

# Правда или ложь
class trueOrFalse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statements = models.JSONField()  # Утверждения и их правильность в формате JSON

    def __str__(self):
        return f"True Or False: {self.id}"

# Подписать картинку
class labelThePicture(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField()
    labels = models.JSONField()  # Метки для картинки в формате JSON

    def __str__(self):
        return f"Label The Picture: {self.id}"

# Филворд
class wordSearch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grid = models.JSONField()  # Сетка филворда
    words = models.JSONField()  # Слова для поиска

    def __str__(self):
        return f"Word Search: {self.id}"