# Postgres Row-Level Security (RLS) Implementation Strategy

This document outlines the strategy for implementing Row-Level Security (RLS) in PostgreSQL to enforce multi-tenant data isolation at the database level.

## Current State Analysis

### Tenant Hierarchy
```
Account (Franchisee/Operator)
  ├── Brand (Parent brand)
  │   └── Stores (Locations)
  └── Users (Employees, Managers, Owners)
```

### Critical Security Gaps

1. **No Database-Level Isolation**: All tenant filtering relies on application logic
2. **Inconsistent ViewSet Filtering**: Some views filter by brand, others don't
3. **BrandListCreateView Shows All Brands**: Critical security gap - any authenticated user sees all brands
4. **No JWT Tenant Claims**: JWT tokens don't contain account_id or brand_id
5. **No Session Variables**: No mechanism to set current tenant context

### Risk Assessment

**Severity**: CRITICAL
- Single missed `.filter()` in any ViewSet exposes all customer data
- No defense-in-depth - application is single point of failure
- Regulatory compliance risk (GDPR, SOC 2)

## Implementation Strategy

### Phase 1: Foundation (This PR)

#### 1.1 Add Tenant Context to JWT Tokens

**File**: `apps/api/accounts/serializers.py`

Add `account_id` and `brand_id` to JWT token claims:

```python
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add tenant context
        if user.account:
            token['account_id'] = user.account.id
            token['brand_id'] = user.account.brand.id if user.account.brand else None
        
        # Add role for authorization
        token['role'] = user.role
        
        return token
```

#### 1.2 Create Tenant Context Middleware

**File**: `apps/api/core/middleware.py`

Set PostgreSQL session variable for current tenant:

```python
from django.db import connection

class TenantContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Extract tenant from JWT token
        if hasattr(request, 'user') and request.user.is_authenticated:
            account_id = getattr(request.user, 'account_id', None)
            
            if account_id:
                # Set PostgreSQL session variable
                with connection.cursor() as cursor:
                    cursor.execute("SET app.tenant_id = %s", [account_id])
        
        response = self.get_response(request)
        return response
```

#### 1.3 Fix ViewSet Tenant Scoping

**File**: `apps/api/brands/views.py`

Fix BrandListCreateView to filter by account:

```python
class BrandListCreateView(generics.ListCreateAPIView):
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # SUPER_ADMIN sees all brands
        if user.role == User.Role.SUPER_ADMIN:
            return Brand.objects.filter(is_active=True)
        
        # Other users see only their account's brand
        if user.account and user.account.brand:
            return Brand.objects.filter(id=user.account.brand.id, is_active=True)
        
        return Brand.objects.none()
```

#### 1.4 Create RLS Policies for Critical Tables

**File**: `apps/api/core/migrations/0001_enable_rls.py`

Enable RLS on critical tables:

```sql
-- Enable RLS on brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_tenant_isolation ON brands
    USING (
        -- SUPER_ADMIN bypass
        current_setting('app.user_role', true) = 'SUPER_ADMIN'
        OR
        -- Users see their account's brand
        id = (
            SELECT brand_id FROM accounts 
            WHERE id = current_setting('app.tenant_id', true)::integer
        )
    );

-- Enable RLS on stores table
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY stores_tenant_isolation ON stores
    USING (
        current_setting('app.user_role', true) = 'SUPER_ADMIN'
        OR
        account_id = current_setting('app.tenant_id', true)::integer
        OR
        brand_id IN (
            SELECT brand_id FROM accounts 
            WHERE id = current_setting('app.tenant_id', true)::integer
        )
    );

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
    USING (
        current_setting('app.user_role', true) = 'SUPER_ADMIN'
        OR
        account_id = current_setting('app.tenant_id', true)::integer
    );

-- Enable RLS on inspections table
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspections_tenant_isolation ON inspections
    USING (
        current_setting('app.user_role', true) = 'SUPER_ADMIN'
        OR
        store_id IN (
            SELECT id FROM stores 
            WHERE account_id = current_setting('app.tenant_id', true)::integer
        )
    );

-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY videos_tenant_isolation ON videos
    USING (
        current_setting('app.user_role', true) = 'SUPER_ADMIN'
        OR
        inspection_id IN (
            SELECT i.id FROM inspections i
            JOIN stores s ON i.store_id = s.id
            WHERE s.account_id = current_setting('app.tenant_id', true)::integer
        )
    );
```

