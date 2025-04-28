import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import drari_m3asbin.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'drari_m3asbin.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            drari_m3asbin.routing.websocket_urlpatterns
        )
    ),
})
