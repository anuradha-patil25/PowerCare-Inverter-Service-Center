from django.contrib.auth import get_user_model
import os
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

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


)

# =========================================================
# EMAIL LOGIN
# =========================================================

class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        email = attrs["email"].strip()
        password = attrs["password"]

        User = get_user_model()
        matching_users = User.objects.filter(
            email__iexact=email
        )

        if matching_users.count() != 1:
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        user = matching_users.first()

        if not user.is_active or not user.check_password(password):
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


# =========================================================
# PRODUCT
# =========================================================

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "product_id",
            "product_name",
            "brand",
            "model",
            "product_type",
            "purchase_date",
            "status",
            "stock_quantity",
            "price",
            "image",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "product_id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# SERIAL NUMBER
# =========================================================
class SerialNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = SerialNumber
        fields = [
            "serial_id",
            "product",
            "customer",
            "serial_number",
            "registered_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "serial_id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# WARRANTY
# =========================================================

class WarrantySerializer(serializers.ModelSerializer):
    class Meta:
        model = Warranty
        fields = [
            "warranty_id",
            "serial",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "warranty_id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# TECHNICIAN
# =========================================================
class TechnicianSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Technician
        fields = [
            "technician_id",
            "user",
            "username",
            "technician_name",
            "email",
            "phone",
            "specialization",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "technician_id",
            "username",
            "created_at",
            "updated_at",
        ]

# =========================================================
# CUSTOMER
# =========================================================

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "user",
            "customer_name",
            "phone",
            "email",
            "address",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "customer_id",
            "created_at",
            "updated_at",
        ]


# =========================================================
# CUSTOMER PROFILE — VIEW AND UPDATE OWN PROFILE
# =========================================================

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "customer_name",
            "phone",
            "email",
            "address",
        ]
        read_only_fields = [
            "customer_id",
        ]
        extra_kwargs = {
            "email": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
            },
            "address": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
            },
        }

    def validate_phone(self, value):
        existing_customers = Customer.objects.filter(
            phone=value
        )

        if self.instance:
            existing_customers = existing_customers.exclude(
                pk=self.instance.pk
            )

        if existing_customers.exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )

        return value


# =========================================================
# CUSTOMER REGISTRATION
# =========================================================

class CustomerRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150
    )

    password = serializers.CharField(
        write_only=True,
        min_length=6
    )

    password2 = serializers.CharField(
        write_only=True,
        min_length=6
    )

    customer_name = serializers.CharField(
        max_length=100
    )

    phone = serializers.CharField(
        max_length=15
    )

    email = serializers.EmailField(
    required=True,
    allow_blank=False,
    )

    address = serializers.CharField(
        required=False,
        allow_blank=True
    )


    def validate_email(self, value):
        User = get_user_model()
        email = value.strip()

        if not email:
            raise serializers.ValidationError(
                "Email address is required."
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "This email address is already registered."
            )

        return email

    def validate_phone(self, value):
        if Customer.objects.filter(
            phone=value
        ).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )

        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {
                    "password2": "Passwords do not match."
                }
            )

        return attrs

    def create(self, validated_data):
        from django.contrib.auth.models import Group
        from django.db import transaction

        User = get_user_model()

        password = validated_data.pop("password")
        validated_data.pop("password2")

        username = validated_data.pop("username")
        email = validated_data.get("email") or ""

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email
            )

            customer_group, created = Group.objects.get_or_create(
                name="Customer"
            )

            user.groups.add(customer_group)

            customer = Customer.objects.create(
                user=user,
                customer_name=validated_data["customer_name"],
                phone=validated_data["phone"],
                email=validated_data.get("email") or None,
                address=validated_data.get("address") or None,
                status="ACTIVE"
            )

        return customer


# =========================================================
# JOB
# =========================================================
class JobSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    serial_number_text = serializers.SerializerMethodField()
    technician_name = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        customer = obj.customer

        if customer is None and obj.serial:
            customer = obj.serial.customer

        return customer.customer_name if customer else None

    def get_serial_number_text(self, obj):
        if obj.serial:
            return obj.serial.serial_number
        return None

    def get_technician_name(self, obj):
        if obj.technician:
            return obj.technician.technician_name
        return None

    class Meta:
        model = Job
        fields = [
            "job_id",
            "customer",
            "customer_name",
            "serial",
            "serial_number_text",
            "technician",
            "technician_name",
            "service_date",
            "problem_description",
            "diagnosis",
            "service_type",
            "repair_details",
            "replacement_details",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "job_id",
            "created_at",
            "updated_at",
        ]
# =========================================================
# STAFF JOB UPDATE
# =========================================================


class StaffJobUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = [
            "diagnosis",
            "repair_details",
            "replacement_details",
            "status",
        ]

    def validate(self, attrs):
        current_status = (
            self.instance.status if self.instance else None
        )

        new_status = attrs.get("status", current_status)

        diagnosis = attrs.get(
            "diagnosis",
            self.instance.diagnosis if self.instance else "",
        )

        if new_status == "COMPLETED" and not diagnosis.strip():
            raise serializers.ValidationError({
                "diagnosis": (
                    "Diagnosis is required before completing a job."
                )
            })

        return attrs

# =========================================================
# INVOICE
# =========================================================

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "invoice_id",
            "job",
            "invoice_date",
            "amount",
            "tax_amount",
            "total_amount",
            "payment_status",
            "payment_method",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "invoice_id",
            "created_at",
            "updated_at",
        ]

# =========================================================
# CART
# =========================================================

class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = [
            "cart_id",
            "customer",
            "session_key",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "cart_id",
            "created_at",
            "updated_at",
        ]
# =========================================================
# CART ITEM
# =========================================================

class CartItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = [
            "cart_item_id",
            "cart",
            "product",
            "quantity",
            "subtotal",
            "added_at",
        ]
        read_only_fields = [
            "cart_item_id",
            "subtotal",
            "added_at",
        ]


# =========================================================
# ORDER
# =========================================================

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "order_id",
            "customer",
            "order_date",
            "total_amount",
            "delivery_address",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "order_id",
            "order_date",
            "created_at",
            "updated_at",
        ]


# =========================================================
# ORDER ITEM
# =========================================================

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "order_item_id",
            "order",
            "product",
            "quantity",
            "unit_price",
            "subtotal",
            "created_at",
        ]
        read_only_fields = [
            "order_item_id",
            "created_at",
        ]


# =========================================================
# PAYMENT
# =========================================================

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "payment_id",
            "customer",
            "order",
            "invoice",
            "amount",
            "currency",
            "payment_method",
            "status",
            "transaction_id",
            "gateway_order_id",
            "gateway_payment_id",
            "gateway_signature",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "payment_id",
            "created_at",
            "updated_at",
        ]
class BatteryHealthReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatteryHealthReport
        fields = [
            "report_id",
            "job",
            "report_file",
            "health_status",
            "battery_voltage",
            "remarks",
            "uploaded_by",
            "uploaded_at",
        ]
        read_only_fields = [
            "report_id",
            "job",
            "uploaded_by",
            "uploaded_at",
        ]

    def validate_report_file(self, value):
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
        extension = os.path.splitext(value.name)[1].lower()

        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Upload a PDF, JPG, JPEG, or PNG report."
            )

        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "Report file size must not exceed 10 MB."
            )

        return value