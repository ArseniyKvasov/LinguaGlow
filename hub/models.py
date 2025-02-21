import random
import string
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
import uuid
import bleach
from datetime import timedelta, timezone
from django.utils import timezone
from django.utils.timezone import now
from django.conf import settings
from django_cron import CronJobBase, Schedule

class CourseManager(models.Manager):
    def for_user(self, user):
        return self.filter(models.Q(user=user) | models.Q(lessons__sections__tasks__assigned_users=user)).distinct()

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

    objects = CourseManager()

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

class BaseTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(section, on_delete=models.CASCADE, related_name='%(class)s_tasks')
    order = models.PositiveIntegerField()  # Порядок задания в секции
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')

    def __str__(self):
        return f"Base Task {self.id} in Section {self.section.name}"

# Список слов
class WordList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Word List")
    words = models.JSONField()  # Список слов в формате JSON

    def __str__(self):
        return f"Word List: {self.title}"

# Соотнести слово с переводом
class MatchUpTheWords(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Match Up The Words")
    pairs = models.JSONField()  # Пары слов в формате JSON

    def __str__(self):
        return f"Match Up The Words: {self.id}"

# Эссе
class Essay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    conditions = models.JSONField(null=True)

    def __str__(self):
        return f"Essay: {self.title}"

# Заметка
class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Note")
    content = models.TextField()

    def __str__(self):
        return f"Note: {self.content[:50]}..."

# Картинка
class Image(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField()
    caption = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Image: {self.caption}"

# Распределить по колонкам
class SortIntoColumns(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Sort Into Columns")
    columns = models.JSONField()  # Колонки и их элементы в формате JSON

    def __str__(self):
        return f"Sort Into Columns: {self.id}"

# Составить предложение в правильном порядке
class MakeASentence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Make A Sentence")
    sentences = models.JSONField()

    def __str__(self):
        return f"Make A Sentence: {self.id}"

# Составить слово
class Unscramble(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Unscramble")
    words = models.JSONField()

    def __str__(self):
        return f"Unscramble: {self.words}"

# Заполнить пропуски
class FillInTheBlanks(models.Model):
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
class Dialogue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lines = models.JSONField()  # Реплики диалога в формате JSON

    def __str__(self):
        return f"Dialogue: {self.id}"

# Статья
class Article(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()

    def __str__(self):
        return f"Article: {self.title}"

# Аудио
class Audio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audio_url = models.URLField()
    transcript = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Audio: {self.audio_url}"

# Тест
class Test(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    questions = models.JSONField()  # Вопросы и варианты ответов в формате JSON

    def __str__(self):
        return f"Test: {self.id}"

# Правда или ложь
class TrueOrFalse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    statements = models.JSONField()  # Утверждения и их правильность в формате JSON

    def __str__(self):
        return f"True Or False: {self.id}"

# Подписать картинку
class LabelImages(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_urls = models.ManyToManyField('ImageUsage', through='LabelImageOrder', related_name='label_images')
    labels = models.JSONField()

    def __str__(self):
        return f"Label Images: {self.id}"

class ImageUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image_url = models.URLField(unique=True)
    usage_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Image: {self.id} ({self.image_url})"

class LabelImageOrder(models.Model):
    label_image = models.ForeignKey(LabelImages, on_delete=models.CASCADE)
    image_usage = models.ForeignKey(ImageUsage, on_delete=models.CASCADE)
    image_order = models.PositiveIntegerField()  # Это поле будет хранить порядок

    def __str__(self):
        return f"Order {self.image_order} for Image {self.image_usage.id}"

# Quizlet и WordWall
class EmbeddedTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    embed_code = models.TextField()  # Здесь будет храниться HTML-код iframe

    def save(self, *args, **kwargs):
        # Разрешаем только iframe и его атрибуты
        allowed_tags = ['iframe']
        allowed_attrs = {
            'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style']
        }

        # Очищаем HTML-код, сохраняя только разрешенные теги и атрибуты
        self.embed_code = bleach.clean(
            self.embed_code,
            tags=allowed_tags,
            attributes=allowed_attrs,
            strip=True  # Удаляем все неразрешенные теги и атрибуты
        )

        # Вызов стандартного метода save
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class ClassroomManager(models.Manager):
    def for_user(self, user):
        return self.filter(models.Q(students=user) | models.Q(teachers=user)).distinct()

class Classroom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255, default="Class")

    # Учителя (только пользователи с ролью "teacher")
    teachers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="classrooms_as_teacher",
        limit_choices_to={"role": "teacher"},
        verbose_name="Учителя"
    )

    # Ученики (роль: student или teacher, но не учителя из списка teachers)
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="classrooms_as_student",
        limit_choices_to={"role__in": ["student", "teacher"]},
        verbose_name="Ученики"
    )

    # Активные ученики (ученики с постоянным доступом)
    active_students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="active_classrooms",
        limit_choices_to={"role__in": ["student", "teacher"]},
        verbose_name="Активные ученики",
        blank=True
    )

    # Временные ученики (доступ на 1 день)
    temporary_students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="temporary_classrooms",
        limit_choices_to={"role": "student"},
        verbose_name="Временные ученики",
        blank=True
    )

    # Текущий урок (активный)
    lesson = models.ForeignKey(lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="classrooms")
    objects = ClassroomManager()

    # Уроки, которые уже были (включает завершенные и незавершенные)
    completed_lessons = models.ManyToManyField('lesson', related_name="completed_classrooms", through="CompletedLesson", blank=True, verbose_name="Пройденные уроки")

    created_at = models.DateTimeField(auto_now_add=True)  # Дата создания класса
    updated_at = models.DateTimeField(auto_now=True)  # Дата последнего обновления

    def clean(self):
        """Запрещаем добавление учителей в список учеников"""
        if set(self.teachers.all()) & set(self.students.all()):
            raise ValueError("Учителя не могут быть учениками в этом классе.")

    def add_temporary_student(self, student):
        """Добавляет временного ученика на 1 день"""
        self.temporary_students.add(student)
        TemporaryStudentAccess.objects.create(classroom=self, student=student, expires_at=now() + timedelta(days=1))

    def remove_expired_temporary_students(self):
        """Удаляет учеников с истекшим доступом"""
        expired_students = TemporaryStudentAccess.objects.filter(classroom=self, expires_at__lt=now()).values_list("student", flat=True)
        self.temporary_students.remove(*expired_students)
        TemporaryStudentAccess.objects.filter(classroom=self, expires_at__lt=now()).delete()

    def mark_lesson_completed(self, lesson, is_finished=True):
        """Помечает урок как завершенный (или нет)"""
        completed_lesson, created = CompletedLesson.objects.get_or_create(classroom=self, lesson=lesson)
        completed_lesson.is_finished = is_finished
        completed_lesson.save()

    def create_invitation(self):
        """Создает приглашение для класса."""
        code = generate_invitation_code()
        invitation = ClassroomInvitation.objects.create(classroom=self, code=code)
        return invitation

    def __str__(self):
        return f"Classroom {self.id}"


class TemporaryStudentAccess(models.Model):
    """Модель для отслеживания срока действия временных учеников"""
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="temporary_access_records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="temporary_classroom_access")
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Temporary Access: {self.student.username} until {self.expires_at}"


class CompletedLesson(models.Model):
    """Модель для хранения пройденных уроков"""
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="completed_records")
    lesson = models.ForeignKey(lesson, on_delete=models.CASCADE, related_name="completed_lessons")
    is_finished = models.BooleanField(default=False)  # Завершен ли урок
    completed_at = models.DateTimeField(auto_now_add=True)  # Время завершения

    class Meta:
        unique_together = ("classroom", "lesson")  # Уникальность записи по классу и уроку

    def __str__(self):
        status = "Завершен" if self.is_finished else "В процессе"
        return f"{self.lesson.name} ({status})"

