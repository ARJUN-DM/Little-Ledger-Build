# Ledger — Accounts, Filters, Carry-forward Balance

**Status:** plan only. Nothing in this document has been built yet. Build starts only after your approval.

This document organises the whole set of ideas you described into a single spec, resolves the details, and lists what I will change. The last section lists everything I deliberately left out and the few small decisions I would like you to confirm.

---

## 0. Summary of what changes

| # | Change | Where it shows up |
|---|--------|-------------------|
| 1 | Three accounts — **Debit**, **Credit**, **Cash** — with a pinned switcher on every screen | Whole app |
| 2 | Every screen, total, month, filter and backup becomes **per account** | Whole app |
| 3 | **Credit** account shows *Amount owed* and *Limit remaining* (limit set in Settings) | Home, Months, Transactions |
| 4 | **Withdrawn** type on Debit moves money to Cash automatically | Transaction form + both accounts |
| 5 | **Credit bill** expense category on Debit pays down the Credit card automatically | Transaction form + both accounts |
| 6 | Money moved this way is a **linked pair** — edit one side, the other follows; delete one, both go | Edit/delete |
| 7 | **Filter panel** with checkbox categories, checkbox types, sort order, and an Apply button | Transactions + month detail |
| 8 | **Total block at the end of the list** (expenses + net), always, filtered or not | Transactions, month detail |
| 9 | **Year dropdown** (All years by default) in the Months tab | Months |
| 10 | **Balance never resets** — it carries forward across months and years | Home, Months |
| 11 | Opening / closing balance for each month | Month cards + month detail |
| 12 | Filters and year selection **reset when the app is reopened** | Everywhere |
| 13 | Existing entries and old backups migrate to **Debit** without loss | Data layer |

---

## 1. The three accounts

### 1.1 What an account is

The app is split into three independent ledgers, like sub-sheets in a spreadsheet:

| Account | What it holds | Balance meaning |
|---------|---------------|-----------------|
| **Debit** | Bank / savings account, salary, card spends | Money you have (income − outflow) |
| **Credit** | Credit card spends and payments | **Amount owed** (expenses − payments) |
| **Cash** | Wallet / physical cash | Money you have (income − outflow) |

Each account has its **own** transactions, balance, months, year list, filters and totals. Nothing is shared except the two linked transfer flows in section 3.

### 1.2 The account switcher

- A horizontal segmented control — `Debit | Credit | Cash` — **pinned at the top of every screen** (Home, Transactions, Months, Month detail, Transaction detail, Settings).
- It stays visible while the content scrolls, directly under the safe area, above the screen content.
- Hidden only on the **welcome** and **install** screens, which have no ledger context.
- Switching the account keeps you on the current tab (e.g. Transactions → Transactions) and re-renders that tab for the chosen account.
- Switching the account **clears active filters and resets the year dropdown to "All years"**, because categories and years differ per account.
- The bottom tab bar stays as it is: Home · Transactions · Months.

### 1.3 What "every feature" means concretely

For the selected account only:

- Home: balance card, this month's income/expenses, recent entries, entry count.
- Transactions: grouped history, filter panel, end-of-list total.
- Months: year dropdown, month cards with opening/closing balance.
- Month detail: that month's entries, filter panel, totals.
- Add / edit / delete, transaction detail screen.
- Backup export (JSON + CSV), restore/merge.

### 1.4 Existing data

- On first launch after the update, every existing transaction is assigned `account: "debit"`.
- Storage schema version goes **1 → 2**. Migration runs once, is additive, and never drops entries.
- Old backups (JSON without an account field) import into **Debit**.
- Old CSV exports are not re-importable today and stay that way.

---

## 2. Credit card behaviour

### 2.1 Balance

The Credit account does not show "money you have". It shows:

```
Amount owed      12,400.00
Limit remaining  37,600.00   (limit 50,000.00)
```

