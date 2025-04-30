import os
from channels.routing import ProtocolTypeRouter, URLRouter # type: ignore
from django.core.asgi import get_asgi_application # type: ignore
from channels.auth import AuthMiddlewareStack # type: ignore
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
