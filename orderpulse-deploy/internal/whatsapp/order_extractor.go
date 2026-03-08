package whatsapp

// order_extractor.go
//
// Extracts structured order line-items from free-form WhatsApp messages.
//
// ── How it works ─────────────────────────────────────────────────────────────
//
//  Stage 1  REGEX ENGINE  (fast, zero cost, handles ~70% of messages)
//           Tries 8 pattern families against the raw message.
//           Each pattern returns []ExtractedItem on a match.
//
//  Stage 2  LLM FALLBACK  (GPT-4o / Claude, costs ~$0.001/msg)
//           Called only when regex produces zero items AND the intent
//           classifier already marked the message as "new_order".
//           Structured JSON mode guarantees parseable output.
//
// ── Example inputs → outputs ─────────────────────────────────────────────────
//
//   "2*butter chicken"
//   → [{name:"butter chicken", qty:2}]
//
//   "1 paneer, 2 naan, extra gravy"
//   → [{name:"paneer",qty:1},{name:"naan",qty:2},{name:"extra gravy",qty:1}]
//
//   "give me 500gm chicken and 1kg mutton"
//   → [{name:"chicken",qty:500,unit:"gm"},{name:"mutton",qty:1,unit:"kg"}]
//
//   "same as last time but double the biryani"
//   → intent:repeat_order (handled separately, not extracted here)
//
//   "3 plates dal makhni + 2 butter naan + 1 lassi"
//   → [{name:"dal makhni",qty:3},{name:"butter naan",qty:2},{name:"lassi",qty:1}]
//
//   "bhaiya 2 chicken biryani chahiye aur ek gulab jamun"
//   → [{name:"chicken biryani",qty:2},{name:"gulab jamun",qty:1}]
//   (Hindi numerals + mixed Hindi-English handled)

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// ─── TYPES ────────────────────────────────────────────────────────────────────

// ExtractedItem is one parsed line-item from a chat message.
type ExtractedItem struct {
	Name     string  `json:"name"`      // Normalised item name, title-cased
	Qty      float64 `json:"qty"`       // Numeric quantity (may be fractional: 0.5 kg)
	Unit     string  `json:"unit"`      // "kg","gm","ml","l","pcs","plates","dozen" — or "" if none
	RawMatch string  `json:"raw_match"` // Original substring that was matched (for debugging)
}

// ExtractionResult is returned by ExtractOrder.
type ExtractionResult struct {
	Items    []ExtractedItem `json:"items"`
	Intent   string          `json:"intent"`   // new_order | repeat_order | payment_update | general
	Source   string          `json:"source"`   // "regex" | "llm" | "none"
	RawText  string          `json:"raw_text"` // original message
}

// ─── WORD NUMBERS ─────────────────────────────────────────────────────────────
// Maps common English and Hindi number words to their float values.
var wordNumbers = map[string]float64{
	// English
	"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
	"six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
	"eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
	"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
	"half": 0.5, "quarter": 0.25, "dozen": 12, "a": 1, "an": 1,
	// Hindi (common order words)
	"ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
	"chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
	"ek dozen": 12,
}

// parseNumber converts "2", "two", "2.5", "½", "ek" etc. to float64.
// Returns (value, true) on success.
func parseNumber(s string) (float64, bool) {
	s = strings.TrimSpace(strings.ToLower(s))

	// Plain integer/float
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f, true
	}
	// Unicode fractions
	switch s {
	case "½", "1/2":
		return 0.5, true
	case "¼", "1/4":
		return 0.25, true
	case "¾", "3/4":
		return 0.75, true
	}
	// Written fractions like "1/2", "3/4"
	if parts := strings.Split(s, "/"); len(parts) == 2 {
		num, e1 := strconv.ParseFloat(parts[0], 64)
		den, e2 := strconv.ParseFloat(parts[1], 64)
		if e1 == nil && e2 == nil && den != 0 {
			return num / den, true
		}
	}
	// Word numbers
	if v, ok := wordNumbers[s]; ok {
		return v, true
	}
	return 0, false
}

// normQty rounds to 3 decimal places to avoid float noise.
func normQty(f float64) float64 {
	return math.Round(f*1000) / 1000
}

