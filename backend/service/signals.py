from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Job, Order, Payment, CustomerNotification


def get_status_label(instance, status):
    status_field = instance._meta.get_field("status")
    status_labels = dict(status_field.choices)
    return status_labels.get(status, status)


# ---------------- JOB NOTIFICATIONS ----------------

@receiver(pre_save, sender=Job)
def capture_previous_job_status(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_status = (
            Job.objects.filter(pk=instance.pk)
            .values_list("status", flat=True)
            .first()
        )
    else:
        instance._previous_status = None


@receiver(post_save, sender=Job)
def create_job_notification(sender, instance, created, **kwargs):
    if not instance.customer_id:
        return

    previous_status = getattr(instance, "_previous_status", None)

    if created:
        title = f"Service Request Received - Job #{instance.pk}"
        message = (
            f"Your service request #{instance.pk} has been received. "
            f"Current status: {get_status_label(instance, instance.status)}."
        )

    elif previous_status is not None and previous_status != instance.status:
        old_label = get_status_label(instance, previous_status)
        new_label = get_status_label(instance, instance.status)

        title = f"Service Status Updated - Job #{instance.pk}"
        message = (
            f"Your service job #{instance.pk} status changed "
            f"from {old_label} to {new_label}."
        )

    else:
        return

    CustomerNotification.objects.create(
        customer=instance.customer,
        title=title,
        message=message,
        notification_type="SERVICE_UPDATE",
    )


# ---------------- ORDER NOTIFICATIONS ----------------

@receiver(pre_save, sender=Order)
def capture_previous_order_status(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_status = (
            Order.objects.filter(pk=instance.pk)
            .values_list("status", flat=True)
            .first()
        )
    else:
        instance._previous_status = None


@receiver(post_save, sender=Order)
def create_order_notification(sender, instance, created, **kwargs):
    previous_status = getattr(instance, "_previous_status", None)

    if created:
        title = f"Order Placed - Order #{instance.pk}"
        message = (
            f"Your order #{instance.pk} has been placed. "
            f"Current status: {get_status_label(instance, instance.status)}."
        )

    elif previous_status is not None and previous_status != instance.status:
        old_label = get_status_label(instance, previous_status)
        new_label = get_status_label(instance, instance.status)

        title = f"Order Status Updated - Order #{instance.pk}"
        message = (
            f"Your order #{instance.pk} status changed "
            f"from {old_label} to {new_label}."
        )

    else:
        return

    CustomerNotification.objects.create(
        customer=instance.customer,
        title=title,
        message=message,
        notification_type="ORDER_UPDATE",
    )


# ---------------- PAYMENT NOTIFICATIONS ----------------

@receiver(pre_save, sender=Payment)
def capture_previous_payment_status(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_status = (
            Payment.objects.filter(pk=instance.pk)
            .values_list("status", flat=True)
            .first()
        )
    else:
        instance._previous_status = None


@receiver(post_save, sender=Payment)
def create_payment_notification(sender, instance, created, **kwargs):
    if not instance.customer_id:
        return

    previous_status = getattr(instance, "_previous_status", None)
    current_status = get_status_label(instance, instance.status)

    if created:
        title = f"Payment Recorded - Payment #{instance.pk}"
        message = (
            f"Your payment record #{instance.pk} has been created. "
            f"Amount: {instance.amount}. "
            f"Current status: {current_status}."
        )

    elif previous_status is not None and previous_status != instance.status:
        old_label = get_status_label(instance, previous_status)

        title = f"Payment Status Updated - Payment #{instance.pk}"
        message = (
            f"Your payment #{instance.pk} status changed "
            f"from {old_label} to {current_status}. "
            f"Amount: {instance.amount}."
        )

    else:
        return

    CustomerNotification.objects.create(
        customer=instance.customer,
        title=title,
        message=message,
        notification_type="PAYMENT",
    )