Hello {{ $booking->invitee_name }},

This is a reminder about your upcoming booking.

What: {{ $booking->page->title }}
When: {{ $dateLine }}, {{ $timeLine }}
@if ($booking->page->location)
Where: {{ $booking->page->location }}
@endif

Need to make a change? Cancel or reschedule here:
{{ $manageUrl }}
