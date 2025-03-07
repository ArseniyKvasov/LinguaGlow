# Generated by Django 5.1.4 on 2025-02-16 19:14

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hub", "0002_classroom_completedlesson_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="classroom",
            name="lesson",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="classrooms",
                to="hub.lesson",
            ),
        ),
    ]
