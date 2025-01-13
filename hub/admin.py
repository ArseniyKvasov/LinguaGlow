from .models import course, lesson, section, wordList
from django.contrib import admin

admin.site.register(course)
admin.site.register(lesson)
admin.site.register(section)
admin.site.register(wordList)