package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"moviehub/auth"
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestEndToEndPermissions(t *testing.T) {
	database := os.Getenv("TEST_DATABASE_URL")
	if database == "" {
		t.Skip("set TEST_DATABASE_URL for real PostgreSQL integration tests")
	}
	ctx := context.Background()
	adminPool, e := pgxpool.New(ctx, database)
	if e != nil {
		t.Fatal(e)
	}
	defer adminPool.Close()
	schemaName := fmt.Sprintf("animehub_test_%d", time.Now().UnixNano())
	if _, e = adminPool.Exec(ctx, "CREATE SCHEMA "+schemaName); e != nil {
		t.Fatal(e)
	}
	defer adminPool.Exec(ctx, "DROP SCHEMA "+schemaName+" CASCADE")
	config, e := pgxpool.ParseConfig(database)
	if e != nil {
		t.Fatal(e)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schemaName
	pool, e := pgxpool.NewWithConfig(ctx, config)
	if e != nil {
		t.Fatal(e)
	}
	defer pool.Close()
	schema, e := os.ReadFile("../schema.sql")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = pool.Exec(ctx, string(schema)); e != nil {
		t.Fatal(e)
	}
	_, e = pool.Exec(ctx, `INSERT INTO anime(title,genres,jikan_score) VALUES('Test anime',ARRAY['Drama'],9.2)`)
	if e != nil {
		t.Fatal(e)
	}
	h := &Handler{Store: &store.Store{Pool: pool}, Tickets: &auth.Issuer{Secret: []byte(strings.Repeat("t", 32)), TTL: time.Hour}}
	server := httptest.NewServer(mw.CORS([]string{"http://localhost:3000"}, h.Routes()))
	defer server.Close()
	checks := 0
	request := func(method, path, token string, body any, want int) map[string]any {
		t.Helper()
		var b bytes.Buffer
		if body != nil {
			json.NewEncoder(&b).Encode(body)
		}
		req, _ := http.NewRequest(method, server.URL+path, &b)
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		data := map[string]any{}
		if res.StatusCode != 204 {
			json.NewDecoder(res.Body).Decode(&data)
		}
		checks++
		if res.StatusCode != want {
			t.Fatalf("%s %s want %d got %d: %v", method, path, want, res.StatusCode, data)
		}
		return data
	}
	register := func(email string) {
		request("POST", "/api/auth/register", "", map[string]any{"email": email, "password": "Strong123!", "displayName": email, "role": "admin"}, 201)
	}
	login := func(email string) string {
		return request("POST", "/api/auth/login", "", map[string]string{"email": email, "password": "Strong123!"}, 200)["token"].(string)
	}
	register("a@test.example")
	register("b@test.example")
	register("admin@test.example")
	a := login("a@test.example")
	b := login("b@test.example")
	_, e = pool.Exec(ctx, `UPDATE members SET role='admin' WHERE email='admin@test.example'`)
	if e != nil {
		t.Fatal(e)
	}
	admin := login("admin@test.example")
	request("GET", "/api/me", a, nil, 200)
	request("GET", "/api/admin/stats", a, nil, 403)
	request("GET", "/api/admin/stats", "", nil, 401)
	request("GET", "/api/me", a+"x", nil, 401)
	request("POST", "/api/auth/register", "", map[string]string{"email": "A@test.example", "password": "Strong123!", "displayName": "duplicate"}, 409)
	request("POST", "/api/auth/register", "", map[string]string{"email": "x@test.example", "password": "1234", "displayName": "x"}, 400)
	request("POST", "/api/auth/login", "", map[string]string{"email": "missing@test.example", "password": "wrong"}, 401)
	request("POST", "/api/auth/login", "", map[string]string{"email": "a@test.example", "password": "wrong"}, 401)
	request("GET", "/api/anime", "", nil, 200)
	request("GET", "/api/anime/1", "", nil, 200)
	request("GET", "/api/anime/999", "", nil, 404)
	request("GET", "/api/anime/bad", "", nil, 400)
	request("POST", "/api/anime/1/reviews", "", map[string]string{"text": "a long enough review"}, 401)
	request("POST", "/api/anime/1/reviews", a, map[string]string{"text": "short"}, 400)
	rv := request("POST", "/api/anime/1/reviews", a, map[string]any{"text": "Original owner review text", "memberId": 2}, 201)
	reviewPath := fmt.Sprintf("/api/reviews/%.0f", rv["id"])
	request("POST", "/api/anime/1/reviews", a, map[string]string{"text": "Duplicate review text"}, 409)
	request("PUT", reviewPath, b, map[string]string{"text": "Attempt to steal this review"}, 404)
	request("PUT", reviewPath, admin, map[string]string{"text": "Admin cannot rewrite others"}, 404)
	request("DELETE", reviewPath, b, nil, 404)
	request("PUT", reviewPath, a, map[string]string{"text": "Updated owner review text"}, 200)
	request("POST", "/api/anime/999/reviews", a, map[string]string{"text": "Missing anime review text"}, 404)
	request("PUT", "/api/anime/1/vote", a, map[string]int{"score": 11}, 400)
	request("PUT", "/api/anime/1/vote", a, map[string]int{"score": 8}, 200)
	request("PUT", "/api/anime/1/vote", a, map[string]int{"score": 10}, 200)
	detail := request("GET", "/api/anime/1", "", nil, 200)
	if detail["jikanScore"] != 9.2 || detail["memberRating"] != float64(10) || detail["memberVoteCount"] != float64(1) {
		t.Fatal("scores mixed or duplicate vote", detail)
	}
	request("PUT", "/api/me/wishlist/1", a, nil, 200)
	request("PUT", "/api/me/wishlist/1", a, nil, 200)
	own := request("GET", "/api/me/wishlist", a, nil, 200)
	other := request("GET", "/api/me/wishlist", b, nil, 200)
	if len(own["items"].([]any)) != 1 || len(other["items"].([]any)) != 0 {
		t.Fatal("wishlist privacy/idempotency failed")
	}
	request("PUT", "/api/me/wishlist/999", a, nil, 404)
	request("GET", "/api/anime/1/mine", a, nil, 200)
	request("DELETE", "/api/me/wishlist/1", a, nil, 204)
	request("DELETE", "/api/anime/1/vote", a, nil, 204)
	profile := request("PUT", "/api/me", a, map[string]string{"displayName": "New name", "bio": "Anime fan", "role": "admin"}, 200)
	if profile["role"] != "member" || profile["displayName"] != "New name" {
		t.Fatal("profile escalation")
	}
	request("PUT", "/api/me/password", a, map[string]string{"currentPassword": "bad", "newPassword": "NewStrong123!"}, 400)
	request("PUT", "/api/me/password", a, map[string]string{"currentPassword": "Strong123!", "newPassword": "NewStrong123!"}, 204)
	request("GET", "/api/me", a, nil, 401)
	request("POST", "/api/auth/login", "", map[string]string{"email": "a@test.example", "password": "Strong123!"}, 401)
	newA := request("POST", "/api/auth/login", "", map[string]string{"email": "a@test.example", "password": "NewStrong123!"}, 200)["token"].(string)
	request("DELETE", reviewPath, admin, nil, 204)
	request("GET", "/api/admin/members", admin, nil, 200)
	request("GET", "/api/admin/stats", admin, nil, 200)
	me := request("GET", "/api/me", admin, nil, 200)
	request("PUT", fmt.Sprintf("/api/admin/members/%.0f/role", me["id"]), admin, map[string]string{"role": "member"}, 400)
	bm := request("GET", "/api/me", b, nil, 200)
	bRole := fmt.Sprintf("/api/admin/members/%.0f/role", bm["id"])
	request("PUT", bRole, admin, map[string]string{"role": "god"}, 400)
	request("PUT", bRole, admin, map[string]string{"role": "admin"}, 200)
	request("GET", "/api/me", b, nil, 401)
	bAdmin := login("b@test.example")
	request("GET", "/api/admin/stats", bAdmin, nil, 200)
	request("PUT", bRole, admin, map[string]string{"role": "member"}, 200)
	request("GET", "/api/admin/stats", bAdmin, nil, 401)
	input := map[string]any{"title": "Local anime", "genres": []string{"Fantasy"}, "year": 2026, "poster": "https://example.org/image.jpg"}
	request("POST", "/api/admin/anime", newA, input, 403)
	created := request("POST", "/api/admin/anime", admin, input, 201)
	path := fmt.Sprintf("/api/admin/anime/%.0f", created["id"])
	input["title"] = "Edited anime"
	request("PUT", path, admin, input, 200)
	request("DELETE", path, admin, nil, 204)
	request("POST", "/api/admin/anime", admin, map[string]string{"title": "", "poster": "javascript:alert(1)"}, 400)
	request("POST", "/api/auth/logout", newA, nil, 204)
	request("GET", "/api/me", newA, nil, 401)
	for origin, allowed := range map[string]bool{"http://localhost:3000": true, "https://evil.example": false} {
		req, _ := http.NewRequest("OPTIONS", server.URL+"/api/me", nil)
		req.Header.Set("Origin", origin)
		res, e := http.DefaultClient.Do(req)
		if e != nil {
			t.Fatal(e)
		}
		res.Body.Close()
		if res.StatusCode != 204 || (res.Header.Get("Access-Control-Allow-Origin") != "") != allowed {
			t.Fatal("CORS failed")
		}
		checks++
	}
	t.Logf("%d real HTTP/database assertions completed", checks)
}
