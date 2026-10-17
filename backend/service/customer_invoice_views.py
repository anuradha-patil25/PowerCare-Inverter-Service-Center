from django.db.models import Prefetch

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Customer, Invoice, Payment


class MyInvoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(user=request.user).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=404,
            )

        invoices = (
            Invoice.objects
            .filter(
                job__customer=customer,
                status="ACTIVE",
            )
            .select_related(
                "job__serial__product",
                "job__technician",
            )
            .prefetch_related(
                Prefetch(
                    "payments",
                    queryset=Payment.objects.filter(
                        customer=customer
                    ).order_by("-created_at"),
                    to_attr="customer_payments",
                )
            )
            .order_by("-invoice_date", "-invoice_id")
        )

        invoice_data = []

        for invoice in invoices:
            job = invoice.job
            serial = job.serial
            product = serial.product

            payments_data = []

            for payment in invoice.customer_payments:
                payments_data.append({
                    "payment_id": payment.payment_id,
                    "amount": str(payment.amount),
                    "currency": payment.currency,
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "transaction_id": payment.transaction_id,
                    "paid_at": (
                        payment.paid_at.isoformat()
                        if payment.paid_at
                        else None
                    ),
                    "created_at": payment.created_at.isoformat(),
                })

            invoice_data.append({
                "invoice_id": invoice.invoice_id,
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
                    "service_type": job.service_type,
                    "service_status": job.status,
                    "serial_number": serial.serial_number,
                    "product_name": product.product_name,
                    "brand": product.brand,
                    "model": product.model,
                    "technician_name": job.technician.technician_name,
                },
                "payments": payments_data,
            })

        return Response({
            "invoices": invoice_data,
            "total": len(invoice_data),
        })