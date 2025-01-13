from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm, PasswordResetForm
from .models import CustomUser


class RegistrationForm(UserCreationForm):
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password1', 'password2', 'role']


class LoginForm(AuthenticationForm):
    pass  # Используем стандартную форму входа Django


class CustomPasswordResetForm(PasswordResetForm):
    pass  # Используем стандартную форму сброса пароля Django