from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import TokenRefreshView
from service.views import EmailTokenObtainPairView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("service.urls")),

    path(
        "api/auth/login/",
        EmailTokenObtainPairView.as_view(),
        name="token-obtain-pair",
    ),

    path(
        "api/auth/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )