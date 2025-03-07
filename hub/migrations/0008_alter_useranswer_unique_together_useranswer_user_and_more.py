# Generated by Django 5.1.4 on 2025-02-19 16:42

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hub", "0007_alter_useranswer_unique_together_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="useranswer",
            unique_together=set(),
        ),
        migrations.AddField(
            model_name="useranswer",
            name="user",
            field=models.ForeignKey(
                default=None,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="user_answers",
                to=settings.AUTH_USER_MODEL,
            ),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name="useranswer",
            unique_together={("classroom", "task", "user")},
        ),
    ]
