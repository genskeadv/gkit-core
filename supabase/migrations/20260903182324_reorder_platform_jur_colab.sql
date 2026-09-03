begin;

update core.apps
set ordem = case codigo
  when 'gkit_jur' then 40
  when 'gkit_dir' then 44
  when 'gkit_performa' then 45
  when 'uber' then 46
  when 'gkit_flex' then 47
  when 'colab' then 48
  when 'gkli_atende' then 49
  when 'gkit_fat' then 50
  else ordem
end,
updated_at = now()
where codigo in (
  'gkit_jur',
  'gkit_dir',
  'gkit_performa',
  'uber',
  'gkit_flex',
  'colab',
  'gkli_atende',
  'gkit_fat'
);

commit;
