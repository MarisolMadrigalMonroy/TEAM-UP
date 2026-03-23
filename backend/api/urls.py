from django.urls import path
from . import views
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register(r'proyectos', views.ProyectoViewSet, basename='proyecto')
router.register(r'intereses', views.InteresViewSet, basename='interes')
router.register(r'habilidades', views.HabilidadViewSet, basename='habilidad')
router.register(r'categorias', views.CategoriaViewSet, basename='categoria')
router.register(r'match', views.MatchViewSet, basename='match')
router.register(r'notificaciones', views.NotificacionViewSet, basename='notificacion')

proyecto_router = routers.NestedDefaultRouter(router, r'proyectos', lookup='proyecto')
proyecto_router.register(r'comentarios', views.ComentarioViewSet, basename='proyecto-comentarios')

urlpatterns = router.urls + proyecto_router.urls


