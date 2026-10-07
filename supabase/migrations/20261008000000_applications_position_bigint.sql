-- Correctif : la position des cartes utilise un horodatage en millisecondes
-- (ex. 1791286203766), qui dépasse la limite d'un entier 32 bits.
alter table public.applications alter column position type bigint;
