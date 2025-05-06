import os
from channels.routing import ProtocolTypeRouter, URLRouter # type: ignore
from django.core.asgi import get_asgi_application # type: ignore
from channels.auth import AuthMiddlewareStack # type: ignore
import drari_m3asbin.routing
from channels.layers import get_channel_layer
import asyncio

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'drari_m3asbin.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            drari_m3asbin.routing.websocket_urlpatterns
        )
    ),
})

# Add error handling for WebSocket connections
async def send_to_group(group_name, message):
    channel_layer = get_channel_layer()
    try:
        await channel_layer.group_send(group_name, message)
    except Exception as e:
        print(f"Error sending message to group {group_name}: {e}")
