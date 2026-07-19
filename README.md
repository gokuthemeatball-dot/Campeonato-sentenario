# Kickoff Cup tournament site

## Before publishing

Replace these placeholders in `index.html`:

- `[DATE]`, `[START TIME]`, `[FIELD / PARK NAME]`, and `[CITY, STATE]`
- `[ENTRY FEE]`
- `$YOURCASHTAG` in both the visible payment text and the Cash App link
- `[YOUR EMAIL OR INSTAGRAM]`

## Publish with GitHub Pages

1. Create a GitHub repository and upload these three files.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. Save. GitHub will give you the public website link in a few minutes.

## Organizer access

The Organizer Desk uses Supabase passwordless login. Only the organizer emails
listed in `supabase.js` can open the dashboard. Run `admin-security-setup.sql`
in the Supabase SQL Editor so database row-level security also restricts post,
rule, and tournament-info changes to those accounts.
