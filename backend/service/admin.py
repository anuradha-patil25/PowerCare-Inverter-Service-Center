from django.contrib import admin
from django.db.models import Window
from django.db.models.functions import RowNumber

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
    StaffNotification,
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "s_no",
        "product_id",
        "product_name",
        "brand",
        "model",
        "product_type",
        "purchase_date",
        "price",
        "stock_quantity",
        "status",
    )

    list_display_links = ("product_name",)

    search_fields = (
        "product_name",
        "brand",
        "model",
    )

    list_filter = (
        "product_type",
        "status",
    )

    ordering = ("product_id",)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            admin_row_number=Window(
                expression=RowNumber(),
                order_by="product_id",
            )
        )

    @admin.display(description="S.No", ordering="admin_row_number")
    def s_no(self, obj):
        return obj.admin_row_number


@admin.register(SerialNumber)
class SerialNumberAdmin(admin.ModelAdmin):
    list_display = (
        "serial_id",
        "serial_number",
        "product",
        "registered_date",
        "status",
    )
    search_fields = (
        "serial_number",
        "product__product_name",
        "product__brand",
        "product__model",
    )
    list_filter = ("status",)
    ordering = ("serial_id",)


@admin.register(Warranty)
class WarrantyAdmin(admin.ModelAdmin):
    list_display = (
        "warranty_id",
        "serial",
        "start_date",
        "end_date",
        "status",
    )
    search_fields = ("serial__serial_number",)
    list_filter = ("status",)
    ordering = ("warranty_id",)


@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = (
        "technician_id",
        "technician_name",
        "phone",
        "specialization",
        "status",
    )
    search_fields = (
        "technician_name",
        "phone",
        "specialization",
    )
    list_filter = ("status",)
    ordering = ("technician_id",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "customer_id",
        "customer_name",
        "phone",
        "email",
        "status",
    )
    search_fields = (
        "customer_name",
        "phone",
        "email",
    )
    list_filter = ("status",)
    ordering = ("customer_id",)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "job_id",
        "customer",
        "serial",
        "technician",
        "service_date",
        "service_type",
        "status",
    )
    search_fields = (
        "problem_description",
        "diagnosis",
        "repair_details",
        "replacement_details",
        "customer__customer_name",
        "serial__serial_number",
        "technician__technician_name",
    )
    list_filter = (
        "service_type",
        "status",
        "service_date",
    )
    ordering = ("-service_date",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_id",
        "job",
        "invoice_date",
        "amount",
        "tax_amount",
        "total_amount",
        "payment_status",
        "payment_method",
        "status",
    )
    search_fields = (
        "job__problem_description",
        "job__customer__customer_name",
        "job__serial__serial_number",
    )
    list_filter = (
        "payment_status",
        "payment_method",
        "status",
        "invoice_date",
    )
    ordering = ("-invoice_date",)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = (
        "cart_id",
        "customer",
        "session_key",
        "status",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "customer__customer_name",
        "customer__phone",
        "session_key",
    )
    list_filter = ("status",)
    ordering = ("-cart_id",)


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = (
        "cart_item_id",
        "cart",
        "product",
        "quantity",
        "added_at",
        "subtotal_display",
    )
    search_fields = (
        "product__product_name",
        "product__brand",
        "product__model",
        "cart__customer__customer_name",
    )
    ordering = ("-cart_item_id",)

    @admin.display(description="Subtotal")
    def subtotal_display(self, obj):
        return obj.subtotal


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_id",
        "customer",
        "order_date",
        "total_amount",
        "delivery_address",
        "status",
    )
    search_fields = (
        "customer__customer_name",
        "customer__phone",
        "delivery_address",
    )
    list_filter = (
        "status",
        "order_date",
    )
    ordering = ("-order_date",)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order_item_id",
        "order",
        "product",
        "quantity",
        "unit_price",
        "subtotal",
        "created_at",
    )
    search_fields = (
        "product__product_name",
        "product__brand",
        "product__model",
    )
    ordering = ("-order_item_id",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
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
        "paid_at",
    )
    search_fields = (
        "customer__customer_name",
        "customer__phone",
        "transaction_id",
        "gateway_order_id",
        "gateway_payment_id",
    )
    list_filter = (
        "payment_method",
        "status",
        "currency",
    )
    ordering = ("-payment_id",)


@admin.register(StaffNotification)
class StaffNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "notification_id",
        "recipient",
        "title",
        "notification_type",
        "is_read",
        "created_at",
    )

    search_fields = (
        "recipient__username",
        "title",
        "message",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )

    ordering = ("-created_at",)