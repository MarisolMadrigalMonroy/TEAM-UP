from django.contrib import admin
from django.urls import path, include
from api.views import CreateUserView, UserMeView, PerfilPublicoView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# urls para endpoints de api
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/usuario/registro/', CreateUserView.as_view(), name='registro'),
    path('api/usuario/yo/', UserMeView.as_view(), name='usuario-yo'),
    path('api/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include('api.urls')),
    path('api/usuarios/<int:pk>/', PerfilPublicoView.as_view(), name='perfil-publico'),
]