- **Amount owed** = credit expenses − credit payments. Always shown as a positive "you owe" number; a negative value means the card is in credit and is labelled "In credit".
- **Limit remaining** = limit − amount owed.
- If the limit is not set: show "No limit set" with a small link to Settings instead of a remaining figure.
- If the amount owed exceeds the limit: limit remaining turns into the warning colour and reads e.g. `−1,200.00 over limit`.
- The Home card for Credit uses the same wording, so it is never mistaken for spendable cash.

### 2.2 Credit limit in Settings

- New Settings row: **Credit card limit**, a money field, saved like the cover name (Save button + confirmation message).
- Empty / zero means "not set".
- It is included in the backup file.

### 2.3 Entry types on Credit

| Type | Allowed on Credit | Effect on amount owed |
|------|-------------------|-----------------------|
| Expense | Yes | increases |
| Refund / payment received | Yes — this is "Payment" | decreases |

Payments created by the Debit → Credit flow (section 3.2) are this type. The type picker on the Credit account therefore reads **Expense · Payment**, not Expense · Income.

---

## 3. Money moving between accounts

### 3.1 Debit → Cash: the "Withdrawn" type

The Debit type picker becomes three options:

```
Expense      Income      Withdrawn
```

- **Withdrawn** records an ATM / cash withdrawal.
- It requires an amount and a date like any entry; its category is fixed (**"ATM withdrawal"**) — no category chips appear, so the type can never be paired with a wrong category.
- Effect: **Debit** loses the amount as outflow, **Cash** gains the same amount as income.
- On Debit it counts in the Expenses total and in Net (money left the account), and it appears under the category *ATM withdrawal* in filters.
- The form explains the consequence inline: *"Debited from Debit card and added to Cash."*

### 3.2 Debit → Credit: the "Credit bill" expense category

- A new category, **Credit bill**, appears in the **Expense** category chips on the Debit account only.
- It is **not** offered for Income or Withdrawn, and not on Cash or Credit.
- Effect: **Debit** records an expense (money left the bank), **Credit** records a payment that reduces the amount owed.
- The form explains it: *"Paid from Debit card and applied to the Credit card bill."*

### 3.3 The linked pair

Both flows create **two** transactions, one in each account, linked:

- Each entry stores an `account`, a `linkId` shared by both, and a `role` (`source` / `mirror`).
- The mirror entry is created automatically with:
  - Cash mirror: type Income, category **Cash withdrawal**, same date and amount, note copied.
  - Credit mirror: type Payment, category **Bill paid**, same date and amount, note copied.
- Both entries are real rows in their account: they appear in history, months, month cards, totals, filters, CSV and JSON exports. Nothing is hidden or computed on the fly.
- A mirror row is visually marked with a small "linked" tag (e.g. `⇄ Debit`) so it is clear where it came from.

### 3.4 Editing and deleting linked pairs

| Action | Behaviour |
|--------|-----------|
| Edit amount / date / note on either side | Both sides update; a note in the editor says the change reaches the other account |
| Edit type / category on a mirror | Not allowed — the mirror's type and category are fixed by the flow; the editor shows them read-only |
| Delete either side | Confirmation text names both accounts, e.g. *"This also removes the matching entry in Cash. Delete both?"* — one confirm deletes both |
| Delete the source | Same as above, mirrored in the other direction |

There is never a state where only one half of a transfer exists, so no account's balance can silently drift.

### 3.5 Totals with transfers

- Debit: withdrawal and credit-bill entries are **outflows** — they count in Expenses and Net.
- Cash: withdrawals count as **income** (money genuinely arrived).
- Credit: payments reduce the amount owed and are shown as `−` against spending.
- Nothing double-counts inside a single account, because each account only holds its own side.

---

## 4. Balance carry-forward

### 4.1 Home

- The Balance card shows the **selected account's current balance across all time**, not just this month. It no longer drops to zero when a month or year changes.
- Label changes from "This month" to **"All time"**; the income / expense split underneath keeps showing **this month** with its own label, so both readings are available at a glance.
- Credit: the same card shows **Amount owed** / **Limit remaining** instead (section 2.1).

### 4.2 Months tab and month detail

Each month carries a running balance for that account:

