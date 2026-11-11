package mw

import (
	"context"
	"encoding/json"
	"log"
	"moviehub/auth"
	"moviehub/store"
	"net/http"
	"strings"
	"time"
)

type key struct{}

func Who(ctx context.Context) store.Member { m, _ := ctx.Value(key{}).(store.Member); return m }
func Error(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"message": msg}})
}
func Login(issuer *auth.Issuer, s *store.Store, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			Error(w, 401, "กรุณาเข้าสู่ระบบก่อน")
			return
		}
		id, _, version, err := issuer.Parse(token)
		if err != nil {
			Error(w, 401, "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่")
			return
		}
		m, err := s.Member(r.Context(), false, id)
		if err != nil || m.Version != version {
			Error(w, 401, "บัญชีหรือ token ใช้ไม่ได้ กรุณาเข้าสู่ระบบใหม่")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), key{}, m)))
	}
}
func Admin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if Who(r.Context()).Role != "admin" {
			Error(w, 403, "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น")
			return
		}
		next(w, r)
	}
}
func CORS(origins []string, next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range origins {
		allowed[strings.TrimSpace(o)] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowed[r.Header.Get("Origin")] && r.Header.Get("Origin") != "" {
			w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Max-Age", "600")
		}
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type recorder struct {
	http.ResponseWriter
	status int
}

func (w *recorder) WriteHeader(n int) { w.status = n; w.ResponseWriter.WriteHeader(n) }
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &recorder{w, 200}
		defer func() {
			if e := recover(); e != nil {
				log.Printf("panic: %v", e)
				Error(rec, 500, "ระบบขัดข้อง")
			}
			log.Printf("%s %s %d %v", r.Method, r.URL.Path, rec.status, time.Since(start))
		}()
		next.ServeHTTP(rec, r)
	})
}