#### 1.5 Create Cross-Tenant Access Tests

**File**: `apps/api/core/tests/test_tenant_isolation.py`

Comprehensive tests to verify RLS policies:

```python
class TenantIsolationTest(TestCase):
    def setUp(self):
        # Create two separate accounts/tenants
        self.account1 = Account.objects.create(name='Tenant 1')
        self.account2 = Account.objects.create(name='Tenant 2')
        
        # Create users for each tenant
        self.user1 = User.objects.create_user(
            username='user1',
            account=self.account1
        )
        self.user2 = User.objects.create_user(
            username='user2',
            account=self.account2
        )
    
    def test_user_cannot_see_other_tenant_brands(self):
        """Test that users cannot access brands from other tenants"""
        # User 1 tries to access tenant 2's data
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/brands/')
        
        # Should only see their own tenant's brands
        self.assertEqual(response.status_code, 200)
        brand_ids = [b['id'] for b in response.data]
        self.assertNotIn(self.account2.brand.id, brand_ids)
```

### Phase 2: Comprehensive RLS (Future Work)

#### Tables Requiring RLS Policies

**High Priority** (Contains sensitive customer data):
- ✅ brands (Phase 1)
- ✅ stores (Phase 1)
- ✅ users (Phase 1)
- ✅ inspections (Phase 1)
- ✅ videos (Phase 1)
- ⏳ findings
- ⏳ micro_check_runs
- ⏳ micro_check_responses
- ⏳ corrective_actions
- ⏳ subscriptions
- ⏳ payment_events

**Medium Priority** (Operational data):
- ⏳ uploads
- ⏳ micro_check_templates
- ⏳ micro_check_assignments
- ⏳ google_reviews
- ⏳ seven_shifts_employees
- ⏳ seven_shifts_shifts

**Low Priority** (System/reference data):
- accounts (no RLS needed - users already filtered by account)
- user_behavior_events
- smart_nudges

#### 2.1 Add account_id to All Tenant Tables

For tables that don't have direct `account_id`:

```python
# Migration to add account_id
class Migration(migrations.Migration):
    dependencies = [...]
    
    operations = [
        migrations.AddField(
            model_name='finding',
            name='account',
            field=models.ForeignKey(
                'accounts.Account',
                on_delete=models.CASCADE,
                null=True,
                db_index=True
            ),
        ),
        # Backfill account_id from related objects
        migrations.RunPython(backfill_account_id),
    ]
```

#### 2.2 Create RLS Policies for Remaining Tables

Follow same pattern as Phase 1:
1. Enable RLS on table
2. Create policy with SUPER_ADMIN bypass
3. Filter by account_id or related account_id
4. Add tests for cross-tenant access

#### 2.3 Audit All ViewSets

Create base ViewSet that enforces tenant filtering:

```python
class TenantScopedViewSet(viewsets.ModelViewSet):
    """Base ViewSet that automatically filters by tenant"""
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == User.Role.SUPER_ADMIN:
            return queryset
        
        if not user.account:
            return queryset.none()
        
        # Automatically filter by account
        return queryset.filter(account=user.account)
```

### Phase 3: PII Protection (Future Work)

#### 3.1 Separate PII Tables

Move sensitive fields to separate tables with service-role only access:

```sql
-- Create PII table
CREATE TABLE user_pii (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    phone VARCHAR(20),
    email VARCHAR(254),
    created_at TIMESTAMP
);

-- Restrict access to service role only
REVOKE ALL ON user_pii FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON user_pii TO service_role;

-- Enable RLS
ALTER TABLE user_pii ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_pii_service_only ON user_pii
    USING (current_user = 'service_role');
```

#### 3.2 Update Application Code

Use service role for PII access:

```python
from django.db import connections

def get_user_pii(user_id):
    """Access PII using service role connection"""
    with connections['service_role'].cursor() as cursor:
        cursor.execute(
            "SELECT phone, email FROM user_pii WHERE user_id = %s",
            [user_id]
        )
        return cursor.fetchone()
```

