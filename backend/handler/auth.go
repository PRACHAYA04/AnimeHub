package handler

import (
	"errors"
	"moviehub/auth"
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"
)

var dummyHash, _ = auth.HashPassword("animehub-dummy-password")

func validPassword(p string) bool { return utf8.RuneCountInString(p) >= 8 && len(p) <= 72 }
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password, DisplayName string }
	if !decode(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	address, e := mail.ParseAddress(in.Email)
	if e != nil || address.Address != in.Email || len(in.Email) > 255 {
		mw.Error(w, 400, "อีเมลไม่ถูกต้อง")
		return
	}
	if !validPassword(in.Password) {
		mw.Error(w, 400, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์")
		return
	}
	if n := utf8.RuneCountInString(in.DisplayName); n < 1 || n > 50 {
		mw.Error(w, 400, "ชื่อที่แสดงต้องยาว 1–50 ตัวอักษร")
		return
	}
	hash, e := auth.HashPassword(in.Password)
	if e != nil {
		fail(w, e)
		return
	}
	var n int64
	e = h.Store.Pool.QueryRow(r.Context(), `INSERT INTO members(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id`, in.Email, hash, in.DisplayName).Scan(&n)
	if e != nil {
		fail(w, e)
		return
	}
	m, e := h.Store.Member(r.Context(), false, n)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 201, m)
}
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if !decode(w, r, &in) {
		return
	}
	m, e := h.Store.Member(r.Context(), true, strings.ToLower(strings.TrimSpace(in.Email)))
	if errors.Is(e, store.ErrNotFound) {
		auth.CheckPassword(dummyHash, in.Password)
		mw.Error(w, 401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	if e != nil {
		fail(w, e)
		return
	}
	if !auth.CheckPassword(m.PasswordHash, in.Password) {
		mw.Error(w, 401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	token, e := h.Tickets.Issue(m.ID, m.Role, m.Version)
	if e != nil {
		fail(w, e)
		return
	}
	write(w, 200, map[string]any{"token": token, "member": m})
}
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) { write(w, 200, mw.Who(r.Context())) }
func (h *Handler) Profile(w http.ResponseWriter, r *http.Request) {
	var in struct{ DisplayName, Bio string }
	if !decode(w, r, &in) {
		return
	}
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	if n := utf8.RuneCountInString(in.DisplayName); n < 1 || n > 50 || utf8.RuneCountInString(in.Bio) > 500 {
		mw.Error(w, 400, "ชื่อยาว 1–50 ตัวอักษร และแนะนำตัวไม่เกิน 500 ตัวอักษร")
		return
	}
	m := mw.Who(r.Context())
	_, e := h.Store.Pool.Exec(r.Context(), `UPDATE members SET display_name=$1,bio=$2 WHERE id=$3`, in.DisplayName, in.Bio, m.ID)
	if e != nil {
		fail(w, e)
		return
	}
	m.DisplayName = in.DisplayName
	m.Bio = in.Bio
	write(w, 200, m)
}
func (h *Handler) Password(w http.ResponseWriter, r *http.Request) {
	var in struct{ CurrentPassword, NewPassword string }
	if !decode(w, r, &in) {
		return
	}
	m := mw.Who(r.Context())
	if !validPassword(in.NewPassword) {
		mw.Error(w, 400, "รหัสผ่านใหม่ต้องยาว 8 ตัวอักษรขึ้นไป ไม่เกิน 72 ไบต์")
		return
	}
	if !auth.CheckPassword(m.PasswordHash, in.CurrentPassword) {
		mw.Error(w, 400, "รหัสผ่านปัจจุบันไม่ถูกต้อง")
		return
	}
	hash, e := auth.HashPassword(in.NewPassword)
	if e != nil {
		fail(w, e)
		return
	}
	tag, e := h.Store.Pool.Exec(r.Context(), `UPDATE members SET password_hash=$1,token_version=token_version+1 WHERE id=$2 AND token_version=$3`, hash, m.ID, m.Version)
	if e != nil {
		fail(w, e)
		return
	}
	if tag.RowsAffected() == 0 {
		mw.Error(w, 409, "บัญชีเปลี่ยนแปลงแล้ว กรุณาเข้าสู่ระบบใหม่")
		return
	}
	w.WriteHeader(204)
}
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	m := mw.Who(r.Context())
	_, e := h.Store.Pool.Exec(r.Context(), `UPDATE members SET token_version=token_version+1 WHERE id=$1`, m.ID)
	if e != nil {
		fail(w, e)
		return
	}
	w.WriteHeader(204)
}
