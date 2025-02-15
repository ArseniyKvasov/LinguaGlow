from .models import (course, lesson, section, task, wordList, matchUpTheWords,
                     essay, note, image, sortIntoColumns, makeASentence, unscramble,
                     fillInTheBlanks, audio, article, wordSearch, test, trueOrFalse,
                     labelImages, imageUsage, labelImageOrder, dialogue)
from django.contrib import admin

admin.site.register(course)
admin.site.register(lesson)
admin.site.register(section)
admin.site.register(wordList)
admin.site.register(matchUpTheWords)
admin.site.register(essay)
admin.site.register(note)
admin.site.register(image)
admin.site.register(sortIntoColumns)
admin.site.register(makeASentence)
admin.site.register(unscramble)
admin.site.register(fillInTheBlanks)
admin.site.register(audio)
admin.site.register(article)
admin.site.register(wordSearch)
admin.site.register(test)
admin.site.register(trueOrFalse)
admin.site.register(labelImages)
admin.site.register(imageUsage)
admin.site.register(labelImageOrder)
admin.site.register(dialogue)