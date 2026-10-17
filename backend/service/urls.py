from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    StaffJobsView,
    StaffSerialLookupView,
    StaffJobUpdateView,
    StaffBatteryHealthReportView,
    ProductViewSet,
    SerialNumberViewSet,
    WarrantyViewSet,
    TechnicianViewSet,
    CustomerViewSet,
    JobViewSet,
    InvoiceViewSet,
    CartViewSet,
    CartItemViewSet,
    OrderViewSet,
    OrderItemViewSet,
    PaymentViewSet,
    CustomerRegistrationView,
    CurrentUserView,
    CustomerProfileView,
    AdminBatteryHealthReportsView,
    AdminUsersRolesView,
    AdminAuditLogView,
)

from .checkout_views import (
    CheckoutCreateOrderView,
    OrderDemoPaymentView,
    MyOrdersView,
    MyServiceRequestsView,
    MyProductsView,
    ServiceRequestCreateView,
    MyInvoicesView,
    MyNotificationsView,
    CustomerNotificationReadView,
)

from .customer_notification_views import (
    AdminNotificationsView,
)

from .staff_notification_views import (
    StaffNotificationsView,
    MarkStaffNotificationReadView,
)


# =====================================================
# REST FRAMEWORK ROUTER
# =====================================================

router = DefaultRouter()

router.register(
    "products",
    ProductViewSet,
    basename="product",
)

router.register(
    "serial-numbers",
    SerialNumberViewSet,
    basename="serial-number",
)

router.register(
    "warranties",
    WarrantyViewSet,
    basename="warranty",
)

router.register(
    "technicians",
    TechnicianViewSet,
    basename="technician",
)

router.register(
    "customers",
    CustomerViewSet,
    basename="customer",
)

router.register(
    "jobs",
    JobViewSet,
    basename="job",
)

router.register(
    "invoices",
    InvoiceViewSet,
    basename="invoice",
)

router.register(
    "carts",
    CartViewSet,
    basename="cart",
)

router.register(
    "cart-items",
    CartItemViewSet,
    basename="cart-item",
)

router.register(
    "orders",
    OrderViewSet,
    basename="order",
)

router.register(
    "order-items",
    OrderItemViewSet,
    basename="order-item",
)

router.register(
    "payments",
    PaymentViewSet,
    basename="payment",
)


# =====================================================
# URL PATTERNS
# =====================================================

urlpatterns = [
    # REST Framework API endpoints
    path("", include(router.urls)),

    # -------------------------------------------------
    # STAFF JOBS
    # -------------------------------------------------

    path(
        "staff/jobs/",
        StaffJobsView.as_view(),
        name="staff-jobs",
    ),

    path(
        "staff/serial-lookup/",
        StaffSerialLookupView.as_view(),
        name="staff-serial-lookup",
    ),

    path(
        "staff/jobs/<int:job_id>/update/",
        StaffJobUpdateView.as_view(),
        name="staff-job-update",
    ),

    path(
        "staff/jobs/<int:job_id>/battery-reports/",
        StaffBatteryHealthReportView.as_view(),
        name="staff-battery-reports",
    ),

    # -------------------------------------------------
    # STAFF NOTIFICATIONS
    # -------------------------------------------------

    path(
        "staff/notifications/",
        StaffNotificationsView.as_view(),
        name="staff-notifications",
    ),

    path(
        "staff/notifications/<int:notification_id>/read/",
        MarkStaffNotificationReadView.as_view(),
        name="mark-staff-notification-read",
    ),

    # -------------------------------------------------
    # AUTHENTICATION AND CUSTOMER PROFILE
    # -------------------------------------------------

    path(
        "auth/register/",
        CustomerRegistrationView.as_view(),
        name="customer-register",
    ),

    path(
        "auth/me/",
        CurrentUserView.as_view(),
        name="current-user",
    ),

    path(
        "auth/profile/",
        CustomerProfileView.as_view(),
        name="customer-profile",
    ),

    # -------------------------------------------------
    # CHECKOUT AND ORDERS
    # -------------------------------------------------

    path(
        "checkout/create-order/",
        CheckoutCreateOrderView.as_view(),
        name="checkout-create-order",
    ),

    path(
        "my-orders/",
        MyOrdersView.as_view(),
        name="my-orders",
    ),

    path(
        "my-orders/<int:order_id>/pay/",
        OrderDemoPaymentView.as_view(),
        name="my-order-payment",
    ),

    # -------------------------------------------------
    # CUSTOMER SERVICE REQUESTS AND PRODUCTS
    # -------------------------------------------------

    path(
        "service-requests/",
        ServiceRequestCreateView.as_view(),
        name="service-request-create",
    ),

    path(
        "my-service-requests/",
        MyServiceRequestsView.as_view(),
        name="my-service-requests",
    ),

    path(
        "my-products/",
        MyProductsView.as_view(),
        name="my-products",
    ),

    # -------------------------------------------------
    # CUSTOMER INVOICES AND ORDER RECEIPTS
    # -------------------------------------------------

    path(
        "my-invoices/",
        MyInvoicesView.as_view(),
        name="my-invoices",
    ),

    # -------------------------------------------------
    # CUSTOMER NOTIFICATIONS
    # -------------------------------------------------

    path(
        "my-notifications/",
        MyNotificationsView.as_view(),
        name="my-notifications",
    ),

    path(
        "my-notifications/<int:notification_id>/read/",
        CustomerNotificationReadView.as_view(),
        name="my-notification-read",
    ),

    # -------------------------------------------------
    # ADMIN USERS AND ROLES
    # -------------------------------------------------

    path(
        "admin/users-roles/",
        AdminUsersRolesView.as_view(),
        name="admin-users-roles",
    ),

    path(
        "admin/users-roles/<int:user_id>/",
        AdminUsersRolesView.as_view(),
        name="admin-user-role-update",
    ),

    # -------------------------------------------------
    # ADMIN BATTERY HEALTH REPORTS
    # -------------------------------------------------

    path(
        "admin/battery-health-reports/",
        AdminBatteryHealthReportsView.as_view(),
        name="admin-battery-health-reports",
    ),

    # -------------------------------------------------
    # ADMIN NOTIFICATIONS
    # -------------------------------------------------

    path(
        "admin/notifications/",
        AdminNotificationsView.as_view(),
        name="admin-notifications",
    ),

    # -------------------------------------------------
    # ADMIN AUDIT LOG
    # -------------------------------------------------

    path(
        "admin/audit-log/",
        AdminAuditLogView.as_view(),
        name="admin-audit-log",
    ),
]