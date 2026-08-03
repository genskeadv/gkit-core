do $$
begin
  if to_regprocedure('gkit_fat.set_updated_at()') is not null then
    alter function gkit_fat.set_updated_at()
      set search_path = gkit_fat, pg_temp;
  end if;
end $$;
