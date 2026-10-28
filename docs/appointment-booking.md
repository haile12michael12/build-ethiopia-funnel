# B2B Appointment / Demo Scheduler

A public scheduling feature that lets other businesses book a demo or
consultation directly with the business owner. It is an optional, owner-managed
capability that complements the existing `/start-project` client-acquisition
funnel: `/start-project` captures project inquiries, while `/book-a-demo`
captures a specific meeting time.

## Overview

- **Public booking page** — `GET /book-a-demo`, rendered by
  `AppointmentController@show` as the `appointments/book` Inertia page.
- **Availability API** — `GET /book-a-demo/availability?date=YYYY-MM-DD` returns
  open "HH:MM" slots for a date. Rate limited with `throttle:30,60`.
- **Booking submission** — `POST /book-a-demo`, validated by
  `StoreAppointmentRequest` and handled by `AppointmentController@store`.
- **Confirmation page** — a signed, temporary route
  `GET /book-a-demo/thank-you/{appointment}` that shows the booked details.
- **Owner dashboard** — `GET /admin/appointments/manage` lists demo-scheduler
  appointments with filters and status actions (confirm, complete, no-show,
  cancel). It complements the calendar-booking dashboard at `/admin/appointments`.
- **Customer portal** — when the visitor is logged in, the booking is linked to
  their account via `Contact.customer_user_id` and appears on their dashboard at
  `GET /dashboard` (route `customer.dashboard`).

## How a booking is stored

A booking creates three things atomically:

1. A `Contact` owned by the configured business owner, with
   `source = appointment_booking`, a `client_project` payload (company, service,
   meeting type, notes, attribution), an explainable lead score, and an
   `appointment_booked` activity.
2. A `ContactSubmission` with `form_id = appointment-booking`.
3. An `Appointment` row linked to the contact, storing the company, service,
   meeting type, start time, timezone, status, and notes.

It also creates a pending follow-up task for the owner ("Prepare for the demo")
due one hour before the meeting, and dispatches
`SendAppointmentNotifications` (owner email + visitor confirmation + optional
webhook).

## Availability rules

`App\Services\AppointmentSchedule` computes slots deterministically. It never
crawls the visitor's site and never invents capacity.

- Business hours, slot length, buffer, booking window, daily cap, and meeting
  types come from the owner's Client Acquisition settings, falling back to
  `config/appointments.php`.
- All times are interpreted in the configured appointment timezone (default
  `Africa/Addis_Ababa`) and persisted in the application timezone. Times are
  never converted between currencies or timezones for display.
- A candidate slot conflicts with an existing `pending`/`confirmed` appointment
  when the candidate plus its buffer overlaps an existing appointment plus its
  buffer.
- Past dates, times outside business hours, and fully booked days are rejected.

## Configuration

The owner enables and tunes the scheduler from
`/settings/client-acquisition` (the "B2B appointment scheduler" section):

| Setting | Purpose |
| --- | --- |
| `appointment_enabled` | Shows/hides the `/book-a-demo` page and nav link. |
| `appointment_timezone` | IANA timezone for slot generation and display. |
| `appointment_slot_minutes` | Minutes between start times (15–240). |
| `appointment_buffer_minutes` | Minimum gap between meetings. |
| `appointment_advance_days` | How far ahead visitors may book. |
| `appointment_max_per_day` | Maximum confirmed meetings per day. |
| `appointment_business_hours` | `{ start, end }` "HH:MM" window. |
| `appointment_meeting_types` | Selectable meeting types (key + EN/AM labels). |

`config/appointments.php` provides defaults; `BUSINESS_AUDIT_OWNER_ID` must
point at the existing account that owns the leads. No new environment keys are
required.

## Privacy and safety

- Public endpoints rate limit submissions (`throttle:6,10`) and availability
  lookups (`throttle:30,60`).
- Email/phone are stored only on the owner-owned contact, consistent with the
  existing CRM-lite model. Attribution only accepts the existing whitelisted
  UTM/device fields and same-site landing paths.
- A visitor's own confirmation email goes only to the email they submit.
- Owner-only routes require the `business-owner` middleware and ownership
  checks; a non-owner cannot view or change another owner's appointments.

## Tests

`tests/Feature/AppointmentBookingTest.php` covers the public page, availability
rules (business hours, booked-slot exclusion), booking persistence and scoring,
duplicate-slot rejection, contact update-on-repeat, owner-only access, status
transitions, and appointment settings updates.
