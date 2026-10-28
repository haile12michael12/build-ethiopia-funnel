Hello {{ $booking->invitee_name }},

Your booking is {{ $rescheduled ? 'updated' : 'confirmed' }}.

What: {{ $booking->page->title }}
When: {{ $dateLine }}, {{ $timeLine }}
@if ($booking->page->location)
Where: {{ $booking->page->location }}
@endif
@if ($booking->page->description)

{{ $booking->page->description }}
@endif

Need to make a change? Cancel or reschedule here:
{{ $manageUrl }}
