package handler

import (
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"strings"
	"unicode/utf8"
)

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	b, e := h.Store.ListAnime(r.Context(), r.URL.Query().Get("q"), r.URL.Query().Get("genre"), 0)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"items": b})
}
func (h *Handler) Detail(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	b, e := h.Store.Anime(r.Context(), n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, b)
}
func (h *Handler) Genres(w http.ResponseWriter, r *http.Request) {
	b, e := h.Store.JSON(r.Context(), `SELECT coalesce(jsonb_agg(g ORDER BY g),'[]') FROM(SELECT DISTINCT unnest(genres) g FROM anime) t`)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"items": b})
}
func (h *Handler) Reviews(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	if _, e := h.Store.Anime(r.Context(), n); e != nil {
		fail(w, e)
		return
	}
	b, e := h.Store.Reviews(r.Context(), n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"items": b})
}
func reviewText(w http.ResponseWriter, r *http.Request) (string, bool) {
	var in struct{ Text string }
	if !decode(w, r, &in) {
		return "", false
	}
	s := strings.TrimSpace(in.Text)
	if n := utf8.RuneCountInString(s); n < 10 || n > 5000 {
		mw.Error(w, 400, "รีวิวต้องยาว 10–5000 ตัวอักษร")
		return "", false
	}
	return s, true
}
func (h *Handler) AddReview(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	s, ok := reviewText(w, r)
	if !ok {
		return
	}
	var reviewID int64
	e := h.Store.Pool.QueryRow(r.Context(), `INSERT INTO reviews(member_id,anime_id,text) VALUES($1,$2,$3) RETURNING id`, mw.Who(r.Context()).ID, n, s).Scan(&reviewID)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 201, map[string]any{"id": reviewID, "text": s})
}
func (h *Handler) EditReview(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	s, ok := reviewText(w, r)
	if !ok {
		return
	}
	tag, e := h.Store.Pool.Exec(r.Context(), `UPDATE reviews SET text=$1,updated_at=now() WHERE id=$2 AND member_id=$3`, s, n, mw.Who(r.Context()).ID)
	if e != nil {
		fail(w, e)
		return
	}
	if tag.RowsAffected() == 0 {
		fail(w, store.ErrNotFound)
		return
	}
	write(w, 200, map[string]any{"id": n, "text": s})
}
func (h *Handler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	m := mw.Who(r.Context())
	tag, e := h.Store.Pool.Exec(r.Context(), `DELETE FROM reviews WHERE id=$1 AND (member_id=$2 OR $3)`, n, m.ID, m.Role == "admin")
	if e != nil {
		fail(w, e)
		return
	}
	if tag.RowsAffected() == 0 {
		fail(w, store.ErrNotFound)
		return
	}
	w.WriteHeader(204)
}
func (h *Handler) Vote(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	var in struct{ Score int }
	if !decode(w, r, &in) {
		return
	}
	if in.Score < 1 || in.Score > 10 {
		mw.Error(w, 400, "คะแนนต้องเป็นจำนวนเต็ม 1–10")
		return
	}
	_, e := h.Store.Pool.Exec(r.Context(), `INSERT INTO votes(member_id,anime_id,score) VALUES($1,$2,$3) ON CONFLICT(member_id,anime_id) DO UPDATE SET score=EXCLUDED.score`, mw.Who(r.Context()).ID, n, in.Score)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"animeId": n, "score": in.Score})
}
func (h *Handler) DeleteVote(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	_, e := h.Store.Pool.Exec(r.Context(), `DELETE FROM votes WHERE member_id=$1 AND anime_id=$2`, mw.Who(r.Context()).ID, n)
	if e != nil {
		fail(w, e)
		return
	}
	w.WriteHeader(204)
}
func (h *Handler) Mine(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	if _, e := h.Store.Anime(r.Context(), n); e != nil {
		fail(w, e)
		return
	}
	b, e := h.Store.JSON(r.Context(), `SELECT jsonb_build_object('myVote',(SELECT score FROM votes WHERE member_id=$1 AND anime_id=$2),'inWishlist',EXISTS(SELECT 1 FROM wishlist_items WHERE member_id=$1 AND anime_id=$2))`, mw.Who(r.Context()).ID, n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, b)
}
func (h *Handler) Wishlist(w http.ResponseWriter, r *http.Request) {
	b, e := h.Store.ListAnime(r.Context(), "", "", mw.Who(r.Context()).ID)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"items": b})
}
func (h *Handler) AddWishlist(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	_, e := h.Store.Pool.Exec(r.Context(), `INSERT INTO wishlist_items(member_id,anime_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, mw.Who(r.Context()).ID, n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"animeId": n})
}
func (h *Handler) DeleteWishlist(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	_, e := h.Store.Pool.Exec(r.Context(), `DELETE FROM wishlist_items WHERE member_id=$1 AND anime_id=$2`, mw.Who(r.Context()).ID, n)
	if e != nil {
		fail(w, e)
		return
	}
	w.WriteHeader(204)
}
