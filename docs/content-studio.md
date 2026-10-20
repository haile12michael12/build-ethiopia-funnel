# Agency Content Studio

The authenticated Content Studio keeps agency marketing drafts separate from
public website content. It supports English and Amharic briefs, configurable
brand settings, published service/portfolio references, version snapshots,
review and approval, manual scheduling, and manual publication/failure
tracking.

## AI configuration

Generation uses the existing server-side funnel AI configuration. Set these
environment variables on the application server:

```dotenv
FUNNEL_AI_DRIVER=openai-compatible
FUNNEL_AI_ENDPOINT=https://api.openai.com/v1/responses
FUNNEL_AI_API_KEY=
FUNNEL_AI_MODEL=
FUNNEL_AI_TIMEOUT=45
```

Without a configured provider, users can still create and edit ideas manually;
generation reports that the provider is unavailable. Requests are rate-limited.
Provider credentials are never sent to the browser. Generation sends only the
selected brief, reusable brand settings, configured service labels, published
service copy, and an explicitly selected published portfolio project. It does
not send contact or prospect data. Provider/model and prompt-template version
are recorded with generated drafts, not the complete prompt or credentials.

AI output is untrusted copy, not verified evidence. Review every claim,
especially any claim about project results, clients, certifications, or
testimonials, before approval. Generated drafts are never published
automatically.

## Review and publication limits

The current application has no social publishing connector or platform
credentials. A scheduled item is a manual reminder, not an outbound job. An
authorized user must confirm a manual publication before the status changes to
Published; an optional HTTPS URL may be recorded. A failed manual attempt can
be recorded with a reason. These statuses report user-confirmed actions and do
not independently verify a platform post.

The existing authentication model is single-owner and has no content-specific
team roles. The same owner can submit, approve, schedule, and publish. Do not
interpret the approval state as multi-person approval.

## Deployment

Apply the additive migration after reviewing it:

```bash
php artisan migrate
```

No external publishing credentials or queue workers are required for the
manual content workflow. AI generation calls the configured provider during
the authenticated request and uses the configured AI timeout; configure a
provider only if this tradeoff is acceptable for the deployment.