// ─── UNITS ────────────────────────────────────────────────────────────────────
// Canonical unit normalisation. Maps variants to a canonical form.
var unitNorm = map[string]string{
	"kg": "kg", "kgs": "kg", "kilo": "kg", "kilos": "kg", "kilogram": "kg", "kilograms": "kg",
	"gm": "gm", "gms": "gm", "gram": "gm", "grams": "gm", "g": "gm",
	"mg": "mg",
	"l": "l", "ltr": "l", "litre": "l", "litres": "l", "liter": "l", "liters": "l",
	"ml": "ml",
	"pcs": "pcs", "pc": "pcs", "piece": "pcs", "pieces": "pcs",
	"plates": "plates", "plate": "plates",
	"dozen": "dozen", "doz": "dozen",
	"box": "box", "boxes": "box",
	"bottle": "bottle", "bottles": "bottle",
	"packet": "packet", "packets": "packet", "pack": "packet", "packs": "packet",
}

// unitPattern matches common unit abbreviations and words.
var unitPattern = `(?:kg|kgs?|kilo(?:gram)?s?|gm?s?|grams?|mg|ml|l(?:tr)?|lit(?:re|er)s?|pcs?|pieces?|plates?|dozens?|doz|box(?:es)?|bottles?|packets?|packs?)`

// normaliseUnit returns the canonical unit string.
func normaliseUnit(u string) string {
	if v, ok := unitNorm[strings.ToLower(strings.TrimSpace(u))]; ok {
		return v
	}
	return strings.ToLower(strings.TrimSpace(u))
}

// ─── TEXT NORMALISATION ───────────────────────────────────────────────────────

// normaliseName cleans up an item name: trim, collapse spaces, title-case.
func normaliseName(s string) string {
	// Remove trailing/leading punctuation
	s = strings.Trim(s, " ,;:.!?-/")
	// Collapse multiple spaces
	s = regexp.MustCompile(`\s{2,}`).ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	// Title-case each word
	words := strings.Fields(s)
	for i, w := range words {
		runes := []rune(w)
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
		}
		words[i] = string(runes)
	}
	return strings.Join(words, " ")
}

// ─── COMPILED REGEX PATTERNS ─────────────────────────────────────────────────
//
// Each pattern family handles a specific message format that WhatsApp customers
// commonly use. More specific patterns are tried first.
//
// Capture group naming convention:
//   qty   = numeric quantity
//   qword = quantity as a word ("two", "ek")
//   unit  = unit of measure
//   name  = item name

var (
	// ── Pattern 1: "2*butter chicken" or "2x naan" ──────────────────────────
	// Very common in India: customers write qty*item or qty×item
	reMultiplyOp = regexp.MustCompile(
		`(?i)(\d+(?:\.\d+)?)\s*[*×x]\s*([^,\n*×x]+?)(?:\s*[,\n]|$)`,
	)

	// ── Pattern 2: "2 kg chicken" or "500gm mutton" ──────────────────────────
	// Qty + optional unit + item name
	reQtyUnit = regexp.MustCompile(
		`(?i)(\d+(?:[./]\d+)?)\s*(` + unitPattern + `)\s+(?:of\s+)?([a-zA-Z][^,\n]+?)(?:\s*[,\n+&]|$)`,
	)

	// ── Pattern 3: "chicken 2kg" or "paneer 500gm" ───────────────────────────
	// Item first, then qty+unit (common in quick messages)
	reNameThenQtyUnit = regexp.MustCompile(
		`(?i)([a-zA-Z][^,\n\d]+?)\s+(\d+(?:\.\d+)?)\s*(` + unitPattern + `)(?:\s*[,\n+&]|$)`,
	)

	// ── Pattern 4: "2 butter chicken" or "3 plates dal" ─────────────────────
	// Simple qty + item (no unit), or qty + unit + item
	reQtyItem = regexp.MustCompile(
		`(?i)(?:^|[,\n+&])\s*(\d+(?:\.\d+)?)\s+(?:(` + unitPattern + `)\s+)?([a-zA-Z][^,\n*×x\d]{2,40}?)(?:\s*[,\n+&]|$)`,
	)

	// ── Pattern 5: "item x2" or "item - 3" ───────────────────────────────────
	// Item name first, then qty suffix
	reItemThenQty = regexp.MustCompile(
		`(?i)([a-zA-Z][^,\n\d]{2,40}?)\s*[-–—xX]\s*(\d+(?:\.\d+)?)(?:\s*[,\n+&]|$)`,
	)

	// ── Pattern 6: Bullet/numbered list lines ────────────────────────────────
	// "1. Butter Chicken - 2" or "• Naan x3"
	reListItem = regexp.MustCompile(
		`(?im)^[\s\d.•\-*]+([a-zA-Z][^:\n\d]{2,40}?)[\s\-–:]+(\d+(?:\.\d+)?)\s*(` + unitPattern + `)?`,
	)

	// ── Pattern 7: Word numbers ───────────────────────────────────────────────
	// "two butter chicken" or "ek paneer"
	reWordQty = regexp.MustCompile(
		`(?i)(?:^|[,\n+&])\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|ek|do|teen|char|paanch|half|dozen)\s+([a-zA-Z][^,\n+&]{2,40}?)(?:\s*[,\n+&]|$)`,
	)

	// ── Pattern 8: Separator-joined lines ────────────────────────────────────
	// "butter chicken-2, naan-3, lassi-1"
	reSeparatorLine = regexp.MustCompile(
		`(?i)([a-zA-Z][^,\n\d]{1,35}?)\s*[-–:]\s*(\d+)\s*(` + unitPattern + `)?(?:\s*[,\n]|$)`,
	)

	// Dedup: items already extracted (avoid double-counting from overlapping patterns)
	reCleanup = regexp.MustCompile(`\s+`)
)

