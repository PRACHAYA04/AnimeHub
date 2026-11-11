package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Role    string `json:"role"`
	Version int    `json:"version"`
	jwt.RegisteredClaims
}

type Issuer struct {
	Secret []byte
	TTL    time.Duration
}

// Issue ออกตั๋วให้สมาชิกหนึ่งคน
func (i *Issuer) Issue(memberID int64, role string, version int) (string, error) {
	now := time.Now()
	claims := Claims{
		Role:    role,
		Version: version,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(memberID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(i.TTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.Secret)
}

// Parse ตรวจตั๋ว ถ้าผ่านคืนเลขสมาชิกกับบทบาท
func (i *Issuer) Parse(tokenString string) (int64, string, int, error) {
	var c Claims
	_, err := jwt.ParseWithClaims(tokenString, &c,
		func(t *jwt.Token) (any, error) { return i.Secret, nil },
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return 0, "", 0, err
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil || id <= 0 || c.Version < 1 {
		return 0, "", 0, errors.New("bad subject or version")
	}
	return id, c.Role, c.Version, nil
}
