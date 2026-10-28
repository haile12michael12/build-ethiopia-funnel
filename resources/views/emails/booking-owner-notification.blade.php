Booking {{ $action }}@if ($action === 'cancelled' && $cancelledBy) by {{ $cancelledBy }}@endif

Page: {{ $booking->page->title }}
Invitee: {{ $booking->invitee_name }} <{{ $booking->invitee_email }}>
Phone: {{ $booking->invitee_phone ?: 'Not provided' }}
When: {{ $dateLine }}, {{ $timeLine }}
Status: {{ $booking->status }}
@if ($booking->invitee_notes)

Notes from invitee:
{{ $booking->invitee_notes }}
@endif
@if ($action === 'cancelled' && $booking->cancellation_reason)

Cancellation reason:
{{ $booking->cancellation_reason }}
@endif

Manage bookings: {{ $appointmentsUrl }}
@if ($contactUrl)
View contact: {{ $contactUrl }}
@endif
