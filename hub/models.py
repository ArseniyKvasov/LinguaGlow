from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
import uuid
import bleach


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
        abstract = True
        ordering = ["order"]

    def __str__(self):
        return f"Task {self.id} in Section {self.section.name}"

# Список слов
class wordList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Word List")
    words = models.JSONField()  # Список слов в формате JSON

    def __str__(self):
        return f"Word List: {self.title}"

# Соотнести слово с переводом
class matchUpTheWords(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Match Up The Words")
    pairs = models.JSONField()  # Пары слов в формате JSON

    def __str__(self):
        return f"Match Up The Words: {self.id}"

# Эссе
class essay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    conditions = models.JSONField(null=True)

    def __str__(self):
        return f"Essay: {self.title}"

# Заметка
class note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Note")
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
    title = models.CharField(max_length=255, default="Sort Into Columns")
    columns = models.JSONField()  # Колонки и их элементы в формате JSON

    def __str__(self):
        return f"Sort Into Columns: {self.id}"

# Составить предложение в правильном порядке
class makeASentence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Make A Sentence")
    sentences = models.JSONField()

    def __str__(self):
        return f"Make A Sentence: {self.id}"

# Составить слово
class unscramble(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Unscramble")
    words = models.JSONField()

    def __str__(self):
        return f"Unscramble: {self.words}"

# Заполнить пропуски
class fillInTheBlanks(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Fill In The Blanks")
    text = models.TextField()

    DISPLAY_FORMAT_CHOICES = [
        ('with_list', 'With list'),
        ('without_list', 'Without list'),
    ]

    display_format = models.CharField(
        max_length=20,
        choices=DISPLAY_FORMAT_CHOICES,
        default='with_list',  # Значение по умолчанию
    )

    def __str__(self):
        return f"Fill In The Blanks: {self.id}"

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
class labelImages(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_urls = models.ManyToManyField('imageUsage', through='labelImageOrder', related_name='label_images')
    labels = models.JSONField()

    def __str__(self):
        return f"Label Images: {self.id}"

class imageUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField(unique=True)
    usage_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Image: {self.id} ({self.image_url})"

class labelImageOrder(models.Model):
    label_image = models.ForeignKey(labelImages, on_delete=models.CASCADE)
    image_usage = models.ForeignKey(imageUsage, on_delete=models.CASCADE)
    order = models.PositiveIntegerField()  # Это поле будет хранить порядок

    class Meta:
        ordering = ['order']  # Гарантирует порядок изображений

    def __str__(self):
        return f"Order {self.order} for Image {self.image_usage.id}"

# Quizlet и WordWall
class EmbeddedTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    embed_code = models.TextField()  # Здесь будет храниться HTML-код iframe

    def save(self, *args, **kwargs):
        allowed_tags = ['iframe']  # Разрешаем только iframe
        allowed_attrs = {
            'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen']
        }

        self.embed_code = bleach.clean(self.embed_code, tags=allowed_tags, attributes=allowed_attrs)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


# Филворд
class wordSearch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grid = models.JSONField()  # Сетка филворда
    words = models.JSONField()  # Слова для поиска

    def __str__(self):
        return f"Word Search: {self.id}"