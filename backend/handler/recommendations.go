package handler

import (
	"moviehub/mw"
	"net/http"
)

func (h *Handler) Recommendations(w http.ResponseWriter, r *http.Request) {
	// Personalized responses must never enter a shared or browser HTTP cache.
	w.Header().Set("Cache-Control", "no-store")
	b, err := h.Store.Recommendations(r.Context(), mw.Who(r.Context()).ID)
	if err != nil {
		fail(w, err)
		return
	}
	write(w, http.StatusOK, b)
}
