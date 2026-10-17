import uuid

from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Cart,
    CartItem,
    Customer,
    CustomerNotification,
    Invoice,
    Job,
    Order,
    OrderItem,
    Payment,
    SerialNumber,
    Technician,
    Warranty,
)


# =====================================================
# CHECKOUT — CREATE ORDER WITH DEMO PAYMENT
# No real money is collected or transferred.
# =====================================================

class CheckoutCreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        session_key = str(
            request.data.get("session_key", "")
        ).strip()

        delivery_address = str(
            request.data.get("delivery_address", "")
        ).strip()

        payment_method = str(
            request.data.get("payment_method", "")
        ).strip().upper()

        if not session_key:
            return Response(
                {"error": "Cart session key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not delivery_address:
            return Response(
                {"error": "Delivery address is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_methods = {"CASH", "UPI", "RAZORPAY"}

        if payment_method not in allowed_methods:
            return Response(
                {
                    "error": (
                        "Choose Cash, UPI, or Razorpay Demo."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = (
            Cart.objects.select_for_update()
            .filter(
                session_key=session_key,
                customer=customer,
                status="ACTIVE",
            )
            .first()
        )

        # Allow an anonymous cart only when it has no other owner.
        if cart is None:
            cart = (
                Cart.objects.select_for_update()
                .filter(
                    session_key=session_key,
                    customer__isnull=True,
                    status="ACTIVE",
                )
                .first()
            )

        if cart is None:
            return Response(
                {"error": "Active cart not found. Please refresh your cart."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cart_items = list(
            CartItem.objects
            .filter(cart=cart)
            .select_related("product")
        )

        if not cart_items:
            return Response(
                {"error": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_amount = 0

        for item in cart_items:
            product = item.product

            if product.status != "ACTIVE":
                return Response(
                    {
                        "error": (
                            f"{product.product_name} is unavailable."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if item.quantity > product.stock_quantity:
                return Response(
                    {
                        "error": (
                            f"Insufficient stock for "
                            f"{product.product_name}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            total_amount += product.price * item.quantity

        order = Order.objects.create(
            customer=customer,
            total_amount=total_amount,
            delivery_address=delivery_address,
            status="PENDING",
        )

        for item in cart_items:
            product = item.product

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                unit_price=product.price,
                subtotal=product.price * item.quantity,
            )

        # DEMO ONLY: this is not a real payment gateway.
        demo_transaction_id = (
            f"DEMO-ORDER-{order.order_id}-"
            f"{uuid.uuid4().hex[:12].upper()}"
        )

        payment = Payment.objects.create(
            customer=customer,
            order=order,
            amount=total_amount,
            currency="INR",
            payment_method=payment_method,
            status="SUCCESS",
            transaction_id=demo_transaction_id,
            paid_at=timezone.now(),
        )

        order.status = "CONFIRMED"
        order.save(update_fields=["status", "updated_at"])

        # Mark this cart as ordered and release its session key.
        cart.customer = customer
        cart.status = "ORDERED"
        cart.session_key = None

        cart.save(
            update_fields=[
                "customer",
                "status",
                "session_key",
                "updated_at",
            ]
        )

        # Create an order confirmation notification.
        CustomerNotification.objects.get_or_create(
            customer=customer,
            title=f"Order #{order.order_id} confirmed",
            defaults={
                "message": (
                    f"Your order #{order.order_id} is confirmed. "
                    f"Total amount: Rs. {order.total_amount}. "
                    "Payment is recorded as a demo transaction."
                ),
                "notification_type": "ORDER_UPDATE",
            },
        )

        # Create a payment notification.
        CustomerNotification.objects.get_or_create(
            customer=customer,
            title=f"Payment received for Order #{order.order_id}",
            defaults={
                "message": (
                    f"Demo payment of Rs. {payment.amount} was recorded "
                    f"for Order #{order.order_id}. "
                    f"Reference: {payment.transaction_id or 'N/A'}."
                ),
                "notification_type": "PAYMENT",
            },
        )

        return Response(
            {
                "message": (
                    "Demo payment successful. No real money "
                    "was charged."
                ),
                "demo_payment": True,
                "order_id": order.order_id,
                "customer_id": customer.customer_id,
                "total_amount": str(order.total_amount),
                "delivery_address": order.delivery_address,
                "status": order.status,
                "items_count": len(cart_items),
                "payment": {
                    "payment_id": payment.payment_id,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "transaction_id": payment.transaction_id,
                    "paid_at": payment.paid_at.isoformat(),
                },
            },
            status=status.HTTP_201_CREATED,
        )


# =====================================================
# CUSTOMER — PAY EXISTING ORDER
# Simulated payment only.
# =====================================================

class OrderDemoPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = str(
            request.data.get("payment_method", "")
        ).strip().upper()

        allowed_methods = {"CASH", "UPI", "RAZORPAY"}

        if payment_method not in allowed_methods:
            return Response(
                {
                    "error": (
                        "Choose Cash, UPI, or Online Payment."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = (
            Order.objects.select_for_update()
            .filter(
                order_id=order_id,
                customer=customer,
            )
            .first()
        )

        if order is None:
            return Response(
                {"error": "Order not found for this customer."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing_payment = (
            Payment.objects.filter(
                order=order,
                status="SUCCESS",
            )
            .order_by("-payment_id")
            .first()
        )

        if existing_payment:
            return Response(
                {
                    "message": "Payment has already been completed.",
                    "order_id": order.order_id,
                    "status": order.status,
                    "payment": {
                        "payment_id": existing_payment.payment_id,
                        "payment_method": existing_payment.payment_method,
                        "status": existing_payment.status,
                        "transaction_id": existing_payment.transaction_id,
                        "paid_at": (
                            existing_payment.paid_at.isoformat()
                            if existing_payment.paid_at
                            else None
                        ),
                    },
                    "demo_payment": True,
                },
                status=status.HTTP_200_OK,
            )

        if order.status == "CANCELLED":
            return Response(
                {
                    "error": (
                        "Payment is not available for cancelled orders."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        transaction_id = (
            f"DEMO-ORDER-{order.order_id}-"
            f"{uuid.uuid4().hex[:12].upper()}"
        )

        payment = Payment.objects.create(
            customer=customer,
            order=order,
            amount=order.total_amount,
            currency="INR",
            payment_method=payment_method,
            status="SUCCESS",
            transaction_id=transaction_id,
            paid_at=timezone.now(),
        )

        order.status = "CONFIRMED"
        order.save(update_fields=["status", "updated_at"])

        CustomerNotification.objects.get_or_create(
            customer=customer,
            title=f"Order #{order.order_id} confirmed",
            defaults={
                "message": (
                    f"Your order #{order.order_id} is confirmed. "
                    f"Total amount: Rs. {order.total_amount}."
                ),
                "notification_type": "ORDER_UPDATE",
            },
        )

        CustomerNotification.objects.get_or_create(
            customer=customer,
            title=f"Payment received for Order #{order.order_id}",
            defaults={
                "message": (
                    f"Demo payment of Rs. {payment.amount} was recorded "
                    f"for Order #{order.order_id}. "
                    f"Reference: {payment.transaction_id or 'N/A'}."
                ),
                "notification_type": "PAYMENT",
            },
        )

        return Response(
            {
                "message": "Demo payment completed successfully.",
                "order_id": order.order_id,
                "status": order.status,
                "payment": {
                    "payment_id": payment.payment_id,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "transaction_id": payment.transaction_id,
                    "paid_at": payment.paid_at.isoformat(),
                },
                "demo_payment": True,
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — MY ORDERS
# =====================================================

class MyOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        orders = (
            Order.objects
            .filter(customer=customer)
            .prefetch_related("items__product", "payments")
            .order_by("-order_date")
        )

        orders_data = []

        for order in orders:
            items_data = []

            for item in order.items.all():
                items_data.append(
                    {
                        "order_item_id": item.order_item_id,
                        "product_id": item.product_id,
                        "product_name": item.product.product_name,
                        "brand": item.product.brand,
                        "model": item.product.model,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "subtotal": str(item.subtotal),
                    }
                )

            latest_payment = (
                order.payments.order_by("-payment_id").first()
            )

            orders_data.append(
                {
                    "order_id": order.order_id,
                    "order_date": order.order_date.isoformat(),
                    "total_amount": str(order.total_amount),
                    "delivery_address": order.delivery_address,
                    "status": order.status,
                    "items": items_data,
                    "payment": (
                        {
                            "payment_id": latest_payment.payment_id,
                            "payment_method": latest_payment.payment_method,
                            "status": latest_payment.status,
                            "transaction_id": latest_payment.transaction_id,
                            "paid_at": (
                                latest_payment.paid_at.isoformat()
                                if latest_payment.paid_at
                                else None
                            ),
                        }
                        if latest_payment
                        else None
                    ),
                }
            )

        return Response(
            {"orders": orders_data},
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — CREATE SERVICE REQUEST
# =====================================================

class ServiceRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {
                    "error": (
                        "Customer profile not found. "
                        "Please use a customer account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serial_number = str(
            request.data.get("serial_number", "")
        ).strip()

        problem_description = str(
            request.data.get("problem_description", "")
        ).strip()

        service_type = str(
            request.data.get("service_type", "REPAIR")
        ).strip().upper()

        if not serial_number:
            return Response(
                {"error": "Product serial number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(problem_description) < 5:
            return Response(
                {
                    "error": (
                        "Please describe the problem in at least "
                        "5 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_service_types = {
            choice[0] for choice in Job.SERVICE_TYPES
        }

        if service_type not in valid_service_types:
            return Response(
                {
                    "error": (
                        "Service type must be REPAIR or REPLACEMENT."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only allow service requests for this customer's registered serial.
        serial = (
            SerialNumber.objects
            .select_related("product")
            .filter(
                serial_number__iexact=serial_number,
                customer=customer,
                status="ACTIVE",
            )
            .first()
        )

        if serial is None:
            return Response(
                {
                    "error": (
                        "Active serial number was not found under "
                        "your account. Please contact the service "
                        "centre if your purchased product is not registered."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        technician = (
            Technician.objects
            .filter(status="ACTIVE")
            .order_by("technician_id")
            .first()
        )

        if technician is None:
            return Response(
                {
                    "error": (
                        "No active technician is available. "
                        "Please contact the service centre."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = Job.objects.create(
            customer=customer,
            serial=serial,
            technician=technician,
            service_date=timezone.localdate(),
            problem_description=problem_description,
            diagnosis="",
            service_type=service_type,
            repair_details="",
            replacement_details="",
            status="PENDING",
        )

        CustomerNotification.objects.get_or_create(
            customer=customer,
            title=f"Service request #{job.job_id} submitted",
            defaults={
                "message": (
                    f"Your service request #{job.job_id} has been submitted. "
                    f"Current status: {job.status}."
                ),
                "notification_type": "SERVICE_UPDATE",
            },
        )

        return Response(
            {
                "message": "Service request submitted successfully.",
                "job_id": job.job_id,
                "serial_number": serial.serial_number,
                "product_name": serial.product.product_name,
                "technician_name": technician.technician_name,
                "service_date": job.service_date.isoformat(),
                "service_type": job.service_type,
                "status": job.status,
            },
            status=status.HTTP_201_CREATED,
        )


# =====================================================
# CUSTOMER — MY SERVICE REQUESTS / SERVICE HISTORY
# =====================================================

class MyServiceRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        jobs = (
            Job.objects
            .filter(customer=customer)
            .select_related(
                "serial__product",
                "technician",
            )
            .order_by("-service_date", "-job_id")
        )

        service_requests = []

        for job in jobs:
            serial = job.serial
            product = serial.product if serial else None
            technician = job.technician

            service_requests.append(
                {
                    "job_id": job.job_id,
                    "service_date": (
                        job.service_date.isoformat()
                        if job.service_date
                        else None
                    ),
                    "serial_number": (
                        serial.serial_number if serial else ""
                    ),
                    "product_name": (
                        product.product_name if product else ""
                    ),
                    "brand": product.brand if product else "",
                    "model": product.model if product else "",
                    "problem_description": job.problem_description,
                    "diagnosis": job.diagnosis,
                    "service_type": job.service_type,
                    "repair_details": job.repair_details,
                    "replacement_details": job.replacement_details,
                    "technician_name": (
                        technician.technician_name
                        if technician
                        else ""
                    ),
                    "status": job.status,
                }
            )

        return Response(
            {
                "service_requests": service_requests,
                "total": len(service_requests),
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — MY PRODUCTS / SERIAL NUMBERS
# =====================================================

class MyProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Registered serial-number records.
        serials = list(
            SerialNumber.objects
            .filter(customer=customer)
            .select_related("product")
            .order_by("-registered_date", "-serial_id")
        )

        warranty_records = Warranty.objects.filter(
            serial__in=serials
        ).values(
            "serial_id",
            "start_date",
            "end_date",
            "status",
        )

        warranty_by_serial = {
            record["serial_id"]: record
            for record in warranty_records
        }

        products_data = []
        registered_count_by_product = {}

        for serial in serials:
            product = serial.product

            registered_count_by_product[product.product_id] = (
                registered_count_by_product.get(
                    product.product_id, 0
                ) + 1
            )

            warranty = warranty_by_serial.get(serial.serial_id)

            warranty_data = None

            if warranty:
                warranty_data = {
                    "start_date": (
                        warranty["start_date"].isoformat()
                        if warranty["start_date"]
                        else None
                    ),
                    "end_date": (
                        warranty["end_date"].isoformat()
                        if warranty["end_date"]
                        else None
                    ),
                    "status": warranty["status"],
                }

            products_data.append(
                {
                    "item_id": f"serial-{serial.serial_id}",
                    "source": "SERIAL",
                    "serial_id": serial.serial_id,
                    "serial_number": serial.serial_number,
                    "registered_date": (
                        serial.registered_date.isoformat()
                        if serial.registered_date
                        else None
                    ),
                    "purchase_date": None,
                    "purchase_order_id": None,
                    "quantity": 1,
                    "serial_status": serial.status,
                    "product": {
                        "product_id": product.product_id,
                        "product_name": product.product_name,
                        "brand": product.brand,
                        "model": product.model,
                        "product_type": product.product_type,
                        "image": (
                            product.image.url
                            if product.image
                            else None
                        ),
                        "status": product.status,
                    },
                    "warranty": warranty_data,
                }
            )

        # Purchased products not yet registered with serial numbers.
        order_items = list(
            OrderItem.objects
            .filter(
                order__customer=customer,
                order__status__in=["CONFIRMED", "DELIVERED"],
            )
            .select_related("product", "order")
            .order_by("-order__order_date", "-order_item_id")
        )

        purchased_count_by_product = {}

        for item in order_items:
            product_id = item.product_id
            purchased_count_by_product[product_id] = (
                purchased_count_by_product.get(product_id, 0)
                + item.quantity
            )

        remaining_by_product = {
            product_id: max(
                purchased_count
                - registered_count_by_product.get(product_id, 0),
                0,
            )
            for product_id, purchased_count
            in purchased_count_by_product.items()
        }

        for item in order_items:
            product = item.product
            product_id = product.product_id
            remaining = remaining_by_product.get(product_id, 0)

            if remaining <= 0:
                continue

            display_quantity = min(item.quantity, remaining)

            products_data.append(
                {
                    "item_id": f"order-item-{item.order_item_id}",
                    "source": "ORDER",
                    "serial_id": None,
                    "serial_number": None,
                    "registered_date": None,
                    "purchase_date": (
                        item.order.order_date.date().isoformat()
                        if item.order.order_date
                        else None
                    ),
                    "purchase_order_id": item.order.order_id,
                    "quantity": display_quantity,
                    "serial_status": "NOT_REGISTERED",
                    "product": {
                        "product_id": product.product_id,
                        "product_name": product.product_name,
                        "brand": product.brand,
                        "model": product.model,
                        "product_type": product.product_type,
                        "image": (
                            product.image.url
                            if product.image
                            else None
                        ),
                        "status": product.status,
                    },
                    "warranty": None,
                }
            )

            remaining_by_product[product_id] -= display_quantity

        return Response(
            {
                "products": products_data,
                "total": len(products_data),
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — INVOICES, SERVICE INVOICES AND ORDER RECEIPTS
# =====================================================

class MyInvoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        results = []

        # Existing service invoices.
        service_invoices = (
            Invoice.objects
            .filter(job__customer=customer)
            .select_related(
                "job__serial__product",
                "job__technician",
            )
            .prefetch_related("payments")
            .order_by("-invoice_date", "-invoice_id")
        )

        for invoice in service_invoices:
            job = invoice.job
            serial = job.serial
            product = serial.product
            technician = job.technician

            payment_rows = [
                {
                    "payment_id": payment.payment_id,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "transaction_id": payment.transaction_id,
                    "amount": str(payment.amount),
                    "paid_at": (
                        payment.paid_at.isoformat()
                        if payment.paid_at
                        else None
                    ),
                }
                for payment in invoice.payments.all().order_by(
                    "-payment_id"
                )
            ]

            results.append(
                {
                    "record_type": "SERVICE_INVOICE",
                    "invoice_id": invoice.invoice_id,
                    "order_id": None,
                    "invoice_date": invoice.invoice_date.isoformat(),
                    "amount": str(invoice.amount),
                    "tax_amount": str(invoice.tax_amount),
                    "total_amount": str(invoice.total_amount),
                    "payment_status": invoice.payment_status,
                    "payment_method": invoice.payment_method,
                    "status": invoice.status,
                    "job": {
                        "job_id": job.job_id,
                        "service_date": job.service_date.isoformat(),
                        "product_name": product.product_name,
                        "brand": product.brand,
                        "model": product.model,
                        "serial_number": serial.serial_number,
                        "service_type": job.service_type,
                        "service_status": job.status,
                        "technician_name": (
                            technician.technician_name
                            if technician
                            else ""
                        ),
                    },
                    "order": None,
                    "payments": payment_rows,
                }
            )

        # Product-order receipts based on actual orders and payments.
        orders = (
            Order.objects
            .filter(customer=customer)
            .exclude(status="CANCELLED")
            .prefetch_related("items__product", "payments")
            .order_by("-order_date", "-order_id")
        )

        for order in orders:
            payment_objects = list(
                order.payments.all().order_by("-payment_id")
            )

            payment_rows = [
                {
                    "payment_id": payment.payment_id,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "transaction_id": payment.transaction_id,
                    "amount": str(payment.amount),
                    "paid_at": (
                        payment.paid_at.isoformat()
                        if payment.paid_at
                        else None
                    ),
                }
                for payment in payment_objects
            ]

            successful_payments = [
                payment
                for payment in payment_objects
                if payment.status == "SUCCESS"
            ]

            payment_status = (
                "PAID" if successful_payments else "UNPAID"
            )

            latest_payment = (
                successful_payments[0]
                if successful_payments
                else (
                    payment_objects[0]
                    if payment_objects
                    else None
                )
            )

            order_items = [
                {
                    "order_item_id": item.order_item_id,
                    "product_id": item.product_id,
                    "product_name": item.product.product_name,
                    "brand": item.product.brand,
                    "model": item.product.model,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "subtotal": str(item.subtotal),
                }
                for item in order.items.all()
            ]

            results.append(
                {
                    "record_type": "ORDER_RECEIPT",
                    "invoice_id": None,
                    "order_id": order.order_id,
                    "invoice_date": order.order_date.date().isoformat(),
                    "amount": str(order.total_amount),
                    "tax_amount": "0.00",
                    "total_amount": str(order.total_amount),
                    "payment_status": payment_status,
                    "payment_method": (
                        latest_payment.payment_method
                        if latest_payment
                        else None
                    ),
                    "status": order.status,
                    "job": None,
                    "order": {
                        "order_id": order.order_id,
                        "order_date": order.order_date.isoformat(),
                        "status": order.status,
                        "delivery_address": order.delivery_address,
                        "items": order_items,
                    },
                    "payments": payment_rows,
                }
            )

        results.sort(
            key=lambda item: item["invoice_date"] or "",
            reverse=True,
        )

        return Response(
            {"invoices": results, "total": len(results)},
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — NOTIFICATIONS
# =====================================================

class MyNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Backfill notifications for existing orders so that earlier
        # orders also become visible in this customer's notification list.
        for order in Order.objects.filter(customer=customer):
            if order.status == "CONFIRMED":
                order_title = f"Order #{order.order_id} confirmed"
            else:
                order_title = (
                    f"Order #{order.order_id} status update"
                )

            CustomerNotification.objects.get_or_create(
                customer=customer,
                title=order_title,
                defaults={
                    "message": (
                        f"Your order #{order.order_id} has status "
                        f"{order.status}. Total: Rs. {order.total_amount}."
                    ),
                    "notification_type": "ORDER_UPDATE",
                },
            )

            successful_payments = Payment.objects.filter(
                customer=customer,
                order=order,
                status="SUCCESS",
            )

            if successful_payments.exists():
                latest_payment = successful_payments.order_by(
                    "-payment_id"
                ).first()

                CustomerNotification.objects.get_or_create(
                    customer=customer,
                    title=(
                        f"Payment received for Order #{order.order_id}"
                    ),
                    defaults={
                        "message": (
                            f"Your demo payment of Rs. "
                            f"{latest_payment.amount} was recorded "
                            f"for Order #{order.order_id}. "
                            f"Reference: "
                            f"{latest_payment.transaction_id or 'N/A'}."
                        ),
                        "notification_type": "PAYMENT",
                    },
                )

        for job in Job.objects.filter(customer=customer):
            CustomerNotification.objects.get_or_create(
                customer=customer,
                title=f"Service job #{job.job_id} update",
                defaults={
                    "message": (
                        f"Your service job #{job.job_id} currently "
                        f"has status {job.status}."
                    ),
                    "notification_type": "SERVICE_UPDATE",
                },
            )

        notifications = CustomerNotification.objects.filter(
            customer=customer
        ).order_by("-created_at")

        records = [
            {
                "notification_id": item.notification_id,
                "title": item.title,
                "message": item.message,
                "notification_type": item.notification_type,
                "is_read": item.is_read,
                "created_at": item.created_at.isoformat(),
                "read_at": (
                    item.read_at.isoformat()
                    if item.read_at
                    else None
                ),
            }
            for item in notifications
        ]

        return Response(
            {
                "notifications": records,
                "total": len(records),
                "unread": sum(
                    1 for item in records if not item["is_read"]
                ),
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# CUSTOMER — MARK NOTIFICATION AS READ
# =====================================================

class CustomerNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        customer = Customer.objects.filter(
            user=request.user
        ).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification = CustomerNotification.objects.filter(
            notification_id=notification_id,
            customer=customer,
        ).first()

        if notification is None:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(
                update_fields=["is_read", "read_at"]
            )

        return Response(
            {
                "message": "Notification marked as read.",
                "notification_id": notification.notification_id,
                "is_read": notification.is_read,
                "read_at": (
                    notification.read_at.isoformat()
                    if notification.read_at
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )