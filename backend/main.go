package main

import (
	"context"
	_ "embed"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"moviehub/auth"
	"moviehub/handler"
	"moviehub/mw"
	"moviehub/store"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

//go:embed schema.sql
var schema string

func main() {
	if len(os.Args) > 1 && os.Args[1] == "fetch-jikan" {
		if e := fetchJikan(); e != nil {
			log.Fatal(e)
		}
		return
	}
	ctx := context.Background()
	pool, e := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if e != nil {
		log.Fatal(e)
	}
	defer pool.Close()
	if e = pool.Ping(ctx); e != nil {
		log.Fatal(e)
	}
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "init":
			_, e = pool.Exec(ctx, schema)
		case "seed":
			e = seed(ctx, pool)
		case "promote":
			if len(os.Args) != 3 {
				log.Fatal("usage: go run . promote your-email")
			}
			var n int64
			e = pool.QueryRow(ctx, `UPDATE members SET role='admin',token_version=token_version+1 WHERE lower(email)=lower($1) RETURNING id`, os.Args[2]).Scan(&n)
		default:
			log.Fatal("unknown command")
		}
		if e != nil {
			log.Fatal(e)
		}
		log.Println("command complete")
		return
	}
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal("JWT_SECRET must contain at least 32 bytes")
	}
	h := &handler.Handler{Store: &store.Store{Pool: pool}, Tickets: &auth.Issuer{Secret: []byte(secret), TTL: time.Hour}}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{Addr: ":" + port, Handler: mw.Logging(mw.CORS(strings.Split(os.Getenv("ALLOWED_ORIGINS"), ","), h.Routes())), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		log.Println("AnimeHub API :" + port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	closeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if e = server.Shutdown(closeCtx); e != nil {
		log.Println(e)
	}
}
