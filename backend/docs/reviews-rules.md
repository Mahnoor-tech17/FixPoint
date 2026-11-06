# FixPoint Reviews Specification & Rules

> **Important**: This document establishes the binding rules for the upcoming Reviews feature to be implemented alongside the booking lifecycle. No conflicting review logic or stubs should be introduced.

---

## 1. Access & Roles
- **Customer Only**: Only an authenticated user with the `CUSTOMER` role can create or submit reviews.
- **Providers & Admins Prohibited**: Users with the `PROVIDER` or `ADMIN` roles cannot submit reviews under any circumstances.

---

## 2. Review Types
A customer is permitted to write exactly **TWO** kinds of reviews:
1. **App / Platform Review**:
   - Feedback evaluating the FixPoint platform experience as a whole.
2. **Provider Review**:
   - Feedback evaluating an individual service provider's performance, professionalism, and quality of work.

---

## 3. Eligibility & Verification Preconditions
- **Completed Booking Required**: A customer can write either review type **ONLY** if they have at least one `completed` booking (`status: "completed"`) in the database.
- **Specific Provider Restriction**: A provider review is allowed **ONLY** for a provider with whom the customer actually had a completed booking.
- **One Review per Booking**: Maximum of **one review per completed booking** (prevents duplicate or spam reviews).

---

## 4. Review Content & Moderation Boundaries
- **Rating**: Numeric integer or half-step rating between **1 and 5 stars** (mandatory).
- **Comment**: Textual feedback / comment (optional, with reasonable length limits, e.g., max 1000 characters).
- **Admin Moderation**:
  - Administrators **CAN** moderate reviews by hiding them (`isPublic: false`) or permanently deleting them.
  - Administrators **CANNOT** edit, alter, or tamper with the customer's submitted rating or review text under any circumstances.
