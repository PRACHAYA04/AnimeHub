package handler

import (
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"net/url"
	"strings"
	"unicode/utf8"
)

func (h *Handler) Members(w http.ResponseWriter, r *http.Request) {
	b, e := h.Store.JSON(r.Context(), `SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'displayName',display_name,'role',role,'createdAt',created_at) ORDER BY created_at DESC),'[]') FROM members`)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"items": b})
}
func (h *Handler) SetRole(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	var in struct{ Role string }
	if !decode(w, r, &in) {
		return
	}
	if in.Role != "admin" && in.Role != "member" {
		mw.Error(w, 400, "บทบาทต้องเป็น member หรือ admin")
		return
	}
	if n == mw.Who(r.Context()).ID {
		mw.Error(w, 400, "เปลี่ยนบทบาทของตัวเองไม่ได้")
		return
	}
	tag, e := h.Store.Pool.Exec(r.Context(), `UPDATE members SET role=$1,token_version=token_version+1 WHERE id=$2 AND role<>$1`, in.Role, n)
	if e != nil {
		fail(w, e)
		return
	}
	_ = tag
	m, e := h.Store.Member(r.Context(), false, n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, m)
}
func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	b, e := h.Store.JSON(r.Context(), `SELECT jsonb_build_object('anime',(SELECT count(*) FROM anime),'members',(SELECT count(*) FROM members),'admins',(SELECT count(*) FROM members WHERE role='admin'),'reviews',(SELECT count(*) FROM reviews),'votes',(SELECT count(*) FROM votes),'wishlistItems',(SELECT count(*) FROM wishlist_items),
 'topVoted',(SELECT coalesce(jsonb_agg(x),'[]') FROM(SELECT a.id,a.title,a.poster,v.member_rating AS "voteAverage",v.vote_count AS "voteCount" FROM anime_vote_stats v JOIN anime a ON a.id=v.anime_id ORDER BY v.member_rating DESC,v.vote_count DESC LIMIT 5)x),
 'newestMembers',(SELECT coalesce(jsonb_agg(x),'[]') FROM(SELECT id,display_name AS "displayName",email,role,created_at AS "createdAt" FROM members ORDER BY created_at DESC LIMIT 5)x))`)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, b)
}

type AnimeInput struct {
	Title         string   `json:"title"`
	TitleTh       string   `json:"titleTh"`
	TitleJapanese string   `json:"titleJapanese"`
	Detail        string   `json:"detail"`
	Poster        string   `json:"poster"`
	Genres        []string `json:"genres"`
	Year          *int     `json:"year"`
	Episodes      *int     `json:"episodes"`
	Status        string   `json:"status"`
}

func validAnime(in *AnimeInput) bool {
	in.Title = strings.TrimSpace(in.Title)
	if in.Genres == nil {
		in.Genres = []string{}
	}
	if in.Title == "" || utf8.RuneCountInString(in.Title) > 255 || utf8.RuneCountInString(in.TitleTh) > 255 || len(in.Detail) > 40000 || len(in.Genres) > 10 {
		return false
	}
	if in.Year != nil && (*in.Year < 1900 || *in.Year > 2200) {
		return false
	}
	if in.Episodes != nil && (*in.Episodes < 0 || *in.Episodes > 100000) {
		return false
	}
	if in.Poster != "" {
		u, e := url.Parse(in.Poster)
		if e != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") {
			return false
		}
	}
	for _, g := range in.Genres {
		if strings.TrimSpace(g) == "" || len(g) > 100 {
			return false
		}
	}
	return true
}

// Admin edits local metadata only. Source ratings and MAL IDs cannot be forged in this form.
func (h *Handler) SaveAnime(w http.ResponseWriter, r *http.Request) {
	var in AnimeInput
	if !decode(w, r, &in) {
		return
	}
	if !validAnime(&in) {
		mw.Error(w, 400, "ตรวจชื่อ รูป URL ปี จำนวนตอน และแนวให้ถูกต้อง")
		return
	}
	var n int64
	status := 200
	var e error
	if r.Method == "POST" {
		status = 201
		e = h.Store.Pool.QueryRow(r.Context(), `INSERT INTO anime(title,title_th,title_japanese,synopsis,poster,genres,year,episodes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, in.Title, in.TitleTh, in.TitleJapanese, in.Detail, in.Poster, in.Genres, in.Year, in.Episodes, in.Status).Scan(&n)
	} else {
		n = id(w, r)
		if n == 0 {
			return
		}
		tag, err := h.Store.Pool.Exec(r.Context(), `UPDATE anime SET title=$1,title_th=$2,title_japanese=$3,synopsis=$4,poster=$5,genres=$6,year=$7,episodes=$8,status=$9,updated_at=now() WHERE id=$10`, in.Title, in.TitleTh, in.TitleJapanese, in.Detail, in.Poster, in.Genres, in.Year, in.Episodes, in.Status, n)
		e = err
		if e == nil && tag.RowsAffected() == 0 {
			e = store.ErrNotFound
		}
	}
	if e != nil {
		fail(w, e)
		return
	}
	b, e := h.Store.Anime(r.Context(), n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, status, b)
}
func (h *Handler) DeleteAnime(w http.ResponseWriter, r *http.Request) {
	n := id(w, r)
	if n == 0 {
		return
	}
	tag, e := h.Store.Pool.Exec(r.Context(), `DELETE FROM anime WHERE id=$1`, n)
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
