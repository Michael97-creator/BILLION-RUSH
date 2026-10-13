# Billion Rush V10 deployment notes

V10 fixes three deployment blockers in V9: the leaderboard migration now uses the actual `finished_at` column and terminal solo statuses; the multiplayer room enum creation is compatible with PostgreSQL; and question analytics remain staff/server-only.

Deploy migrations 0001 through 0013 in order, then deploy Edge Functions. Do not put service-role or OpenAI secrets in the browser.
