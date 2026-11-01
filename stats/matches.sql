-- Finished online matches, last 30 days: length in minutes and shots. Run with: npm run stats:matches
SELECT
  toDate(timestamp) AS day,
  sum(_sample_interval) AS matches,
  round(avg(double3) / 60, 1) AS avg_minutes,
  round(avg(double4)) AS avg_shots,
  max(double4) AS most_shots
FROM novuss_events
WHERE blob1 = 'match_finished' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day
FORMAT JSON
