# Sending Aagaz passes over WhatsApp

Each attendee gets their own pass — their name, their pass type, and a scannable
QR — as a WhatsApp message the moment their payment is verified. The code for
this is already deployed. It stays dormant until the setup below is done, so a
half-finished configuration can never message guests.

Two switches must both be on:

1. The Meta credentials, set as environment variables on the deployment.
2. **WhatsApp pass delivery**, ticked at `/axp-social/admin`.

Until then, paid bookings fall back to the confirmation email, exactly as today.

---

## Why this needs approval at all

WhatsApp does not let a business message someone who has not messaged it in the
last 24 hours — except with a **template** that Meta has reviewed in advance. A
booking confirmation is always outside that window, so the template is not
optional. Approval usually lands within a few hours, but allow a day.

---

## What you need

| Thing | Where it comes from | Notes |
|---|---|---|
| Meta Business portfolio | business.facebook.com | A verified business, ideally; unverified accounts have low sending limits |
| WhatsApp Business Account (WABA) | Added inside the portfolio | |
| A sending phone number | Added to the WABA | **Must not be active on the normal WhatsApp or WhatsApp Business app.** Use a fresh number, or delete the existing account on it first |
| Phone number ID | WhatsApp → API setup | A numeric id, *not* the phone number |
| Permanent access token | A System User in Business Settings | The 24-hour token on the API setup page is for testing only |
| An approved message template | WhatsApp Manager → Message templates | See below |

### Creating the system user token

Business Settings → Users → System users → Add. Give it **Admin** on the app and
the WABA, then *Generate new token* with the `whatsapp_business_messaging` and
`whatsapp_business_management` permissions and no expiry. Copy it once — Meta
will not show it again.

### Creating the template

Name it `aagaz_pass_confirmation`, category **Utility** (not Marketing — utility
is cheaper and approved faster), language **English**.

- **Header:** set to **Media → Image**. This carries the attendee's QR.
- **Body:** must use exactly six variables, in this order:

  1. attendee name
  2. pass type
  3. event name
  4. date and venue
  5. booking reference
  6. entry code

  For example:

  ```
  Hi {{1}}, your {{2}} for {{3}} is confirmed.
  {{4}}
  Booking {{5}}. Show the QR above at the gate, or quote this code: {{6}}
  ```

- **Footer** (optional): something like `AxP Social · Aagaz`.
- Do **not** add buttons; the sending code does not populate them.

The order matters. The code fills the six slots positionally, so a template with
them rearranged will produce messages with the wrong words in the wrong places.

---

## Environment variables

Set these on Vercel (Project → Settings → Environment Variables), then redeploy —
Next.js reads them at build and boot, so a save alone will not take effect.

```
WHATSAPP_PHONE_NUMBER_ID=        # required, numeric id from API setup
WHATSAPP_ACCESS_TOKEN=           # required, the permanent system user token
WHATSAPP_TEMPLATE_NAME=aagaz_pass_confirmation
WHATSAPP_TEMPLATE_LOCALE=en
WHATSAPP_API_VERSION=v21.0
WHATSAPP_DEFAULT_COUNTRY=91      # prepended to numbers saved without one
WHATSAPP_TEMPLATE_HAS_IMAGE=true # set false only if your template has no image header
```

Also confirm `NEXT_PUBLIC_SITE_URL` is your real public origin. Meta fetches the
QR image from that address, so if it is wrong or unreachable every send fails.

`TICKET_SIGNING_SECRET` must be the same value the rest of the event app uses,
or the QR codes will not verify at the gate.

---

## Turning it on

Open `/axp-social/admin`. The **WhatsApp pass delivery** panel reports whether it
can see the credentials:

- *"Meta credentials are present on this deployment"* — tick the box and save.
- *"No Meta credentials on this deployment yet"* — the variables are missing or
  the deploy that would pick them up has not happened.

---

## Testing before the event

1. Make a ₹1 test booking with your own number as an attendee.
2. You should get a WhatsApp message with the QR as the image.
3. Scan that QR at `/axp-social/dashboard` to confirm the gate accepts it.
4. Check the dashboard's **Pass on WhatsApp** column: it shows *Pass sent* with
   the number, or *Not delivered* with Meta's own reason.

---

## Things that commonly go wrong

- **The number is already on the WhatsApp app.** A number registered to consumer
  WhatsApp or the WhatsApp Business app cannot be used by the API. Delete that
  account first, or use a different number.
- **Using the temporary token.** The one on the API setup page expires in 24
  hours and sends start failing silently the next day. Use a system user token.
- **Template edited after approval.** Changing the body re-opens review, and
  sends fail with a template-mismatch error until it is approved again.
- **Unverified business sending limits.** A new WABA can message a limited number
  of unique users per day. For a 200-person event, verify the business first.
- **Attendee numbers without a country code.** Ten-digit numbers get `+91`
  automatically. Anything else needs the country code in the booking form, or it
  is reported as unusable rather than sent.
- **Guests who blocked the business or never had WhatsApp.** These report as
  *Not delivered* in the dashboard. Email remains the fallback for them.

---

## What it costs

Meta charges per conversation, not per message. Utility conversations in India
are a fraction of a rupee each at the time of writing, so a 200-guest event costs
very little — but check current pricing, as Meta changes it.
