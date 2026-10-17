from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db.models import Q

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    BasePermission,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Product,
    SerialNumber,
    Warranty,
    Technician,
    Customer,
    Job,
    Invoice,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    BatteryHealthReport,
    AuditLog,
)

from .serializers import (
    ProductSerializer,
    SerialNumberSerializer,
    WarrantySerializer,
    TechnicianSerializer,
    CustomerSerializer,
    CustomerProfileSerializer,
    JobSerializer,
    StaffJobUpdateSerializer,
    InvoiceSerializer,
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    OrderItemSerializer,
    PaymentSerializer,
    CustomerRegistrationSerializer,
    BatteryHealthReportSerializer,
    EmailLoginSerializer,
)


# =========================================================
# EMAIL LOGIN
# =========================================================

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailLoginSerializer


# =========================================================
# STAFF JOBS
# =========================================================

class StaffJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            technician = Technician.objects.get(user=request.user)
        except Technician.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "No technician profile is linked "
                        "to this account."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        jobs = (
            Job.objects
            .select_related("customer", "serial", "technician")
            .filter(technician=technician)
            .order_by("-job_id")
        )

        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)


# =========================================================
# STAFF JOB UPDATE — ASSIGNED JOBS ONLY
# =========================================================

class StaffJobUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, job_id):
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        technician = Technician.objects.filter(
            user=request.user
        ).first()

        if technician is None:
            return Response(
                {
                    "detail": (
                        "No technician profile is linked "
                        "to this account."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        job = Job.objects.filter(
            job_id=job_id,
            technician=technician,
        ).first()

        if job is None:
            return Response(
                {
                    "detail": (
                        "Job not found or not assigned to you."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        previous_status = job.status

        serializer = StaffJobUpdateSerializer(
            job,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_job = serializer.save()

        if previous_status != updated_job.status:
            action_name = "STATUS_CHANGE"
            description = (
                f"Job #{updated_job.job_id} status changed "
                f"from {previous_status} to {updated_job.status}."
            )
        else:
            action_name = "UPDATE"
            description = (
                f"Job #{updated_job.job_id} details updated by "
                f"{request.user.get_username()}."
            )

        AuditLog.objects.create(
            user=request.user,
            action=action_name,
            entity_type="Job",
            entity_id=str(updated_job.job_id),
            description=description,
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(
            {
                "message": "Job updated successfully.",
                "job": JobSerializer(updated_job).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# PRODUCTS
# =========================================================

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-product_id")
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]


# =========================================================
# SERIAL NUMBER AND WARRANTY PERMISSIONS
# =========================================================

class IsStaffOrAdminForChanges(BasePermission):
    """
    Allow read-only requests publicly.
    Only authenticated Staff/Admin users can create,
    update, or delete serial-number and warranty records.
    """

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        user = request.user

        return bool(
            user
            and user.is_authenticated
            and (
                user.is_staff
                or user.is_superuser
                or user.groups.filter(
                    name__in=["Admin", "Staff"]
                ).exists()
            )
        )


# =========================================================
# SERIAL NUMBERS
# =========================================================

class SerialNumberViewSet(viewsets.ModelViewSet):
    queryset = (
        SerialNumber.objects
        .select_related("product", "customer")
        .all()
        .order_by("-serial_id")
    )
    serializer_class = SerialNumberSerializer
    permission_classes = [IsStaffOrAdminForChanges]


# =========================================================
# WARRANTIES
# =========================================================

class WarrantyViewSet(viewsets.ModelViewSet):
    queryset = (
        Warranty.objects
        .select_related("serial", "serial__product")
        .all()
        .order_by("-warranty_id")
    )
    serializer_class = WarrantySerializer
    permission_classes = [IsStaffOrAdminForChanges]


# =========================================================
# TECHNICIANS
# =========================================================

class TechnicianViewSet(viewsets.ModelViewSet):
    queryset = Technician.objects.all().order_by("-technician_id")
    serializer_class = TechnicianSerializer
    permission_classes = [AllowAny]


# =========================================================
# CUSTOMERS
# =========================================================

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-customer_id")
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]


# =========================================================
# SERVICE JOBS
# =========================================================

class JobViewSet(viewsets.ModelViewSet):
    queryset = (
        Job.objects
        .select_related("customer", "serial", "technician")
        .all()
        .order_by("-job_id")
    )
    serializer_class = JobSerializer
    permission_classes = [AllowAny]


# =========================================================
# INVOICES
# =========================================================

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = (
        Invoice.objects
        .select_related("job")
        .all()
        .order_by("-invoice_id")
    )
    serializer_class = InvoiceSerializer
    permission_classes = [AllowAny]


# =========================================================
# SHOPPING CART
# =========================================================

class CartViewSet(viewsets.ModelViewSet):
    queryset = (
        Cart.objects
        .select_related("customer")
        .prefetch_related("items__product")
        .all()
        .order_by("-cart_id")
    )
    serializer_class = CartSerializer
    permission_classes = [AllowAny]

    @action(
        detail=False,
        methods=["post"],
        url_path="add-item",
        permission_classes=[AllowAny],
    )
    def add_item(self, request):
        session_key = str(
            request.data.get("session_key", "")
        ).strip()

        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity", 1)

        if not session_key:
            return Response(
                {"error": "session_key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Valid product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(
                product_id=product_id
            )
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response(
                {"error": "Quantity must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1:
            return Response(
                {"error": "Quantity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if product.status != "ACTIVE":
            return Response(
                {"error": "This product is unavailable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if product.stock_quantity < quantity:
            return Response(
                {
                    "error": (
                        f"Only {product.stock_quantity} "
                        "item(s) available in stock."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find an existing cart for this session.
        cart = Cart.objects.filter(
            session_key=session_key
        ).first()

        # Do not reuse a cart that has already been ordered.
        # Release its old session key before creating a fresh cart.
        if cart is not None and cart.status == "ORDERED":
            cart.session_key = None
            cart.save(
                update_fields=["session_key", "updated_at"]
            )
            cart = None

        # Create a new cart when no reusable cart exists.
        if cart is None:
            cart, created = Cart.objects.get_or_create(
                session_key=session_key,
                defaults={"status": "ACTIVE"},
            )

        # Allow an abandoned cart to become active again.
        elif cart.status != "ACTIVE":
            cart.status = "ACTIVE"
            cart.save(
                update_fields=["status", "updated_at"]
            )

        # Add the product to the selected cart.
        cart_item, item_created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )

        if not item_created:
            new_quantity = cart_item.quantity + quantity

            if new_quantity > product.stock_quantity:
                return Response(
                    {
                        "error": (
                            f"Cannot add more items. "
                            f"Only {product.stock_quantity} "
                            "available in stock."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cart_item.quantity = new_quantity
            cart_item.save(
                update_fields=["quantity"]
            )

        return Response(
            {
                "message": "Product added to cart successfully.",
                "cart_id": cart.cart_id,
                "cart_item_id": cart_item.cart_item_id,
                "product_id": product.product_id,
                "quantity": cart_item.quantity,
                "subtotal": str(cart_item.subtotal),
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# CART ITEMS
# =========================================================

class CartItemViewSet(viewsets.ModelViewSet):
    queryset = (
        CartItem.objects
        .select_related("cart", "product")
        .all()
        .order_by("-cart_item_id")
    )
    serializer_class = CartItemSerializer
    permission_classes = [AllowAny]


# =========================================================
# ORDERS
# =========================================================

class OrderViewSet(viewsets.ModelViewSet):
    queryset = (
        Order.objects
        .select_related("customer")
        .prefetch_related("items__product")
        .all()
        .order_by("-order_id")
    )
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]


# =========================================================
# ORDER ITEMS
# =========================================================

class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = (
        OrderItem.objects
        .select_related("order", "product")
        .all()
        .order_by("-order_item_id")
    )
    serializer_class = OrderItemSerializer
    permission_classes = [AllowAny]


# =========================================================
# PAYMENTS
# =========================================================

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = (
        Payment.objects
        .select_related("customer", "order", "invoice")
        .all()
        .order_by("-payment_id")
    )
    serializer_class = PaymentSerializer
    permission_classes = [AllowAny]


# =========================================================
# CUSTOMER REGISTRATION
# =========================================================

class CustomerRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerRegistrationSerializer(
            data=request.data
        )

        if serializer.is_valid():
            customer = serializer.save()

            return Response(
                {
                    "message": (
                        "Customer account created successfully."
                    ),
                    "customer": CustomerSerializer(customer).data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# CURRENT USER
# =========================================================

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_superuser:
            role = "admin"
        elif user.groups.filter(name="Admin").exists():
            role = "admin"
        elif user.groups.filter(name="Staff").exists():
            role = "staff"
        elif user.groups.filter(name="Customer").exists():
            role = "customer"
        else:
            role = "user"

        response_data = {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role,
        }

        if hasattr(user, "customer_profile"):
            response_data["customer"] = CustomerSerializer(
                user.customer_profile
            ).data

        return Response(
            response_data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# CUSTOMER PROFILE — GET AND UPDATE OWN PROFILE
# =========================================================

class CustomerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_customer_for_user(self, request):
        # First, find the customer profile linked to this user.
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is not None:
            return customer

        # Safe fallback: match the exact email address.
        user_email = (request.user.email or "").strip()

        if not user_email:
            return None

        matches = Customer.objects.filter(
            email__iexact=user_email
        )

        # Do not link automatically if multiple profiles match.
        if matches.count() != 1:
            return None

        candidate = matches.first()

        # Never claim a profile already linked to another account.
        if candidate.user_id is not None:
            if candidate.user_id == request.user.pk:
                return candidate
            return None

        # Link an existing unassigned profile to this account.
        candidate.user = request.user
        candidate.save(update_fields=["user"])

        return candidate

    def get(self, request):
        customer = self.get_customer_for_user(request)

        if customer is None:
            return Response(
                {
                    "error": (
                        "Customer profile not found or not linked "
                        "to this account. Please check the user "
                        "and customer email addresses."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CustomerProfileSerializer(customer)

        return Response(
            {"customer": serializer.data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        customer = self.get_customer_for_user(request)

        if customer is None:
            return Response(
                {
                    "error": (
                        "Customer profile not found or not linked "
                        "to this account."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CustomerProfileSerializer(
            customer,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = serializer.save()

        if "email" in serializer.validated_data:
            request.user.email = customer.email or ""
            request.user.save(update_fields=["email"])

        return Response(
            {
                "message": "Profile updated successfully.",
                "customer": CustomerProfileSerializer(
                    customer
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# STAFF BATTERY HEALTH REPORTS
# =========================================================

class StaffBatteryHealthReportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_assigned_job(self, request, job_id):
        if not request.user.is_staff:
            return None, Response(
                {"detail": "Staff access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        technician = Technician.objects.filter(
            user=request.user
        ).first()

        if technician is None:
            return None, Response(
                {
                    "detail": (
                        "No technician profile is linked "
                        "to this account."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        job = Job.objects.filter(
            job_id=job_id,
            technician=technician,
        ).first()

        if job is None:
            return None, Response(
                {
                    "detail": (
                        "Job not found or not assigned to you."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return job, None

    def get(self, request, job_id):
        job, error_response = self.get_assigned_job(
            request, job_id
        )

        if error_response is not None:
            return error_response

        reports = BatteryHealthReport.objects.filter(
            job=job
        ).order_by("-uploaded_at")

        serializer = BatteryHealthReportSerializer(
            reports,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    def post(self, request, job_id):
        job, error_response = self.get_assigned_job(
            request, job_id
        )

        if error_response is not None:
            return error_response

        serializer = BatteryHealthReportSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = serializer.save(
            job=job,
            uploaded_by=request.user,
        )

        return Response(
            {
                "message": (
                    "Battery health report uploaded successfully."
                ),
                "report": BatteryHealthReportSerializer(
                    report,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# STAFF SERIAL NUMBER LOOKUP
# =========================================================

class StaffSerialLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        query = request.query_params.get("q", "").strip()

        serials = (
            SerialNumber.objects
            .select_related("product", "customer", "warranty")
            .all()
            .order_by("-serial_id")
        )

        if query:
            serials = serials.filter(
                Q(serial_number__icontains=query)
                | Q(product__product_name__icontains=query)
                | Q(product__brand__icontains=query)
                | Q(product__model__icontains=query)
                | Q(customer__customer_name__icontains=query)
                | Q(customer__phone__icontains=query)
            )

        total_count = serials.count()
        results = []

        for item in serials[:100]:
            warranty = getattr(item, "warranty", None)

            customer_data = None
            if item.customer:
                customer_data = {
                    "customer_id": item.customer.customer_id,
                    "customer_name": item.customer.customer_name,
                    "phone": item.customer.phone,
                    "email": item.customer.email,
                }

            warranty_data = None
            if warranty:
                warranty_data = {
                    "warranty_id": warranty.warranty_id,
                    "start_date": warranty.start_date.isoformat(),
                    "end_date": warranty.end_date.isoformat(),
                    "status": warranty.status,
                }

            results.append(
                {
                    "serial_id": item.serial_id,
                    "serial_number": item.serial_number,
                    "registered_date": (
                        item.registered_date.isoformat()
                    ),
                    "serial_status": item.status,
                    "product": {
                        "product_id": item.product.product_id,
                        "product_name": item.product.product_name,
                        "brand": item.product.brand,
                        "model": item.product.model,
                        "product_type": item.product.product_type,
                    },
                    "customer": customer_data,
                    "warranty": warranty_data,
                }
            )

        return Response(
            {
                "count": total_count,
                "results": results,
                "limit": 100,
            }
        )


# =========================================================
# ADMIN USERS & ROLES
# =========================================================

class AdminUsersRolesView(APIView):
    permission_classes = [IsAuthenticated]

    def is_admin(self, user):
        return (
            user.is_superuser
            or user.groups.filter(name="Admin").exists()
        )

    def get(self, request):
        if not self.is_admin(request.user):
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        User = get_user_model()
        users = User.objects.all().order_by("id")

        results = []

        for user in users:
            if (
                user.is_superuser
                or user.groups.filter(name="Admin").exists()
            ):
                role = "Admin"
            elif user.groups.filter(name="Staff").exists():
                role = "Staff"
            elif user.groups.filter(name="Customer").exists():
                role = "Customer"
            else:
                role = "Unassigned"

            results.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": role,
                    "is_active": user.is_active,
                    "date_joined": user.date_joined,
                }
            )

        return Response(results, status=status.HTTP_200_OK)

    def patch(self, request, user_id):
        if not self.is_admin(request.user):
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        User = get_user_model()

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Protect superuser accounts from role/status changes.
        if target_user.is_superuser:
            return Response(
                {
                    "detail": (
                        "Superuser account cannot be changed here."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_role = request.data.get("role")
        new_active = request.data.get("is_active")

        if new_role is None and new_active is None:
            return Response(
                {
                    "detail": (
                        "Provide role or is_active to update."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_role is not None:
            allowed_roles = {"Admin", "Staff", "Customer"}

            if new_role not in allowed_roles:
                return Response(
                    {
                        "detail": (
                            "Role must be Admin, Staff, or Customer."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Prevent the current admin removing their own role.
            if (
                target_user.pk == request.user.pk
                and new_role != "Admin"
            ):
                return Response(
                    {
                        "detail": (
                            "You cannot remove your own Admin role."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            for group_name in ["Admin", "Staff", "Customer"]:
                group = Group.objects.filter(
                    name=group_name
                ).first()

                if group:
                    target_user.groups.remove(group)

            selected_group, created = Group.objects.get_or_create(
                name=new_role
            )
            target_user.groups.add(selected_group)

            target_user.is_staff = new_role == "Staff"

        if new_active is not None:
            if not isinstance(new_active, bool):
                return Response(
                    {"detail": "is_active must be true or false."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                target_user.pk == request.user.pk
                and not new_active
            ):
                return Response(
                    {
                        "detail": (
                            "You cannot deactivate your own account."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            target_user.is_active = new_active

        target_user.save()

        if (
            target_user.is_superuser
            or target_user.groups.filter(name="Admin").exists()
        ):
            role = "Admin"
        elif target_user.groups.filter(name="Staff").exists():
            role = "Staff"
        elif target_user.groups.filter(name="Customer").exists():
            role = "Customer"
        else:
            role = "Unassigned"

        return Response(
            {
                "message": "User updated successfully.",
                "user": {
                    "id": target_user.id,
                    "username": target_user.username,
                    "email": target_user.email,
                    "role": role,
                    "is_active": target_user.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# ADMIN BATTERY HEALTH REPORTS — READ ONLY
# =========================================================

class AdminBatteryHealthReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin = (
            request.user.is_superuser
            or request.user.groups.filter(name="Admin").exists()
        )

        if not is_admin:
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reports = (
            BatteryHealthReport.objects
            .select_related(
                "job__customer",
                "job__serial__product",
                "job__serial__customer",
                "job__technician",
                "uploaded_by",
            )
            .order_by("-uploaded_at")
        )

        results = []

        for report in reports:
            job = report.job
            serial = job.serial
            product = serial.product

            customer = job.customer or serial.customer

            file_url = ""
            file_name = ""

            if report.report_file:
                file_name = report.report_file.name.split("/")[-1]

                try:
                    file_url = request.build_absolute_uri(
                        report.report_file.url
                    )
                except (ValueError, OSError):
                    file_url = ""

            uploaded_by = report.uploaded_by

            results.append(
                {
                    "report_id": report.report_id,
                    "job_id": job.job_id,
                    "customer_name": (
                        customer.customer_name
                        if customer
                        else "Unassigned"
                    ),
                    "serial_number": serial.serial_number,
                    "product_name": product.product_name,
                    "brand": product.brand,
                    "model": product.model,
                    "technician_name": (
                        job.technician.technician_name
                    ),
                    "service_date": job.service_date.isoformat(),
                    "health_status": report.health_status,
                    "battery_voltage": (
                        str(report.battery_voltage)
                        if report.battery_voltage is not None
                        else ""
                    ),
                    "remarks": report.remarks,
                    "file_name": file_name,
                    "file_url": file_url,
                    "uploaded_by": (
                        uploaded_by.get_username()
                        if uploaded_by
                        else "Unknown"
                    ),
                    "uploaded_at": report.uploaded_at.isoformat(),
                }
            )

        return Response(results, status=status.HTTP_200_OK)


# =========================================================
# ADMIN AUDIT LOG
# =========================================================

class AdminAuditLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin = (
            request.user.is_superuser
            or request.user.groups.filter(name="Admin").exists()
        )

        if not is_admin:
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logs = (
            AuditLog.objects
            .select_related("user")
            .order_by("-created_at")
        )

        data = []

        for item in logs:
            user = item.user

            if user:
                username = (
                    user.get_full_name()
                    or user.email
                    or user.get_username()
                )
            else:
                username = "Deleted User"

            data.append(
                {
                    "audit_log_id": item.audit_log_id,
                    "user_id": user.pk if user else None,
                    "username": username,
                    "action": item.action,
                    "entity_type": item.entity_type,
                    "entity_id": item.entity_id,
                    "description": item.description,
                    "ip_address": item.ip_address,
                    "created_at": item.created_at.isoformat(),
                }
            )

        return Response(
            {
                "total": len(data),
                "logs": data,
            }
        )