## Testing Strategy

### Unit Tests

- Test each RLS policy individually
- Verify SUPER_ADMIN bypass works
- Verify tenant isolation works
- Test edge cases (null account_id, etc.)

### Integration Tests

- Test full request flow with JWT tokens
- Verify middleware sets session variables correctly
- Test cross-tenant access attempts fail
- Test ViewSet filtering works with RLS

### Security Tests

- Attempt SQL injection to bypass RLS
- Test with malformed JWT tokens
- Test with expired tokens
- Test with missing account_id

### Performance Tests

- Measure query performance with RLS enabled
- Ensure indexes are used correctly
- Test with large datasets (1M+ rows)

## Rollout Plan

### Pre-Deployment

1. ✅ Create RLS policies in staging
2. ✅ Run comprehensive tests
3. ✅ Performance testing
4. ⏳ Security audit
5. ⏳ Document rollback procedure

### Deployment

1. Deploy code changes (middleware, JWT, ViewSets)
2. Run database migration to enable RLS
3. Monitor error rates and query performance
4. Verify no cross-tenant access in logs

### Post-Deployment

1. Monitor for 24 hours
2. Run security scan
3. Review audit logs
4. Plan Phase 2 implementation

## Rollback Procedure

If issues arise, disable RLS without code changes:

```sql
-- Disable RLS on all tables (emergency rollback)
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS brands_tenant_isolation ON brands;
DROP POLICY IF EXISTS stores_tenant_isolation ON stores;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP POLICY IF EXISTS inspections_tenant_isolation ON inspections;
DROP POLICY IF EXISTS videos_tenant_isolation ON videos;
```

Application code will continue to work with application-level filtering.

## Monitoring and Alerts

### Metrics to Track

- RLS policy violations (should be 0)
- Query performance degradation
- Failed authentication attempts
- Cross-tenant access attempts (audit log)

### Alerts

```yaml
alerts:
  - name: "RLS Policy Violation"
    condition: "rls_violation_count > 0"
    severity: "critical"
    notification: "email, slack, pagerduty"
  
  - name: "Query Performance Degradation"
    condition: "avg_query_time > 2x baseline"
    severity: "warning"
    notification: "email"
  
  - name: "Missing Tenant Context"
    condition: "requests_without_tenant_id > 10/min"
    severity: "high"
    notification: "slack"
```

## Performance Considerations

### Index Requirements

Ensure indexes exist for RLS policy columns:

```sql
-- Add indexes for RLS performance
CREATE INDEX idx_stores_account_id ON stores(account_id);
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_inspections_store_id ON inspections(store_id);
CREATE INDEX idx_videos_inspection_id ON videos(inspection_id);
```

### Query Plan Analysis

Before and after RLS:

```sql
EXPLAIN ANALYZE
SELECT * FROM stores WHERE account_id = 123;

-- Should use index scan, not seq scan
-- Execution time should be < 10ms for typical queries
```

### Connection Pooling

RLS uses session variables, so ensure connection pooling doesn't interfere:

```python
# Django settings
DATABASES = {
    'default': {
        ...
        'CONN_MAX_AGE': 0,  # Disable persistent connections for RLS
    }
}
```

## Compliance and Audit

### GDPR Compliance

- RLS ensures data minimization (users only see their data)
- Audit logs track all data access
- Right to erasure can be enforced at database level

### SOC 2 Compliance

- Database-level access controls (RLS policies)
- Documented security procedures (this document)
- Regular security testing (quarterly)
- Audit trail of all changes

### Audit Logging

Enable PostgreSQL audit logging for RLS events:

```sql
-- Enable audit logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Log RLS policy violations
CREATE EXTENSION IF NOT EXISTS pgaudit;
ALTER SYSTEM SET pgaudit.log = 'all';
```

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Django Multi-Tenancy Best Practices](https://docs.djangoproject.com/en/stable/topics/db/multi-db/)
- [OWASP Multi-Tenancy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multitenant_Architecture_Cheat_Sheet.html)

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-11-02
- **Next Review**: 2026-02-02
- **Owner**: Security Team
