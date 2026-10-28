Hello {{ $booking->invitee_name }},

Your booking has been cancelled by the host.

What: {{ $booking->page->title }}
Originally: {{ $dateLine }}, {{ $timeLine }}
@if ($booking->cancellation_reason)

Reason:
{{ $booking->cancellation_reason }}
@endif

You can book a new time here:
{{ $bookUrl }}
