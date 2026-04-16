SELECT frequency, COUNT(*) as cnt
FROM name_samples
WHERE frequency IS NOT NULL
GROUP BY frequency
ORDER BY cnt DESC
LIMIT 20;
