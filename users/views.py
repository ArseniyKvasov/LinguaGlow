from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from .forms import RegistrationForm, LoginForm

def handle_redirect(request, default='home'):
    """
    Обрабатывает параметр `next` и выполняет перенаправление.
    """
    next_url = request.POST.get('next', request.GET.get('next', ''))
    if next_url:
        return redirect(next_url)
    return redirect(default)

def register_view(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])
            user.save()
            login(request, user)
            return handle_redirect(request, default='home')
    else:
        form = RegistrationForm()
    next_url = request.GET.get('next', '')
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
                return handle_redirect(request, default='home')
    else:
        form = LoginForm()
    next_url = request.GET.get('next', '')
    return render(request, 'users/login.html', {'form': form, 'next': next_url})