def generate_invitation_code(length=6):
    """Генерация случайного кода для приглашения."""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

class ClassroomInvitation(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="invitations")
    code = models.CharField(max_length=10, unique=True)  # Уникальный код приглашения
    created_at = models.DateTimeField(auto_now_add=True)  # Дата создания приглашения
    expires_at = models.DateTimeField()  # Дата истечения приглашения

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invitation to {self.classroom.name} (Code: {self.code})"

class UserAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="user_answers")
    task = models.ForeignKey(BaseTask, on_delete=models.CASCADE, related_name="user_answers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_answers")
    answer_data = models.JSONField()  # Хранение ответа в формате JSON
    score = models.IntegerField(default=0)  # Оценка ответа
    submitted_at = models.DateTimeField(auto_now_add=True)  # Время отправки ответа
    updated_at = models.DateTimeField(auto_now=True)  # Время последнего обновления

    class Meta:
        unique_together = ('classroom', 'task', 'user')  # Один пользователь - один ответ на задание в классе

    def __str__(self):
        return f"UserAnswer(id={self.id}, user={self.user}, task={self.task})"

    @classmethod
    def delete_old_answers(cls):
        expiration_date = timezone.now() - timedelta(days=180)
        cls.objects.filter(updated_at__lt=expiration_date).delete()


class DeleteOldAnswersCronJob(CronJobBase):
    RUN_EVERY_MINS = 1440  # Запуск раз в день
    schedule = Schedule(run_every_mins=RUN_EVERY_MINS)
    code = 'app.delete_old_answers'

    def do(self):
        UserAnswer.delete_old_answers()
