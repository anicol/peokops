from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Brand, Store
from .serializers import BrandSerializer, StoreSerializer, StoreListSerializer


class BrandListCreateView(generics.ListCreateAPIView):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class BrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]


class StoreListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand', 'state', 'city']
    search_fields = ['name', 'code', 'address']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['brand__name', 'name']

    def get_queryset(self):
        """Filter stores based on role - SUPER_ADMIN/ADMIN sees all, others see only their brand"""
        from accounts.models import User
        user = self.request.user

        # SUPER_ADMIN and ADMIN see all stores across all tenants
        if user.role in [User.Role.SUPER_ADMIN, User.Role.ADMIN]:
            return Store.objects.filter(is_active=True)

        # Other roles see stores in their brand
        if user.store and user.store.brand:
            return Store.objects.filter(brand=user.store.brand, is_active=True)

        return Store.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return StoreListSerializer
        return StoreSerializer


class StoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter stores based on role - SUPER_ADMIN/ADMIN sees all, others see only their brand"""
        from accounts.models import User
        user = self.request.user

        # SUPER_ADMIN and ADMIN see all stores across all tenants
        if user.role in [User.Role.SUPER_ADMIN, User.Role.ADMIN]:
            return Store.objects.all()

        # Other roles see stores in their brand
        if user.store and user.store.brand:
            return Store.objects.filter(brand=user.store.brand)

        return Store.objects.none()