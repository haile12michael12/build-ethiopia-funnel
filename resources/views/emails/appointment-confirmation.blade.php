Your appointment is confirmed

Hello {{ $appointment->contact_name }},

Thank you for booking with us. Here are the details of your appointment.

Company: {{ $appointment->company_name }}
Service: {{ $appointment->service_label }}
Meeting type: {{ $appointment->meeting_type }}
Date and time: {{ $appointment->start_at->setTimezone($appointment->timezone)->translatedFormat('l, F j, Y · H:i') }} ({{ $appointment->timezone }})
Duration: {{ $appointment->duration_minutes }} minutes

If you need to reschedule or cancel, reply to this email as soon as possible.

Notes:
{{ $appointment->notes ?: 'None provided.' }}
