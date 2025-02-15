from django.forms import formset_factory
from django import forms
from .models import essay

class WordPairForm(forms.Form):
    english = forms.CharField(
        label="Английское слово",
        max_length=100,
        widget=forms.TextInput(attrs={'class': 'form-control'})  # Добавляем класс form-control
    )
    russian = forms.CharField(
        label="Перевод",
        max_length=100,
        widget=forms.TextInput(attrs={'class': 'form-control'})  # Добавляем класс form-control
    )

WordPairFormSet = formset_factory(WordPairForm, extra=1)  # extra=1 для одной пустой формы

class EssayForm(forms.ModelForm):
    class Meta:
        model = essay
        fields = ['title']  # Поле для ввода многострочного задания
        widgets = {
            'title': forms.Textarea(attrs={'rows': 5, 'class': 'form-control'}),  # Многострочное поле
        }