import os

from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import hub.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'linguaglow.settings')

application = ProtocolTypeRouter({
    "http": ASGIStaticFilesHandler(get_asgi_application()),  # Обработка HTTP-запросов и статических файлов
    "websocket": AuthMiddlewareStack(
        URLRouter(
            hub.routing.websocket_urlpatterns  # Исправлен доступ к маршрутам WebSocket
        )
    ),
})
