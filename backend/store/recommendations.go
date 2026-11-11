package store

import (
	"context"
	"encoding/json"
)

// Recommendations uses one database snapshot and the authenticated member's data.
// A saved title contributes +1 per genre, a vote of 8–10 contributes +3,
// and a vote of 1–4 contributes -2. Votes of 5–7 are neutral.
func (s *Store) Recommendations(ctx context.Context, memberID int64) (json.RawMessage, error) {
	return s.JSON(ctx, `WITH signals AS (
 SELECT anime_id, 1 AS weight FROM wishlist_items WHERE member_id=$1
 UNION ALL
 SELECT anime_id, CASE WHEN score>=8 THEN 3 ELSE -2 END
 FROM votes WHERE member_id=$1 AND (score>=8 OR score<=4)
), genre_weights AS (
 SELECT genre, sum(s.weight)::int AS weight
 FROM signals s JOIN anime a ON a.id=s.anime_id
 CROSS JOIN LATERAL (SELECT DISTINCT unnest(a.genres) AS genre) g
 WHERE btrim(genre)<>'' GROUP BY genre
), candidates AS (
 SELECT a.id, a.title, a.jikan_score, `+AnimeJSON+` AS anime,
 coalesce(affinity.score,0)::int AS affinity_score,
 coalesce(affinity.matched_genres,'[]'::jsonb) AS matched_genres
 FROM anime a
 LEFT JOIN LATERAL (
   SELECT sum(gw.weight) AS score,
     jsonb_agg(g.genre ORDER BY gw.weight DESC,g.genre) FILTER(WHERE gw.weight>0) AS matched_genres
   FROM (SELECT DISTINCT unnest(a.genres) AS genre) g
   JOIN genre_weights gw ON gw.genre=g.genre
 ) affinity ON true
 WHERE NOT EXISTS(SELECT 1 FROM wishlist_items w WHERE w.member_id=$1 AND w.anime_id=a.id)
 AND NOT EXISTS(SELECT 1 FROM votes v WHERE v.member_id=$1 AND v.anime_id=a.id)
), recommendation_mode AS (
 SELECT EXISTS(SELECT 1 FROM candidates WHERE affinity_score>0) AS personalized
), ranked AS (
 SELECT c.*, m.personalized FROM candidates c CROSS JOIN recommendation_mode m
 WHERE (m.personalized AND c.affinity_score>0) OR (NOT m.personalized AND c.affinity_score>=0)
 ORDER BY CASE WHEN m.personalized THEN c.affinity_score ELSE 0 END DESC,
 c.jikan_score DESC NULLS LAST, c.title, c.id LIMIT 12
)
SELECT jsonb_build_object(
 'mode',CASE WHEN (SELECT personalized FROM recommendation_mode) THEN 'personalized' ELSE 'popular' END,
 'profile',jsonb_build_object(
   'wishlistCount',(SELECT count(*) FROM wishlist_items WHERE member_id=$1),
   'ratedCount',(SELECT count(*) FROM votes WHERE member_id=$1),
   'highRatedCount',(SELECT count(*) FROM votes WHERE member_id=$1 AND score>=8),
   'lowRatedCount',(SELECT count(*) FROM votes WHERE member_id=$1 AND score<=4),
   'genres',coalesce((SELECT jsonb_agg(jsonb_build_object('name',genre,'weight',weight) ORDER BY weight DESC,genre)
     FROM (SELECT genre,weight FROM genre_weights WHERE weight>0 ORDER BY weight DESC,genre LIMIT 5) top_genres),'[]'::jsonb)
 ),
 'items',coalesce((SELECT jsonb_agg(anime || jsonb_build_object(
   'affinityScore',affinity_score,
   'matchedGenres',CASE WHEN personalized THEN matched_genres ELSE '[]'::jsonb END,
   'reasonType',CASE WHEN personalized THEN 'interest' ELSE 'popular' END
 ) ORDER BY CASE WHEN personalized THEN affinity_score ELSE 0 END DESC,jikan_score DESC NULLS LAST,title,id)
 FROM ranked),'[]'::jsonb)
)`, memberID)
}
