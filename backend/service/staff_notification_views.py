from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StaffNotification


class StaffNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff access required."},
                status=403,
            )

        notifications = StaffNotification.objects.filter(
            recipient=request.user
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
                    item.read_at.isoformat()
                    if item.read_at
                    else None
                ),
            }
            for item in notifications
        ]

        return Response({
            "notifications": notification_data,
            "total": len(notification_data),
            "unread": notifications.filter(is_read=False).count(),
        })


class MarkStaffNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        if not request.user.is_staff:
            return Response(
                {"detail": "Staff access required."},
                status=403,
            )

        notification = StaffNotification.objects.filter(
            notification_id=notification_id,
            recipient=request.user,
        ).first()

        if notification is None:
            return Response(
                {"detail": "Notification not found."},
                status=404,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(
                update_fields=["is_read", "read_at"]
            )

        return Response({
            "message": "Notification marked as read.",
            "notification_id": notification.notification_id,
            "is_read": notification.is_read,
        })