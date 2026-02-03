-- Create table for tracking failed attempts
create table if not exists auth_rate_limits (
  ip_address text primary key,
  attempt_count int default 0,
  last_attempt_at timestamp with time zone default now(),
  blocked_until timestamp with time zone
);

alter table auth_rate_limits enable row level security;

-- Function to check if an IP is blocked
create or replace function check_rate_limit(request_ip text)
returns json
language plpgsql
security definer
as $$
declare
  rate_record auth_rate_limits%rowtype;
begin
  select * into rate_record from auth_rate_limits where ip_address = request_ip;
  
  -- If no record, they are fine
  if not found then
    return json_build_object('allowed', true);
  end if;

  -- Check if currently blocked
  if rate_record.blocked_until is not null and rate_record.blocked_until > now() then
    return json_build_object(
      'allowed', false, 
      'message', 'Too many failed attempts. Please try again later.'
    );
  end if;
  
  -- If block expired, reset
  if rate_record.blocked_until is not null and rate_record.blocked_until <= now() then
    update auth_rate_limits 
    set attempt_count = 0, blocked_until = null, last_attempt_at = now()
    where ip_address = request_ip;
    return json_build_object('allowed', true);
  end if;

  return json_build_object('allowed', true);
end;
$$;

-- Function to record a failed attempt and potentially block
create or replace function record_failed_attempt(request_ip text)
returns void
language plpgsql
security definer
as $$
declare
  rate_record auth_rate_limits%rowtype;
  new_count int;
begin
  select * into rate_record from auth_rate_limits where ip_address = request_ip;

  if not found then
    insert into auth_rate_limits (ip_address, attempt_count, last_attempt_at)
    values (request_ip, 1, now());
  else
    -- If enough time passed (e.g., 1 hour) without a block, reset count
    if rate_record.last_attempt_at < now() - interval '1 hour' and rate_record.blocked_until is null then
       new_count := 1;
    else
       new_count := rate_record.attempt_count + 1;
    end if;

    if new_count >= 5 then
      -- Block for 15 minutes
      update auth_rate_limits 
      set attempt_count = new_count, 
          last_attempt_at = now(),
          blocked_until = now() + interval '15 minutes'
      where ip_address = request_ip;
    else
      update auth_rate_limits 
      set attempt_count = new_count, 
          last_attempt_at = now()
      where ip_address = request_ip;
    end if;
  end if;
end;
$$;
