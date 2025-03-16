from django.contrib import admin
from .models import Classroom, UserAnswer, Unscramble, LabelImages, LabelImageOrder, EmbeddedTask, lesson, WordList

admin.site.register(Classroom)
admin.site.register(UserAnswer)
admin.site.register(Unscramble)
admin.site.register(LabelImages)
admin.site.register(LabelImageOrder)
admin.site.register(EmbeddedTask)
admin.site.register(lesson)
admin.site.register(WordList)