from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.views import PasswordResetView
from .forms import RegistrationForm, LoginForm, CustomPasswordResetForm


def register_view(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])
            user.save()
            login(request, user)
            # Получаем параметр `next` из запроса
            next_url = request.POST.get('next', None)
            if next_url:
                return redirect(next_url)  # Перенаправляем на `next`
            else:
                return redirect('home')  # Если `next` нет, перенаправляем на главную
    else:
        next_url = request.GET.get('next', None)
        form = RegistrationForm()
    return render(request, 'users/register.html', {'form': form, 'next': next_url})


def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                # Получаем параметр `next` из запроса
                next_url = request.POST.get('next', None)
                if next_url:
                    return redirect(next_url)  # Перенаправляем на `next`
                else:
                    return redirect('home')  # Если `next` нет, перенаправляем на главную
    else:
        # Передаем параметр `next` в форму, если он есть в запросе
        next_url = request.GET.get('next', None)
        form = LoginForm()
    return render(request, 'users/login.html', {'form': form, 'next': next_url})