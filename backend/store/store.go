package store

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct{ Pool *pgxpool.Pool }
type Member struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	DisplayName  string `json:"displayName"`
	Bio          string `json:"bio"`
	Role         string `json:"role"`
	CreatedAt    string `json:"createdAt"`
	PasswordHash string `json:"-"`
	Version      int    `json:"-"`
}

func (s *Store) Member(ctx context.Context, byEmail bool, key any) (Member, error) {
	var m Member
	where := "id=$1"
	if byEmail {
		where = "lower(email)=$1"
	}
	err := s.Pool.QueryRow(ctx, `SELECT id,email,display_name,bio,role,created_at::text,password_hash,token_version FROM members WHERE `+where, key).Scan(&m.ID, &m.Email, &m.DisplayName, &m.Bio, &m.Role, &m.CreatedAt, &m.PasswordHash, &m.Version)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrNotFound
	}
	return m, err
}
func Code(err error) string {
	var e *pgconn.PgError
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}

// SQL projections fix the public JSON shape in one place and keep external and member scores separate.
const AnimeJSON = `jsonb_build_object('id',a.id,'malId',a.mal_id,'title',a.title,'titleTh',a.title_th,
 'titleJapanese',a.title_japanese,'detail',a.synopsis,'poster',a.poster,'genres',a.genres,
 'genre',coalesce(a.genres[1],''),'year',a.year,'episodes',a.episodes,'status',a.status,
 'jikanScore',a.jikan_score,'sourceUrl',a.source_url,'syncedAt',a.synced_at,
 'memberRating',(SELECT member_rating FROM anime_vote_stats WHERE anime_id=a.id),
 'memberVoteCount',(SELECT count(*) FROM votes WHERE anime_id=a.id))`

func (s *Store) JSON(ctx context.Context, query string, args ...any) (json.RawMessage, error) {
	var b []byte
	err := s.Pool.QueryRow(ctx, query, args...).Scan(&b)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrNotFound
	}
	return json.RawMessage(b), err
}
func (s *Store) ListAnime(ctx context.Context, q, genre string, wishlistMember int64) (json.RawMessage, error) {
	return s.JSON(ctx, `SELECT coalesce(jsonb_agg(item ORDER BY item->>'title'),'[]') FROM
 (SELECT `+AnimeJSON+` AS item FROM anime a WHERE
 ($1='' OR a.title ILIKE '%'||$1||'%' OR a.title_th ILIKE '%'||$1||'%')
 AND ($2='' OR $2=ANY(a.genres))
 AND ($3::bigint=0 OR EXISTS(SELECT 1 FROM wishlist_items w WHERE w.anime_id=a.id AND w.member_id=$3))) t`, q, genre, wishlistMember)
}
func (s *Store) Anime(ctx context.Context, id int64) (json.RawMessage, error) {
	return s.JSON(ctx, `SELECT `+AnimeJSON+` FROM anime a WHERE a.id=$1`, id)
}
func (s *Store) Reviews(ctx context.Context, id int64) (json.RawMessage, error) {
	return s.JSON(ctx, `SELECT coalesce(jsonb_agg(jsonb_build_object(
 'id',r.id,'memberId',r.member_id,'text',r.text,'createdAt',r.created_at,'updatedAt',r.updated_at,
 'member',jsonb_build_object('id',m.id,'displayName',m.display_name),'score',v.score) ORDER BY r.created_at DESC),'[]')
 FROM reviews r JOIN members m ON m.id=r.member_id LEFT JOIN votes v ON v.member_id=r.member_id AND v.anime_id=r.anime_id WHERE r.anime_id=$1`, id)
}
