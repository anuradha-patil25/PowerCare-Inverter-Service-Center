from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Customer, CustomerNotification, StaffNotification

class MyNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(user=request.user).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=404,
            )

        notifications = CustomerNotification.objects.filter(
            customer=customer
        ).order_by("-created_at")

        notification_data = [
            {
                "notification_id": item.notification_id,
                "title": item.title,
                "message": item.message,
                "notification_type": item.notification_type,
                "is_read": item.is_read,
                "created_at": item.created_at.isoformat(),
                "read_at": (
                    item.read_at.isoformat() if item.read_at else None
                ),
            }
            for item in notifications
        ]

        return Response({
            "notifications": notification_data,
            "total": len(notification_data),
            "unread": notifications.filter(is_read=False).count(),
        })


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        customer = Customer.objects.filter(user=request.user).first()

        if customer is None:
            return Response(
                {"error": "Customer profile not found."},
                status=404,
            )

        notification = CustomerNotification.objects.filter(
            notification_id=notification_id,
            customer=customer,
        ).first()

        if notification is None:
            return Response(
                {"error": "Notification not found."},
                status=404,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])

        return Response({
            "message": "Notification marked as read.",
            "notification_id": notification.notification_id,
            "is_read": notification.is_read,
        })

class AdminNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin = (
            request.user.is_superuser
            or request.user.groups.filter(name="Admin").exists()
        )

        if not is_admin:
            return Response(
                {"detail": "Admin access required."},
                status=403,
            )

        notification_data = []

        customer_notifications = (
            CustomerNotification.objects
            .select_related("customer")
            .all()
        )

        for item in customer_notifications:
            notification_data.append({
                "notification_key": f"customer-{item.notification_id}",
                "notification_id": item.notification_id,
                "recipient_type": "Customer",
                "recipient_id": item.customer_id,
                "recipient_name": item.customer.customer_name,
                "recipient_email": item.customer.email or "",
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
            })

        staff_notifications = (
            StaffNotification.objects
            .select_related("recipient")
            .all()
        )

        for item in staff_notifications:
            user = item.recipient
            recipient_name = (
                user.get_full_name()
                or user.email
                or user.get_username()
            )

            notification_data.append({
                "notification_key": f"staff-{item.notification_id}",
                "notification_id": item.notification_id,
                "recipient_type": "Staff",
                "recipient_id": user.pk,
                "recipient_name": recipient_name,
                "recipient_email": user.email or "",
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
            })

        notification_data.sort(
            key=lambda item: item["created_at"],
            reverse=True,
        )

        return Response({
            "notifications": notification_data,
            "total": len(notification_data),
            "unread": sum(
                1 for item in notification_data
                if not item["is_read"]
            ),
        })
