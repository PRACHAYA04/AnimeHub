package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"moviehub/auth"
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"strconv"
)

type Handler struct {
	Store   *store.Store
	Tickets *auth.Issuer
}

func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 65536)
	d := json.NewDecoder(r.Body)
	if err := d.Decode(v); err != nil {
		mw.Error(w, 400, "ข้อมูล JSON ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป")
		return false
	}
	if err := d.Decode(new(any)); err != io.EOF {
		mw.Error(w, 400, "ส่ง JSON ได้ครั้งละหนึ่งชุด")
		return false
	}
	return true
}
func id(w http.ResponseWriter, r *http.Request) int64 {
	v, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil || v <= 0 {
		mw.Error(w, 400, "รหัสต้องเป็นจำนวนเต็มบวก")
		return 0
	}
	return v
}
func fail(w http.ResponseWriter, e error) {
	switch {
	case errors.Is(e, store.ErrNotFound):
		mw.Error(w, 404, "ไม่พบข้อมูล")
	case store.Code(e) == "23505":
		mw.Error(w, 409, "มีข้อมูลนี้แล้ว")
	case store.Code(e) == "23503":
		mw.Error(w, 404, "ไม่พบอนิเมะหรือข้อมูลที่อ้างถึง")
	default:
		log.Printf("database error: %v", e)
		mw.Error(w, 500, "ระบบขัดข้อง กรุณาลองใหม่")
	}
}
func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	login := func(f http.HandlerFunc) http.HandlerFunc { return mw.Login(h.Tickets, h.Store, f) }
	admin := func(f http.HandlerFunc) http.HandlerFunc { return login(mw.Admin(f)) }
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		if e := h.Store.Pool.Ping(r.Context()); e != nil {
			mw.Error(w, 503, "ฐานข้อมูลไม่พร้อม")
			return
		}
		write(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/auth/register", h.Register)
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("GET /api/me", login(h.Me))
	mux.HandleFunc("PUT /api/me", login(h.Profile))
	mux.HandleFunc("PUT /api/me/password", login(h.Password))
	mux.HandleFunc("POST /api/auth/logout", login(h.Logout))
	mux.HandleFunc("GET /api/anime", h.List)
	mux.HandleFunc("GET /api/genres", h.Genres)
	mux.HandleFunc("GET /api/anime/{id}", h.Detail)
	mux.HandleFunc("GET /api/anime/{id}/reviews", h.Reviews)
	mux.HandleFunc("POST /api/anime/{id}/reviews", login(h.AddReview))
	mux.HandleFunc("PUT /api/reviews/{id}", login(h.EditReview))
	mux.HandleFunc("DELETE /api/reviews/{id}", login(h.DeleteReview))
	mux.HandleFunc("PUT /api/anime/{id}/vote", login(h.Vote))
	mux.HandleFunc("DELETE /api/anime/{id}/vote", login(h.DeleteVote))
	mux.HandleFunc("GET /api/anime/{id}/mine", login(h.Mine))
	mux.HandleFunc("GET /api/me/wishlist", login(h.Wishlist))
	mux.HandleFunc("GET /api/me/recommendations", login(h.Recommendations))
	mux.HandleFunc("PUT /api/me/wishlist/{id}", login(h.AddWishlist))
	mux.HandleFunc("DELETE /api/me/wishlist/{id}", login(h.DeleteWishlist))
	mux.HandleFunc("GET /api/admin/stats", admin(h.Stats))
	mux.HandleFunc("GET /api/admin/members", admin(h.Members))
	mux.HandleFunc("PUT /api/admin/members/{id}/role", admin(h.SetRole))
	mux.HandleFunc("POST /api/admin/anime", admin(h.SaveAnime))
	mux.HandleFunc("PUT /api/admin/anime/{id}", admin(h.SaveAnime))
	mux.HandleFunc("DELETE /api/admin/anime/{id}", admin(h.DeleteAnime))
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) { mw.Error(w, 404, "ไม่พบ API นี้") })
	return mux
}