| Figure | Definition |
|--------|------------|
| **Opening** | Balance of everything dated before the 1st of that month |
| **Net** | Income − outflow within the month |
| **Closing** | Opening + Net (Credit: owed at month end) |

- Month cards show month income / expenses / net as today, plus small **Opening** and **Closing** figures.
- Month detail shows a three-part block: Opening, this month's movement, Closing.
- Opening and Closing come from the **whole account history**, so they are correct regardless of which year is selected or which filter is active.
- Credit months display these as "owed at start" / "owed at end".

### 4.3 Year boundaries

Because opening balance is computed from all history rather than the selected year, January of any year opens with the previous December's closing balance. Nothing is reset at a year change.

---

## 5. Filters

### 5.1 Where the filter panel exists

- **Transactions** tab.
- **Month detail** (a single month).
- Not on Home, not on the Months list (the year dropdown covers that).

A **Filter** button sits next to the entry count at the top of those screens. When any filter is active, the button shows a count (e.g. `Filter · 2`) and a one-line summary of what is applied appears under it.

### 5.2 What is inside

A collapsible panel (same slide-up sheet style as the transaction editor) containing:

**1. Categories — checkboxes**
- One checkbox per category that **exists in the selected account**, split into *Expense* and *Income* groups, plus the transfer categories.
- Multi-select: tick any combination, untick any.
- No categories ticked = all categories (the default). A "Select all / Clear" pair sits at the top of this section.

**2. Type — checkboxes**
- `Income`, `Expense`, and (Debit only) `Withdrawn`; on Credit `Expense` and `Payment`.
- Same checkbox pattern, same multi-select behaviour. Nothing ticked = all types.

**3. Sort order — single choice**
- `Newest first` (default) · `Oldest first` · `Largest first`.
- This one **must** be a single choice — two opposite orders cannot both apply — so it is presented as a three-way segmented control with the same visual weight as the checkboxes. Everything else in the panel is a checkbox, as you asked.

**4. Buttons**
- **Apply** — commits the selection and re-renders the list.
- **Reset** — clears every checkbox back to "all" and sort back to newest first, then applies.
- Closing the sheet without Apply leaves the previous filter untouched.

### 5.3 Behaviour

- Filtering affects the transaction rows **and** the end-of-list total block; the count line reads e.g. `Showing 12 of 47 entries`.
- Month grouping headers stay, but months with no matching entries are hidden while a filter is active.
- The summary card at the top (Income / Expenses / Net) keeps showing the **account's real figures**, not the filtered subset, so it can't be confused with the filtered total at the bottom. Its label gains "All entries" while a filter is active.
- Filters apply per screen: filtering Transactions does not filter a month detail, and each account starts unfiltered.
- Filters are **never saved**: reopening the app (or reloading it) returns everything to the default state. This is the "return to default when the app is closed and removed from recents" rule, implemented as: nothing about filters is written to storage.

### 5.4 End-of-list total

Always present at the bottom of the list — with or without a filter, and in every month:

```
─────────────────────────────
Expenses          −12,450.00
Net                −3,200.00
```

- **Expenses** = sum of outflows among the rows shown (expenses, withdrawals, credit-bill expenses).
- **Net** = income in those rows − outflows in those rows.
- On Credit, the expense line reads "Spent" and Net is shown as the change in amount owed.
- When a filter is active the block is labelled with what it covers, e.g. *"Groceries, Dining · 12 entries"*.
- On the **Months list**, a totals footer for the selected year appears under the month cards, computed from all months of that year whether or not a year filter narrowed the list — so the year total is always readable.

---

## 6. Year selector in the Months tab

- A dropdown at the top of the Months tab, above the month cards: **All years** (default), then every year that has at least one entry in the selected account, newest first.
- Selecting a year shows only that year's month cards. "All years" shows everything, newest month first, as today.
- Years are per account and are derived from real entry dates — no empty years are listed.
- The dropdown resets to **All years** on app launch and on account switch; it is not persisted.
- The year totals footer (section 5.4) follows the dropdown: with a year selected it shows that year; with "All years" it shows the profile's all-time footer labelled "All years".

