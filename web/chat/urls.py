from django.urls import path
from . import views

urlpatterns = [
    path('data/collection', views.collection, name='collection'),
    path('query/mysql', views.query_mysql, name='query_mysql'),
]