package alerts

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestFetchActiveAccountIDsSendsShortLivedAdminToken(t *testing.T) {
	const secret = "test-secret"
	var receivedToken string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedToken = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(activeAccountsResponse{
			CuentaIDs: []string{"account-1"},
		})
	}))
	defer server.Close()

	dispatcher := &Dispatcher{
		httpClient:         server.Client(),
		subscriptionAPIURL: server.URL,
		jwtSecret:          []byte(secret),
	}

	accountIDs, err := dispatcher.fetchActiveAccountIDs(context.Background())
	if err != nil {
		t.Fatalf("fetchActiveAccountIDs() error = %v", err)
	}
	if len(accountIDs) != 1 || accountIDs[0] != "account-1" {
		t.Fatalf("fetchActiveAccountIDs() = %v", accountIDs)
	}

	const prefix = "Bearer "
	if !strings.HasPrefix(receivedToken, prefix) {
		t.Fatalf("Authorization header = %q", receivedToken)
	}

	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(strings.TrimPrefix(receivedToken, prefix), claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		t.Fatalf("service token is invalid: %v", err)
	}
	if claims["role"] != "administrador" {
		t.Fatalf("role claim = %v", claims["role"])
	}
	if claims["sub"] != "catalogo-service" {
		t.Fatalf("sub claim = %v", claims["sub"])
	}

	expiration, err := claims.GetExpirationTime()
	if err != nil || expiration == nil {
		t.Fatalf("expiration claim is missing: %v", err)
	}
	lifetime := time.Until(expiration.Time)
	if lifetime > 2*time.Minute || lifetime < time.Minute {
		t.Fatalf("unexpected token lifetime: %v", lifetime)
	}
}
