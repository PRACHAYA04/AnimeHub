package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type JikanAnime struct {
	ID       int64    `json:"mal_id"`
	Title    string   `json:"title"`
	Japanese string   `json:"title_japanese"`
	Synopsis string   `json:"synopsis"`
	URL      string   `json:"url"`
	Year     *int     `json:"year"`
	Episodes *int     `json:"episodes"`
	Score    *float64 `json:"score"`
	Status   string   `json:"status"`
	Images   struct {
		JPG struct {
			ImageURL string `json:"image_url"`
		} `json:"jpg"`
	} `json:"images"`
	Genres []struct {
		Name string `json:"name"`
	} `json:"genres"`
}
type Snapshot struct {
	FetchedAt time.Time    `json:"fetchedAt"`
	Source    string       `json:"source"`
	Items     []JikanAnime `json:"items"`
}

// Read two small pages sequentially; one second spacing stays below Jikan's 3/sec and 60/min caps.
func fetchJikan() error {
	path := filepath.Join("data", "jikan.json")
	var snapshot Snapshot
	if b, e := os.ReadFile(path); e == nil && json.Unmarshal(b, &snapshot) == nil && snapshot.Source == "https://api.jikan.moe/v4/top/anime?sfw=true" && snapshot.FetchedAt.UTC().Format("2006-01-02") == time.Now().UTC().Format("2006-01-02") && len(snapshot.Items) >= 30 {
		fmt.Println("Using today's Jikan snapshot")
		return nil
	}
	snapshot = Snapshot{FetchedAt: time.Now().UTC(), Source: "https://api.jikan.moe/v4/top/anime?sfw=true"}
	seen := map[int64]bool{}
	client := &http.Client{Timeout: 30 * time.Second}
	for page := 1; page <= 2; page++ {
		if page > 1 {
			time.Sleep(time.Second)
		}
		var result struct {
			Data []JikanAnime `json:"data"`
		}
		for attempt := 0; attempt < 3; attempt++ {
			res, e := client.Get(fmt.Sprintf("https://api.jikan.moe/v4/top/anime?sfw=true&limit=25&page=%d", page))
			if e != nil {
				return e
			}
			if res.StatusCode == 429 || res.StatusCode >= 500 {
				res.Body.Close()
				time.Sleep(time.Duration(attempt+2) * time.Second)
				continue
			}
			if res.StatusCode != 200 {
				res.Body.Close()
				return fmt.Errorf("Jikan status %d", res.StatusCode)
			}
			e = json.NewDecoder(io.LimitReader(res.Body, 8<<20)).Decode(&result)
			res.Body.Close()
			if e != nil {
				return e
			}
			break
		}
		if len(result.Data) == 0 {
			return fmt.Errorf("Jikan unavailable; existing snapshot unchanged")
		}
		for _, a := range result.Data {
			if !seen[a.ID] {
				snapshot.Items = append(snapshot.Items, a)
				seen[a.ID] = true
			}
		}
	}
	if len(snapshot.Items) < 30 {
		return fmt.Errorf("not enough records")
	}
	b, e := json.MarshalIndent(snapshot, "", "  ")
	if e != nil {
		return e
	}
	if e = os.MkdirAll("data", 0755); e != nil {
		return e
	}
	if e = os.WriteFile(path+".tmp", b, 0644); e != nil {
		return e
	}
	if e = os.Rename(path+".tmp", path); e != nil {
		return e
	}
	fmt.Printf("Saved %d real Jikan records\n", len(snapshot.Items))
	return nil
}
func seed(ctx context.Context, pool *pgxpool.Pool) error {
	b, e := os.ReadFile(filepath.Join("data", "jikan.json"))
	if e != nil {
		return e
	}
	var snapshot Snapshot
	if e = json.Unmarshal(b, &snapshot); e != nil {
		return e
	}
	if len(snapshot.Items) < 30 {
		return fmt.Errorf("snapshot must contain at least 30 records")
	}
	tx, e := pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	count := int64(0)
	for _, a := range snapshot.Items {
		genres := []string{}
		for _, g := range a.Genres {
			genres = append(genres, g.Name)
		}
		tag, err := tx.Exec(ctx, `INSERT INTO anime(mal_id,title,title_japanese,synopsis,poster,genres,year,episodes,status,jikan_score,source_url,synced_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(mal_id) DO NOTHING`, a.ID, a.Title, a.Japanese, a.Synopsis, a.Images.JPG.ImageURL, genres, a.Year, a.Episodes, a.Status, a.Score, a.URL, snapshot.FetchedAt)
		if err != nil {
			return err
		}
		count += tag.RowsAffected()
	}
	if e = tx.Commit(ctx); e != nil {
		return e
	}
	fmt.Printf("Imported %d new anime; existing records and admin edits preserved\n", count)
	return nil
}
