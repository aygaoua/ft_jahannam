from django.contrib import admin # type: ignore
from django.urls import path, include, re_path # type: ignore
from api.views import CreatUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView # type: ignore
from drari_m3asbin.routing import websocket_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/user/register/", CreatUserView.as_view(), name="register"),
    path("api/token/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("api.urls")),
    re_path(r'^ws/', include(websocket_urlpatterns)),
]
