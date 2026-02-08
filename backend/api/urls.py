from django.urls import path
from . import views
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='project')
router.register(r'interests', views.InterestViewSet, basename='interest')
router.register(r'abilities', views.AbilityViewSet, basename='ability')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'match', views.MatchViewSet, basename='match')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

project_router = routers.NestedDefaultRouter(router, r'projects', lookup='project')
project_router.register(r'comments', views.CommentViewSet, basename='project-comments')

urlpatterns = router.urls + project_router.urls


