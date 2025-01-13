from django.db import models
from django.contrib.auth.models import AbstractUser


class Role(models.TextChoices):
    STUDENT = 'student', 'Ученик'
    TEACHER = 'teacher', 'Учитель'


class CustomUser(AbstractUser):
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='customuser_set',  # Добавь related_name сюда
        related_query_name='customuser',  # related_query_name для Django 4.0 и выше
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='customuser_set',  # Добавь related_name сюда
        related_query_name='customuser',  # related_query_name для Django 4.0 и выше
        help_text='Specific permissions for this user.',
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

