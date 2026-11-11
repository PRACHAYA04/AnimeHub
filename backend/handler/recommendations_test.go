package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"moviehub/auth"
	"moviehub/store"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type recommendationResult struct {
	Mode    string `json:"mode"`
	Profile struct {
		WishlistCount  int `json:"wishlistCount"`
		RatedCount     int `json:"ratedCount"`
		HighRatedCount int `json:"highRatedCount"`
		LowRatedCount  int `json:"lowRatedCount"`
		Genres         []struct {
			Name   string `json:"name"`
			Weight int    `json:"weight"`
		} `json:"genres"`
	} `json:"profile"`
	Items []struct {
		ID            int64    `json:"id"`
		Title         string   `json:"title"`
		JikanScore    *float64 `json:"jikanScore"`
		AffinityScore int      `json:"affinityScore"`
		MatchedGenres []string `json:"matchedGenres"`
		ReasonType    string   `json:"reasonType"`
	} `json:"items"`
}

func TestPersonalRecommendations(t *testing.T) {
	database := os.Getenv("TEST_DATABASE_URL")
	if database == "" {
		t.Skip("set TEST_DATABASE_URL for real PostgreSQL recommendation tests")
	}
	ctx := context.Background()
	adminPool, err := pgxpool.New(ctx, database)
	if err != nil {
		t.Fatal(err)
	}
	defer adminPool.Close()
	schemaName := fmt.Sprintf("animehub_recommendations_%d", time.Now().UnixNano())
	if _, err = adminPool.Exec(ctx, "CREATE SCHEMA "+schemaName); err != nil {
		t.Fatal(err)
	}
	defer adminPool.Exec(ctx, "DROP SCHEMA "+schemaName+" CASCADE")
	config, err := pgxpool.ParseConfig(database)
	if err != nil {
		t.Fatal(err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schemaName
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	schema, err := os.ReadFile("../schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, string(schema)); err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `INSERT INTO members(email,password_hash,display_name) VALUES
	 ('alice@test.example','unused','Alice'),('bob@test.example','unused','Bob'),('new@test.example','unused','New');
	 INSERT INTO anime(title,genres,jikan_score) VALUES
	 ('Fantasy seed',ARRAY['Fantasy','Fantasy'],7),
	 ('Action seed',ARRAY['Action'],8.5),
	 ('Low Drama seed',ARRAY['Drama'],8),
	 ('Fantasy first',ARRAY['Fantasy'],8.2),
	 ('Mixed Adventure',ARRAY['Fantasy','Adventure'],9.1),
	 ('Action first',ARRAY['Action'],9.8),
	 ('Drama candidate',ARRAY['Drama'],9.5),
	 ('Mixed Drama',ARRAY['Fantasy','Drama'],9.6),
	 ('Unknown score',ARRAY['Fantasy'],NULL),
	 ('No genre',ARRAY[]::text[],9.9),
	 ('Double Fantasy',ARRAY['Fantasy','Fantasy'],8.1),
	 ('Neutral seed',ARRAY['Sci-Fi'],8.4)`); err != nil {
		t.Fatal(err)
	}
	issuer := &auth.Issuer{Secret: []byte(strings.Repeat("r", 32)), TTL: time.Hour}
	h := &Handler{Store: &store.Store{Pool: pool}, Tickets: issuer}
	server := httptest.NewServer(h.Routes())
	defer server.Close()
	tokens := map[int64]string{}
	for _, memberID := range []int64{1, 2, 3} {
		tokens[memberID], err = issuer.Issue(memberID, "member", 1)
		if err != nil {
			t.Fatal(err)
		}
	}
	request := func(t *testing.T, method, path, token string, body any, want int) []byte {
		t.Helper()
		var input bytes.Buffer
		if body != nil {
			if err := json.NewEncoder(&input).Encode(body); err != nil {
				t.Fatal(err)
			}
		}
		req, err := http.NewRequest(method, server.URL+path, &input)
		if err != nil {
			t.Fatal(err)
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("Content-Type", "application/json")
		res, err := server.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		output, err := io.ReadAll(res.Body)
		if err != nil {
			t.Fatal(err)
		}
		if res.StatusCode != want {
			t.Fatalf("%s %s: want %d, got %d: %s", method, path, want, res.StatusCode, output)
		}
		if method == "GET" && strings.HasPrefix(path, "/api/me/recommendations") && want == 200 && res.Header.Get("Cache-Control") != "no-store" {
			t.Fatal("personalized data must not be cached")
		}
		return output
	}
	get := func(t *testing.T, memberID int64, query string) recommendationResult {
		t.Helper()
		var result recommendationResult
		if err := json.Unmarshal(request(t, "GET", "/api/me/recommendations"+query, tokens[memberID], nil, 200), &result); err != nil {
			t.Fatal(err)
		}
		if result.Items == nil || result.Profile.Genres == nil {
			t.Fatal("collections must be JSON arrays, including empty ones")
		}
		return result
	}
	wish := func(t *testing.T, memberID, animeID int64) {
		t.Helper()
		request(t, "PUT", fmt.Sprintf("/api/me/wishlist/%d", animeID), tokens[memberID], nil, 200)
	}
	vote := func(t *testing.T, memberID, animeID int64, score int) {
		t.Helper()
		request(t, "PUT", fmt.Sprintf("/api/anime/%d/vote", animeID), tokens[memberID], map[string]int{"score": score}, 200)
	}
	reset := func(t *testing.T) {
		t.Helper()
		if _, err := pool.Exec(ctx, "DELETE FROM votes; DELETE FROM wishlist_items"); err != nil {
			t.Fatal(err)
		}
	}

	t.Run("requires valid login", func(t *testing.T) {
		request(t, "GET", "/api/me/recommendations", "", nil, 401)
		request(t, "GET", "/api/me/recommendations", tokens[1]+"invalid", nil, 401)
	})
	t.Run("cold start sorts by MAL and places missing scores last", func(t *testing.T) {
		reset(t)
		result := get(t, 3, "")
		if result.Mode != "popular" || len(result.Profile.Genres) != 0 || len(result.Items) != 12 || result.Items[0].Title != "No genre" || result.Items[11].Title != "Unknown score" {
			t.Fatalf("unexpected cold start: %+v", result)
		}
		for _, item := range result.Items {
			if item.ReasonType != "popular" || len(item.MatchedGenres) != 0 {
				t.Fatal("cold start must not claim personalized reasons")
			}
		}
	})
	t.Run("wishlist matching deduplicates genres and excludes saved titles", func(t *testing.T) {
		reset(t)
		wish(t, 1, 1)
		result := get(t, 1, "")
		if result.Mode != "personalized" || result.Profile.WishlistCount != 1 || len(result.Profile.Genres) != 1 || result.Profile.Genres[0].Weight != 1 || len(result.Items) != 5 {
			t.Fatalf("unexpected wishlist profile: %+v", result)
		}
		for _, item := range result.Items {
			if item.ID == 1 || item.AffinityScore != 1 || len(item.MatchedGenres) != 1 || item.MatchedGenres[0] != "Fantasy" || item.ReasonType != "interest" {
				t.Fatalf("incorrect recommendation: %+v", item)
			}
		}
	})
	t.Run("strong ratings outweigh popularity and low ratings reduce rank", func(t *testing.T) {
		reset(t)
		wish(t, 1, 1)
		vote(t, 1, 1, 10)
		vote(t, 1, 2, 8)
		vote(t, 1, 3, 4)
		vote(t, 1, 12, 6)
		result := get(t, 1, "")
		if result.Profile.RatedCount != 4 || result.Profile.HighRatedCount != 2 || result.Profile.LowRatedCount != 1 || result.Profile.Genres[0].Name != "Fantasy" || result.Profile.Genres[0].Weight != 4 || len(result.Items) != 6 {
			t.Fatalf("unexpected weighted profile: %+v", result)
		}
		want := []string{"Mixed Adventure", "Fantasy first", "Double Fantasy", "Unknown score", "Action first", "Mixed Drama"}
		for i, item := range result.Items {
			if item.Title != want[i] {
				t.Fatalf("rank %d: want %s, got %+v", i, want[i], item)
			}
		}
		if result.Items[5].AffinityScore != 2 || len(result.Items[5].MatchedGenres) != 1 || result.Items[5].MatchedGenres[0] != "Fantasy" {
			t.Fatal("negative genres must lower score and must not be given as a positive reason")
		}
	})
	t.Run("account data stays isolated even with a forged member query", func(t *testing.T) {
		reset(t)
		wish(t, 1, 1)
		vote(t, 2, 3, 9)
		alice := get(t, 1, "?memberId=2")
		bob := get(t, 2, "?memberId=1")
		newMember := get(t, 3, "")
		if alice.Profile.Genres[0].Name != "Fantasy" || alice.Profile.HighRatedCount != 0 || bob.Profile.Genres[0].Name != "Drama" || bob.Profile.WishlistCount != 0 || newMember.Mode != "popular" || len(newMember.Profile.Genres) != 0 {
			t.Fatal("one member's signals leaked into another member's recommendations")
		}
	})
	t.Run("edits and deletions are reflected on the next request", func(t *testing.T) {
		reset(t)
		wish(t, 1, 1)
		get(t, 1, "")
		request(t, "DELETE", "/api/me/wishlist/1", tokens[1], nil, 204)
		vote(t, 1, 2, 8)
		if result := get(t, 1, ""); result.Profile.Genres[0].Name != "Action" || result.Profile.WishlistCount != 0 {
			t.Fatal("wishlist deletion or new vote was not reflected")
		}
		vote(t, 1, 2, 5)
		if result := get(t, 1, ""); result.Mode != "popular" || len(result.Profile.Genres) != 0 {
			t.Fatal("neutral vote should remove the previous positive signal")
		}
		request(t, "DELETE", "/api/anime/2/vote", tokens[1], nil, 204)
		if result := get(t, 1, ""); result.Profile.RatedCount != 0 {
			t.Fatal("deleted vote remained in the profile")
		}
	})
	t.Run("negative-only profiles explore without pushing disliked genres", func(t *testing.T) {
		reset(t)
		vote(t, 1, 3, 1)
		vote(t, 1, 12, 7)
		result := get(t, 1, "")
		if result.Mode != "popular" || len(result.Profile.Genres) != 0 {
			t.Fatal("low or neutral ratings must not create positive interests")
		}
		for _, item := range result.Items {
			if item.ID == 3 || item.ID == 7 || item.ID == 8 || item.ID == 12 || item.AffinityScore < 0 {
				t.Fatalf("unwanted candidate: %+v", item)
			}
		}
	})
	t.Run("no remaining genre matches falls back honestly", func(t *testing.T) {
		reset(t)
		wish(t, 1, 1)
		for _, animeID := range []int64{4, 5, 8, 9, 11} {
			vote(t, 1, animeID, 5)
		}
		result := get(t, 1, "")
		if result.Mode != "popular" || len(result.Profile.Genres) != 1 || len(result.Items) != 6 {
			t.Fatalf("unexpected fallback: %+v", result)
		}
		for _, item := range result.Items {
			if len(item.MatchedGenres) > 0 || item.ReasonType != "popular" {
				t.Fatal("fallback cannot claim a genre match")
			}
		}
	})
	t.Run("all titles already known returns a valid empty list", func(t *testing.T) {
		reset(t)
		if _, err := pool.Exec(ctx, "INSERT INTO wishlist_items(member_id,anime_id) SELECT 1,id FROM anime"); err != nil {
			t.Fatal(err)
		}
		if result := get(t, 1, ""); len(result.Items) != 0 || result.Profile.WishlistCount != 12 {
			t.Fatal("known titles must never be repeated")
		}
	})
	t.Run("recommendation list is bounded", func(t *testing.T) {
		reset(t)
		if _, err := pool.Exec(ctx, "INSERT INTO anime(title,genres,jikan_score) SELECT 'Extra '||n,ARRAY['Drama'],7 FROM generate_series(1,20) n"); err != nil {
			t.Fatal(err)
		}
		if result := get(t, 3, ""); len(result.Items) != 12 {
			t.Fatalf("want 12 recommendations, got %d", len(result.Items))
		}
	})
}
