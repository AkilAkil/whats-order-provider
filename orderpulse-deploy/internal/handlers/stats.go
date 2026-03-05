package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"orderpulse/internal/middleware"
	"orderpulse/internal/models"
)

// StatsHandler serves the dashboard summary endpoint.
type StatsHandler struct {
	db *pgxpool.Pool
}

func NewStatsHandler(db *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{db: db}
}

// GET /api/stats
func (h *StatsHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	var stats models.DashboardStats
	err := h.db.QueryRow(r.Context(), `
		SELECT
			COUNT(*)                                                           AS total_orders,
			COUNT(*) FILTER (WHERE status = 'new')                            AS new_orders,
			COUNT(*) FILTER (WHERE payment_status = 'pending'
			                   AND status != 'cancelled')                      AS pending_payment,
			COALESCE(SUM(total_amount) FILTER (
				WHERE payment_status = 'paid'
				  AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
			), 0)                                                              AS today_revenue,
			COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue
		FROM orders
		WHERE tenant_id = $1 AND status != 'cancelled'
	`, tenantID).Scan(
		&stats.TotalOrders,
		&stats.NewOrders,
		&stats.PendingPayment,
		&stats.TodayRevenue,
		&stats.TotalRevenue,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch stats", "server_error")
		return
	}

	// Top selling items — explode order items JSONB and aggregate
	rows, err := h.db.Query(r.Context(), `
		SELECT
			LOWER(TRIM(item->>'name'))          AS item_name,
			SUM((item->>'qty')::numeric)        AS total_qty,
			COUNT(*)                            AS order_count
		FROM orders,
			jsonb_array_elements(items) AS item
		WHERE tenant_id = $1
		  AND status != 'cancelled'
		  AND items IS NOT NULL
		GROUP BY 1
		ORDER BY total_qty DESC
		LIMIT 10
	`, tenantID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item models.TopItem
			if rows.Scan(&item.Name, &item.TotalQty, &item.OrderCount) == nil {
				stats.TopItems = append(stats.TopItems, item)
			}
		}
	}

	writeJSON(w, http.StatusOK, stats)
}
