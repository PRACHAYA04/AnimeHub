package auth

import (
	"github.com/golang-jwt/jwt/v5"
	"strings"
	"testing"
	"time"
)

func TestTickets(t *testing.T) {
	issuer := &Issuer{Secret: []byte(strings.Repeat("a", 32)), TTL: time.Hour}
	valid, e := issuer.Issue(7, "member", 1)
	if e != nil {
		t.Fatal(e)
	}
	id, role, version, e := issuer.Parse(valid)
	if e != nil || id != 7 || role != "member" || version != 1 {
		t.Fatalf("valid ticket rejected: %v", e)
	}
	claims := func(exp bool) Claims {
		c := Claims{Role: "admin", Version: 1, RegisteredClaims: jwt.RegisteredClaims{Subject: "7"}}
		if exp {
			c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(time.Hour))
		}
		return c
	}
	sign := func(method jwt.SigningMethod, c Claims, key any) string {
		s, e := jwt.NewWithClaims(method, c).SignedString(key)
		if e != nil {
			t.Fatal(e)
		}
		return s
	}
	expired := claims(true)
	expired.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
	badID := claims(true)
	badID.Subject = "-1"
	noVersion := claims(true)
	noVersion.Version = 0
	cases := map[string]string{"other key": sign(jwt.SigningMethodHS256, claims(true), []byte("another-secret")), "wrong method": sign(jwt.SigningMethodHS512, claims(true), issuer.Secret), "no expiry": sign(jwt.SigningMethodHS256, claims(false), issuer.Secret), "expired": sign(jwt.SigningMethodHS256, expired, issuer.Secret), "bad subject": sign(jwt.SigningMethodHS256, badID, issuer.Secret), "no version": sign(jwt.SigningMethodHS256, noVersion, issuer.Secret), "tampered": valid + "x", "none": sign(jwt.SigningMethodNone, claims(true), jwt.UnsafeAllowNoneSignatureType)}
	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			if _, _, _, e := issuer.Parse(token); e == nil {
				t.Fatal("invalid ticket accepted")
			}
		})
	}
}
func TestPasswords(t *testing.T) {
	a, e := HashPassword("animehub-test-123")
	if e != nil {
		t.Fatal(e)
	}
	b, _ := HashPassword("animehub-test-123")
	if a == b || !CheckPassword(a, "animehub-test-123") || CheckPassword(a, "wrong") {
		t.Fatal("password hashing contract broken")
	}
	if _, e = HashPassword(strings.Repeat("a", 73)); e == nil {
		t.Fatal("accepted >72 bytes")
	}
}