---

## 7. Reset rules (summary)

| State | Persisted? | Resets when |
|-------|-----------|-------------|
| Selected account | Yes — the app remembers your account | Never (until changed) |
| Filters (categories, types, sort) | **No** | App reopened, account switched, or Reset pressed |
| Year dropdown | **No** | App reopened, account switched |
| Month grouping / scroll | No | On navigation, as today |
| Transactions, credit limit, name, backups | Yes | Never |

"Reopening the app" means a fresh launch (browser tab reload, or the installed app started again), which is the same moment as "exits and is removed from recents" for our purposes — in-memory UI state simply does not survive it.

---

## 8. Data & compatibility

- **Schema v2.** Transaction shape gains `account` and, for transfers, `linkId` and `role`.
- Migration: v1 entries → `account: "debit"`, no links. Runs automatically, idempotent.
- **Backup JSON** gains `account`, `linkId`, `role`, and a top-level `creditLimit`. Import handles v1 and v2 files; unknown accounts fall back to Debit; orphaned links are dropped to plain entries.
- **CSV export** gains an `Account` column and keeps one row per transaction (so a transfer appears twice, once per account).
- **Merge** treats linked pairs as a unit: if either half of a pair already exists, both halves are reconciled together.
- Filter/view state is not written to storage at all — see section 7.
- Service worker cache version bumped so the update reaches installed phones.

---

## 9. Screen-by-screen changes

- **Home** — account switcher; all-time balance (or Amount owed / Limit remaining); this-month split; recent entries and count filtered by account.
- **Transactions** — account switcher; Filter button + summary; month groups for that account; end-of-list total block.
- **Months** — account switcher; year dropdown; month cards with opening/closing; year totals footer.
- **Month detail** — account switcher; opening / movement / closing block; Filter button; entries; end-of-list total.
- **Transaction detail** — account switcher; shows which account and, for transfers, the linked entry with a link back to it.
- **Transaction form** — account label; type triple on Debit (Expense / Income / Withdrawn); Credit bill category on Debit expenses; Payment type on Credit; inline explanation of transfers; locked fields on mirrors.
- **Settings** — Credit card limit field; backup/import messages mention accounts; everything else unchanged.
- **Welcome / install** — untouched, no account switcher.

---

## 10. Build order (once approved)

1. Data layer: schema v2, `account`, links, migration, backup/CSV, merge.
2. Account switcher + per-account rendering on all existing screens.
3. Credit presentation + Settings limit.
4. Withdrawn and Credit bill flows with mirrors, edit/delete guards.
5. Balance carry-forward, opening/closing, year dropdown.
6. Filter panel + end-of-list totals.
7. Reset-on-launch wiring, service worker bump.
8. Checks: extend the existing `welcome-test.mjs` suite plus new store/transfer/filter/carry-forward assertions, run all three existing test files, build, verify locally in the browser, then ask for permission to deploy.

---

## 11. Left out on purpose, and small decisions to confirm

These are **not** in the plan above. Tell me if any should be added; otherwise I will build exactly what is written.

1. **Reverse transfers.** Only Debit → Cash (withdraw) and Debit → Credit (bill) exist. There is no "Cash deposited to Debit" and no "pay credit bill from Cash". I suggest adding the Cash → Debit deposit later, if you ever actually deposit cash back. *(Proposed: leave out of this round.)*
2. **Refunds on the Credit card.** Credit has Expense and Payment only. A merchant refund would need a third type. *(Proposed: leave out.)*
3. **Renaming accounts**, setting a starting balance, or adding an opening-balance entry. Your existing Debit history is your starting point. *(Proposed: leave out; a "starting balance" entry can be recorded as an Income row today.)*
4. **Year total vs month total wording.** With "All years" selected the Months footer is labelled "All years"; with a year selected it names the year. Say if you would rather hide the footer in the "All years" case.
5. **Filter persistence within a session.** Filters survive tab switches inside the app and reset on relaunch. If you would rather they reset on every tab switch, say so.
