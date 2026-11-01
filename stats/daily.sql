-- Online play per day, last 30 days. Run with: npm run stats
-- Counts are weighted by _sample_interval, which Analytics Engine uses when it samples.
SELECT
  toDate(timestamp) AS day,
  sumIf(_sample_interval, blob1 = 'room_created') AS rooms,
  sumIf(_sample_interval, blob1 = 'match_started') AS matches,
  sumIf(_sample_interval, blob1 = 'match_started' AND double2 > 1) AS rematches,
  sumIf(_sample_interval, blob1 = 'match_finished') AS finished,
  sumIf(_sample_interval, blob1 = 'shot') AS shots,
  sumIf(_sample_interval, blob1 = 'shot' AND blob2 = 'penalty') AS penalties,
  sumIf(_sample_interval, blob1 = 'chat') AS chats,
  sumIf(_sample_interval, blob1 = 'spectator_joined') AS spectators
FROM novuss_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day
FORMAT JSON
