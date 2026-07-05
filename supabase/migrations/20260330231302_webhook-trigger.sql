-- Creating a webhook trigger payload for new tickets
-- Ensure the pg_net extension is enabled to make HTTP requests
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Create the trigger function that calls the edge function
create or replace function public.ticket_insert_webhook()
returns trigger as $$
declare
  webhook_secret text;
  payload jsonb;
  signature text;
begin
  -- SECURE: Fetching the webhook secret from the Supabase Vault
  -- This prevents hardcoding sensitive secrets in version control.
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'WEBHOOK_SECRET' limit 1;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  signature := encode(extensions.hmac(payload::text::bytea, coalesce(webhook_secret, '')::bytea, 'sha256'), 'hex');

  perform net.http_post(
    url:='https://aejuenhqciagpntcqoir.supabase.co/functions/v1/email-notifier',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Signature', 'sha256=' || signature
    ),
    body:=payload
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Attach the trigger to the tickets table
drop trigger if exists ticket_insert_trigger on public.tickets;

create trigger ticket_insert_trigger
  after insert on public.tickets
  for each row
  execute function public.ticket_insert_webhook();