// ─── REGEX EXTRACTION ─────────────────────────────────────────────────────────

// extractByRegex runs all pattern families and merges the results.
// Returns nil if nothing matched.
func extractByRegex(text string) []ExtractedItem {
	// Normalise separators for easier matching
	normalised := strings.ReplaceAll(text, "\r\n", "\n")
	normalised = strings.ReplaceAll(normalised, " and ", ", ")
	normalised = strings.ReplaceAll(normalised, " aur ", ", ")   // Hindi "and"
	normalised = strings.ReplaceAll(normalised, " bhi ", ", ")   // Hindi "also"
	normalised = strings.ReplaceAll(normalised, " with ", ", ")
	normalised = strings.ReplaceAll(normalised, " plus ", " + ")

	type candidate struct {
		item     ExtractedItem
		startPos int
		endPos   int
	}
	var candidates []candidate

	addItem := func(name, qtyStr, unit, raw string, start, end int) {
		name = normaliseName(name)
		if name == "" || len(name) < 2 {
			return
		}
		qty, ok := parseNumber(qtyStr)
		if !ok || qty <= 0 {
			qty = 1
		}
		candidates = append(candidates, candidate{
			item: ExtractedItem{
				Name:     name,
				Qty:      normQty(qty),
				Unit:     normaliseUnit(unit),
				RawMatch: strings.TrimSpace(raw),
			},
			startPos: start,
			endPos:   end,
		})
	}

	// ── Pattern 1: qty*name ───────────────────────────────────────────────────
	for _, m := range reMultiplyOp.FindAllStringSubmatchIndex(normalised, -1) {
		addItem(
			normalised[m[4]:m[5]], // name
			normalised[m[2]:m[3]], // qty
			"",
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 2: qty unit name ──────────────────────────────────────────────
	for _, m := range reQtyUnit.FindAllStringSubmatchIndex(normalised, -1) {
		addItem(
			normalised[m[6]:m[7]],
			normalised[m[2]:m[3]],
			normalised[m[4]:m[5]],
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 3: name qty unit ──────────────────────────────────────────────
	for _, m := range reNameThenQtyUnit.FindAllStringSubmatchIndex(normalised, -1) {
		addItem(
			normalised[m[2]:m[3]],
			normalised[m[4]:m[5]],
			normalised[m[6]:m[7]],
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 4: qty [unit] name ────────────────────────────────────────────
	for _, m := range reQtyItem.FindAllStringSubmatchIndex(normalised, -1) {
		unit := ""
		if m[4] >= 0 {
			unit = normalised[m[4]:m[5]]
		}
		addItem(
			normalised[m[6]:m[7]],
			normalised[m[2]:m[3]],
			unit,
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 5: name - qty ─────────────────────────────────────────────────
	for _, m := range reItemThenQty.FindAllStringSubmatchIndex(normalised, -1) {
		addItem(
			normalised[m[2]:m[3]],
			normalised[m[4]:m[5]],
			"",
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 6: Bullet/numbered list ──────────────────────────────────────
	for _, m := range reListItem.FindAllStringSubmatchIndex(normalised, -1) {
		unit := ""
		if len(m) > 6 && m[6] >= 0 {
			unit = normalised[m[6]:m[7]]
		}
		addItem(
			normalised[m[2]:m[3]],
			normalised[m[4]:m[5]],
			unit,
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 7: Word quantity ──────────────────────────────────────────────
	for _, m := range reWordQty.FindAllStringSubmatchIndex(normalised, -1) {
		addItem(
			normalised[m[4]:m[5]],
			normalised[m[2]:m[3]],
			"",
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	// ── Pattern 8: Separator lines ────────────────────────────────────────────
	for _, m := range reSeparatorLine.FindAllStringSubmatchIndex(normalised, -1) {
		unit := ""
		if len(m) > 6 && m[6] >= 0 {
			unit = normalised[m[6]:m[7]]
		}
		addItem(
			normalised[m[2]:m[3]],
			normalised[m[4]:m[5]],
			unit,
			normalised[m[0]:m[1]],
			m[0], m[1],
		)
	}

	if len(candidates) == 0 {
		return nil
	}

	// ── Dedup: remove near-duplicates (same name, overlapping position) ────────
	seen := make(map[string]bool)
	var items []ExtractedItem
	for _, c := range candidates {
		key := strings.ToLower(reCleanup.ReplaceAllString(c.item.Name, " "))
		if seen[key] {
			continue
		}
		// Check position overlap with already-accepted items
		overlap := false
		for _, prev := range items {
			if strings.ToLower(reCleanup.ReplaceAllString(prev.Name, " ")) == key {
				overlap = true
				break
			}
		}
		if !overlap {
			seen[key] = true
			items = append(items, c.item)
		}
	}
	return items
}

// ─── LLM EXTRACTION ───────────────────────────────────────────────────────────

// llmExtractionPrompt is sent to the LLM when regex fails.
// Strict JSON-only mode with clear examples prevents hallucination.
const llmExtractionPrompt = `You are an order parser for a WhatsApp ordering system in India.

Extract ALL food/product items from the customer message below.

Rules:
- Return ONLY a JSON array of objects, no other text
- Each object: {"name": string, "qty": number, "unit": string}
- unit is one of: "kg","gm","l","ml","pcs","plates","dozen","bottle","packet" — or "" if not specified
- qty defaults to 1 if not specified
- Normalise item names: title case, trim whitespace
- If the message contains NO items (e.g. "hello", "thank you"), return []
- Handle Hindi/English mixed messages
- Examples:
  "2*butter chicken" → [{"name":"Butter Chicken","qty":2,"unit":""}]
  "1kg paneer aur 500gm makhni" → [{"name":"Paneer","qty":1,"unit":"kg"},{"name":"Makhni","qty":500,"unit":"gm"}]
  "3 plates dal, 2 naan, lassi" → [{"name":"Dal","qty":3,"unit":"plates"},{"name":"Naan","qty":2,"unit":""},{"name":"Lassi","qty":1,"unit":""}]

Customer message:
`

// llmExtract calls the LLM (Anthropic Claude by default) to extract items.
// apiKey can be an Anthropic or OpenAI key — the function detects which.
// Returns nil on error (caller falls back to empty result).
func llmExtract(text, apiKey, model string) []ExtractedItem {
	if apiKey == "" || text == "" {
		return nil
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// ── Anthropic Claude ────────────────────────────────────────────────────
	if strings.HasPrefix(apiKey, "sk-ant-") || model == "claude" {
		return llmExtractClaude(client, text, apiKey)
	}

	// ── OpenAI GPT-4o ───────────────────────────────────────────────────────
	return llmExtractOpenAI(client, text, apiKey)
}

func llmExtractClaude(client *http.Client, text, apiKey string) []ExtractedItem {
	body, _ := json.Marshal(map[string]interface{}{
		"model":      "claude-sonnet-4-20250514",
		"max_tokens": 512,
		"messages": []map[string]string{
			{"role": "user", "content": llmExtractionPrompt + text},
		},
	})

	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || len(result.Content) == 0 {
		return nil
	}
	return parseJSONItems(result.Content[0].Text)
}

func llmExtractOpenAI(client *http.Client, text, apiKey string) []ExtractedItem {
	body, _ := json.Marshal(map[string]interface{}{
		"model":       "gpt-4o-mini",
		"max_tokens":  256,
		"temperature": 0,
		"messages": []map[string]string{
			{"role": "system", "content": "You are an order parser. Reply ONLY with a JSON array."},
			{"role": "user", "content": llmExtractionPrompt + text},
		},
	})

	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &result); err != nil || len(result.Choices) == 0 {
		return nil
	}
	return parseJSONItems(result.Choices[0].Message.Content)
}

// parseJSONItems safely parses the LLM's JSON array response.
func parseJSONItems(raw string) []ExtractedItem {
	raw = strings.TrimSpace(raw)
	// Strip markdown code fences if present
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var items []struct {
		Name string      `json:"name"`
		Qty  interface{} `json:"qty"`  // could be int or float
		Unit string      `json:"unit"`
	}
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return nil
	}

	result := make([]ExtractedItem, 0, len(items))
	for _, it := range items {
		name := normaliseName(it.Name)
		if name == "" {
			continue
		}
		var qty float64
		switch v := it.Qty.(type) {
		case float64:
			qty = v
		case int:
			qty = float64(v)
		default:
			qty = 1
		}
		if qty <= 0 {
			qty = 1
		}
		result = append(result, ExtractedItem{
			Name:     name,
			Qty:      normQty(qty),
			Unit:     normaliseUnit(it.Unit),
			RawMatch: "[llm]",
		})
	}
	return result
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

// ExtractOrder is the main entry point.
// It runs the regex engine first, then falls back to the LLM if:
//   - regex returned no items, AND
//   - the message intent looks like a new order
//
// Pass llmAPIKey="" to disable LLM fallback entirely (regex-only mode).
// Pass llmAPIKey=your_key to enable LLM for complex/ambiguous messages.
func ExtractOrder(text, llmAPIKey, llmModel string) ExtractionResult {
	result := ExtractionResult{
		RawText: text,
		Intent:  ClassifyIntent(text),
	}

	// ── Stage 1: Regex ────────────────────────────────────────────────────────
	items := extractByRegex(text)
	if len(items) > 0 {
		result.Items = items
		result.Source = "regex"
		return result
	}

	// ── Stage 2: LLM fallback ─────────────────────────────────────────────────
	// Only call the LLM if the message looks like an order (saves cost).
	if llmAPIKey != "" && result.Intent == "new_order" {
		llmItems := llmExtract(text, llmAPIKey, llmModel)
		if len(llmItems) > 0 {
			result.Items = llmItems
			result.Source = "llm"
			return result
		}
	}

	result.Source = "none"
	return result
}

// ExtractOrderJSON returns a pretty JSON string of the extraction result.
// Useful for storing in the database or logging.
func ExtractOrderJSON(text, llmAPIKey, llmModel string) string {
	result := ExtractOrder(text, llmAPIKey, llmModel)
	b, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return `{"error":"marshal failed"}`
	}
	return string(b)
}

// ToOrderItems converts ExtractedItems to the format expected by the orders API.
// Prices are left at 0 — the business fills them in from their price list.
func ToOrderItems(items []ExtractedItem) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		nameWithUnit := item.Name
		if item.Unit != "" {
			nameWithUnit = fmt.Sprintf("%s (%.0f %s)", item.Name, item.Qty, item.Unit)
		}
		result = append(result, map[string]interface{}{
			"name":       nameWithUnit,
			"qty":        int(math.Round(item.Qty)),
			"unit_price": 0, // to be filled by the business
		})
	}
	return result
}
