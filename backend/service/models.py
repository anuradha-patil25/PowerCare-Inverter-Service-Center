from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


# =========================================================
# PRODUCT
# =========================================================

class Product(models.Model):
    PRODUCT_TYPES = [
        ("INVERTER", "Inverter"),
        ("BATTERY", "Battery"),
    ]

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    product_id = models.BigAutoField(primary_key=True)
    product_name = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    product_type = models.CharField(max_length=30, choices=PRODUCT_TYPES)
    purchase_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand} {self.model}"


# =========================================================
# CUSTOMER
# =========================================================

class Customer(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    customer_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        null=True,
        blank=True,
    )
    customer_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.customer_name


# =========================================================
# SERIAL NUMBER
# =========================================================

class SerialNumber(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("RETIRED", "Retired"),
    ]

    serial_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="serial_numbers",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        related_name="serial_numbers",
        null=True,
        blank=True,
    )
    serial_number = models.CharField(
        max_length=100, unique=True, db_index=True
    )
    registered_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.serial_number


# =========================================================
# WARRANTY
# =========================================================

class Warranty(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("EXPIRED", "Expired"),
        ("CANCELLED", "Cancelled"),
    ]

    warranty_id = models.BigAutoField(primary_key=True)
    serial = models.OneToOneField(
        SerialNumber,
        on_delete=models.PROTECT,
        related_name="warranty",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Warranty {self.warranty_id}"

# =========================================================
# TECHNICIAN
# =========================================================

class Technician(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    ]

    technician_id = models.BigAutoField(primary_key=True)

    # Optional link to a Django login account
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="technician_profile",
    )

    technician_name = models.CharField(max_length=100)

    # Independent technician email, separate from the login user's email
    email = models.EmailField(
        max_length=254,
        null=True,
        blank=True,
    )

    phone = models.CharField(max_length=15)

    specialization = models.CharField(
        max_length=100,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.technician_name

# =========================================================
# JOB
# =========================================================

class Job(models.Model):
    SERVICE_TYPES = [
        ("REPAIR", "Repair"),
        ("REPLACEMENT", "Replacement"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    job_id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="jobs",
        null=True,
        blank=True,
    )
    serial = models.ForeignKey(
        SerialNumber,
        on_delete=models.PROTECT,
        related_name="jobs",
    )
    technician = models.ForeignKey(
        Technician,
        on_delete=models.PROTECT,
        related_name="jobs",
    )
    service_date = models.DateField()
    problem_description = models.TextField()
    diagnosis = models.TextField(blank=True)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES)
    repair_details = models.TextField(blank=True)
    replacement_details = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Job {self.job_id}"


# =========================================================
# INVOICE
# =========================================================

class Invoice(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PARTIAL", "Partial"),
        ("PAID", "Paid"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("RAZORPAY", "Razorpay"),
        ("CASH", "Cash"),
        ("UPI", "UPI"),
    ]

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("CANCELLED", "Cancelled"),
    ]

    invoice_id = models.BigAutoField(primary_key=True)
    job = models.OneToOneField(
        Job,
        on_delete=models.PROTECT,
        related_name="invoice",
    )
    invoice_date = models.DateField()
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="UNPAID",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice {self.invoice_id}"


# =========================================================
# CART
# =========================================================

class Cart(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("ORDERED", "Ordered"),
        ("ABANDONED", "Abandoned"),
    ]

    cart_id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="carts",
        null=True,
        blank=True,
    )
    session_key = models.CharField(
        max_length=100, unique=True, null=True, blank=True
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart {self.cart_id}"


# =========================================================
# CART ITEM
# =========================================================

class CartItem(models.Model):
    cart_item_id = models.BigAutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(
        default=1, validators=[MinValueValidator(1)]
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_cart_product",
            )
        ]

    @property
    def subtotal(self):
        return self.product.price * self.quantity

    def __str__(self):
        return f"{self.product.product_name} x {self.quantity}"


# =========================================================
# ORDER
# =========================================================

class Order(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
    ]

    order_id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, related_name="orders"
    )
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    delivery_address = models.TextField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.order_id}"


# =========================================================
# ORDER ITEM
# =========================================================

class OrderItem(models.Model):
    order_item_id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.order.order_id} - {self.product.product_name}"


# =========================================================
# PAYMENT
# =========================================================

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("RAZORPAY", "Razorpay"),
        ("CASH", "Cash"),
        ("UPI", "UPI"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    ]

    payment_id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, related_name="payments"
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="payments",
        null=True,
        blank=True,
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="payments",
        null=True,
        blank=True,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=10, default="INR")
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING"
    )
    transaction_id = models.CharField(
        max_length=150, unique=True, null=True, blank=True
    )
    gateway_order_id = models.CharField(
        max_length=150, unique=True, null=True, blank=True
    )
    gateway_payment_id = models.CharField(
        max_length=150, unique=True, null=True, blank=True
    )
    gateway_signature = models.CharField(
        max_length=255, null=True, blank=True
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.payment_id}"


# =========================================================
# CUSTOMER NOTIFICATION
# =========================================================

class CustomerNotification(models.Model):
    NOTIFICATION_TYPES = [
        ("SERVICE_UPDATE", "Service Update"),
        ("ORDER_UPDATE", "Order Update"),
        ("WARRANTY", "Warranty"),
        ("PAYMENT", "Payment"),
        ("GENERAL", "General"),
    ]

    notification_id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="GENERAL",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - Customer {self.customer_id}"
# =========================================================
# BATTERY HEALTH REPORT
# =========================================================

class BatteryHealthReport(models.Model):

    HEALTH_STATUS_CHOICES = [
        ("GOOD", "Good"),
        ("FAIR", "Fair"),
        ("POOR", "Poor"),
        ("REPLACE", "Needs Replacement"),
    ]

    report_id = models.BigAutoField(primary_key=True)

    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name="battery_health_reports",
    )

    report_file = models.FileField(
        upload_to="battery_reports/",
    )

    health_status = models.CharField(
        max_length=20,
        choices=HEALTH_STATUS_CHOICES,
        blank=True,
    )

    battery_voltage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )

    remarks = models.TextField(blank=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_battery_reports",
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Battery Report {self.report_id} - Job {self.job_id}"
# =========================================================
# STAFF NOTIFICATION
# =========================================================

class StaffNotification(models.Model):
    NOTIFICATION_TYPES = [
        ("JOB_UPDATE", "Job Update"),
        ("WARRANTY", "Warranty"),
        ("PAYMENT", "Payment"),
        ("GENERAL", "General"),
    ]

    notification_id = models.BigAutoField(primary_key=True)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_notifications",
    )

    title = models.CharField(max_length=150)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="GENERAL",
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.recipient}"

# =========================================================
# AUDIT LOG
# =========================================================

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("STATUS_CHANGE", "Status Change"),
        ("OTHER", "Other"),
    ]

    audit_log_id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    action = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES,
        default="OTHER",
    )

    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} - {self.entity_type} - {self.audit_log_id}"
