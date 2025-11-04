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

        # Base queryset with Google location data pre-fetched (optimization for OneToOne relationship)
        base_qs = Store.objects.select_related('google_location', 'brand')

        # SUPER_ADMIN and ADMIN see all stores across all tenants
        if user.role in [User.Role.SUPER_ADMIN, User.Role.ADMIN]:
            return base_qs.filter(is_active=True)

        # Other roles see stores in their brand
        if user.store and user.store.brand:
            return base_qs.filter(brand=user.store.brand, is_active=True)

        return Store.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return StoreListSerializer
        return StoreSerializer

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Incoming request data: {request.data}")

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Create store and optionally link Google location if google_location_data is provided
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Request data: {self.request.data}")
        logger.info(f"Validated data: {serializer.validated_data}")

        # Extract google_location_data from validated_data before saving
        google_location_data = serializer.validated_data.pop('google_location_data', None)
        logger.info(f"Google location data: {google_location_data}")

        # Auto-set account based on brand's account
        brand = serializer.validated_data.get('brand')
        if brand and brand.account:
            serializer.validated_data['account'] = brand.account
            logger.info(f"Auto-setting account to {brand.account} from brand {brand.name}")
        elif not serializer.validated_data.get('account'):
            # Fallback: use request user's account if no brand account
            if hasattr(self.request.user, 'account') and self.request.user.account:
                serializer.validated_data['account'] = self.request.user.account
                logger.info(f"Auto-setting account to {self.request.user.account} from request user")

        # Create the store
        store = serializer.save()

        # Check if Google location data was provided
        if google_location_data:
            from integrations.models import GoogleLocation
            from integrations.tasks import scrape_google_reviews
            import uuid

            # Get account from store or request user
            account = store.account if store.account else (
                self.request.user.account if hasattr(self.request.user, 'account') else None
            )

            if not account:
                logger.warning(f"Cannot create GoogleLocation for store {store.id}: no account found")
            else:
                # Create GoogleLocation record
                google_location = GoogleLocation.objects.create(
                    account=account,
                    store=store,
                    google_location_id=google_location_data.get('google_location_id', '') or f'place_{uuid.uuid4()}',
                    google_location_name=google_location_data.get('business_name', ''),
                    place_url=google_location_data.get('place_url', ''),
                    place_id=google_location_data.get('place_id', ''),
                    address=google_location_data.get('address', ''),
                    average_rating=google_location_data.get('average_rating') or None,
                    total_review_count=google_location_data.get('total_reviews') or 0
                )

                logger.info(f"Created GoogleLocation {google_location.id} for store {store.name}")

                # Trigger background task to scrape reviews
                scrape_google_reviews.delay(str(google_location.id))


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