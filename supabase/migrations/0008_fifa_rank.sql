-- ============================================================================
-- Bolão Copa 2026 — Ranking FIFA das seleções (edição 1/abr/2026).
-- Usado na regra da "revelação": elegíveis = ranking 21+ (fora do top 20).
-- ============================================================================
alter table public.teams add column if not exists fifa_rank smallint;

update public.teams t set fifa_rank = c.r
from (values
  ('FRA',1),('ESP',2),('ARG',3),('ENG',4),('POR',5),('BRA',6),('NED',7),
  ('MAR',8),('BEL',9),('GER',10),('CRO',11),('COL',13),('SEN',14),('MEX',15),
  ('USA',16),('URU',17),('JPN',18),('SUI',19),('IRN',21),('TUR',22),('ECU',23),
  ('AUT',24),('KOR',25),('AUS',27),('ALG',28),('EGY',29),('CAN',30),('NOR',31),
  ('PAN',33),('CIV',34),('SWE',38),('PAR',40),('CZE',41),('SCO',43),('TUN',44),
  ('COD',46),('UZB',50),('QAT',55),('IRQ',57),('RSA',60),('KSA',61),('JOR',63),
  ('BIH',65),('CPV',69),('GHA',74),('CUW',82),('HAI',83),('NZL',85)
) as c(code, r)
where t.code = c.code;
