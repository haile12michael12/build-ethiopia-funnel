New appointment booked

Company: {{ $appointment->company_name }}
Contact: {{ $contact->name ?: 'Not provided' }} <{{ $appointment->email }}>
Phone: {{ $appointment->phone ?: 'Not provided' }}
Service: {{ $appointment->service_label }}
Meeting type: {{ $appointment->meeting_type }}
Scheduled: {{ $appointment->start_at->setTimezone($appointment->timezone)->translatedFormat('l, F j, Y · H:i') }} ({{ $appointment->timezone }})
Status: {{ $appointment->status }}
Lead score: {{ $contact->lead_score ?? 'Not scored' }}

Notes:
{{ $appointment->notes ?: 'Not provided' }}

Manage appointments: {{ url('/appointments') }}
