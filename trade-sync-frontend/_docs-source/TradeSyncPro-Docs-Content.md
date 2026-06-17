# TradeSync Pro — Documentation Content (source of truth)

> **How to use this file (read me first, Cursor):**
> This file contains the full written content for the TradeSync Pro docs site, already split into pages. Each page is delimited by a `=== FILE: <path> ===` marker, followed by YAML frontmatter and the page body (MDX).
> Create one `.mdx` file per block at the exact path shown. **Do not rewrite the prose** — render it. The sidebar and "On this page" TOC are generated from the frontmatter (`section`, `order`) and the in-page headings, so preserve both.
> Frontmatter schema per page: `title`, `description`, `section`, `order`.
> Section order in the sidebar (top to bottom): **Getting Started → Account & Web App → For Copiers → For Providers → Trading & Risk → Reference**.

---

=== FILE: src/content/docs/getting-started/introduction.mdx ===
---
title: Introduction
description: What TradeSync Pro is, who it's for, and how the pieces fit together.
section: Getting Started
order: 1
---

# Introduction

TradeSync Pro is a copy-trading platform for MetaTrader 5 (MT5). It connects two kinds of people:

- **Providers** — experienced traders who broadcast their trades.
- **Copiers** — traders who automatically mirror a provider's trades on their own MT5 account.

When a provider opens, closes, or partially closes a position, that action is replicated on every subscribed copier's account within milliseconds, on the same tick — subject to each copier's own risk settings.

The platform has three parts:

1. **The web app** (this site) — where you create an account, browse and subscribe to providers, manage your profile, and view performance.
2. **The desktop apps** — a Windows program that links your MT5 terminal to TradeSync Pro. Providers run the **Provider** app; copiers run the **Copier** app.
3. **Your MT5 terminal** — your existing broker account in MetaTrader 5. TradeSync Pro never holds your funds; it only sends and receives trade signals.

> **Important:** TradeSync Pro is a tool, not a money manager. You keep full control of your own MT5 account, and you are responsible for your own risk settings and results. Copy trading carries a real risk of financial loss — see [Understanding the Risks](/docs/trading-and-risk/understanding-the-risks).

=== FILE: src/content/docs/getting-started/how-copy-trading-works.mdx ===
---
title: How Copy Trading Works
description: The signal flow from a provider's trade to your account.
section: Getting Started
order: 2
---

# How Copy Trading Works

Copy trading on TradeSync Pro follows a simple, one-directional flow:

1. **A provider trades** on their own MT5 account as they normally would.
2. **The Provider desktop app detects the change** (a new position opening, or an existing one closing) and sends a signal to TradeSync Pro.
3. **TradeSync Pro fans the signal out** to every copier subscribed to that provider.
4. **The Copier desktop app receives the signal** and, after applying your risk rules and symbol mapping, places the matching trade on your MT5 account.

A few things worth understanding up front:

- **You only ever copy one provider at a time.** Subscribing to a new provider replaces your previous subscription.
- **Copying is local to your machine.** The Copier app must be running and connected for trades to mirror. If it's closed, you won't copy anything during that time.
- **Your settings always win.** Volume, symbol names, and risk limits are decided by *your* Copier app, not the provider. A provider can never place a trade larger than your limits allow.
- **Closes are matched to opens.** When a provider closes a position, the app finds the trade it opened for you from that signal and closes it too.

=== FILE: src/content/docs/getting-started/quick-start.mdx ===
---
title: Quick Start
description: The fastest path to copying your first provider, or going live as a provider.
section: Getting Started
order: 3
---

# Quick Start

## If you want to copy trades (Copier)

1. [Create an account](/docs/account-and-web-app/creating-an-account) and verify your email.
2. [Browse the marketplace](/docs/for-copiers/browsing-the-marketplace) and [choose a provider](/docs/for-copiers/choosing-a-provider).
3. [Subscribe](/docs/for-copiers/subscribing) to that provider.
4. [Download and install the Copier app](/docs/for-copiers/installing-the-copier-app) (Windows).
5. [Connect your MT5 account](/docs/for-copiers/connecting-mt5) and [set your risk controls](/docs/for-copiers/risk-controls-and-copy-modes).
6. Press **Start Listening**. You're now copying.

## If you want to share your trades (Provider)

1. [Create an account](/docs/account-and-web-app/creating-an-account), choosing **Provider**, and verify your email.
2. [Get your license key](/docs/for-providers/becoming-a-provider) (issued by an admin).
3. [Download and install the Provider app](/docs/for-providers/installing-the-provider-app) (Windows).
4. [Set up your public profile](/docs/for-providers/your-public-profile) so copiers can evaluate you.
5. [Start broadcasting](/docs/for-providers/broadcasting-and-subscribers).

> New here? Read [How Copy Trading Works](/docs/getting-started/how-copy-trading-works) first — it's two minutes and makes everything else clearer.

=== FILE: src/content/docs/account-and-web-app/creating-an-account.mdx ===
---
title: Creating an Account & Verifying Your Email
description: Sign up, choose your role, and confirm your email with a one-time code.
section: Account & Web App
order: 1
---

# Creating an Account & Verifying Your Email

## Sign up

1. Click **Get started** (or go to `/register`).
2. Enter your full name, email, and a password (minimum 5 characters).
3. Choose your role:
   - **I'm a Copier** — you want to mirror other traders.
   - **I'm a Provider** — you want to broadcast your own trades.
4. Submit the form.

## Verify your email

For security, new accounts must confirm their email before they can be used.

1. After signing up, you'll land on the **email verification** page.
2. Within a few seconds, you'll receive a **6-digit code** by email.
3. Enter the code in the six boxes.
4. If the code is correct, your account is verified and you're taken into the app.

**Didn't get the code?**

- Check your spam/junk folder.
- Use the **Resend** button — it becomes available **30 seconds** after the last send. Resending issues a **new** code and invalidates the previous one, so always use the most recent email.
- Codes expire after a short time. If yours has expired, just resend.
- You have a limited number of attempts per code; after too many wrong tries the code locks and you'll need to resend.

> **Existing users:** If your account was created before email verification was introduced, nothing changes — you can keep signing in normally and will never be asked for a code.

=== FILE: src/content/docs/account-and-web-app/resetting-your-password.mdx ===
---
title: Resetting Your Password
description: Recover access with a one-time email code.
section: Account & Web App
order: 2
---

# Resetting Your Password

If you've forgotten your password, you can reset it with an email code — no support ticket needed.

1. On the [login page](/login), click **Forgot?**.
2. Enter the email address on your account and submit.
3. For privacy, you'll always see a generic confirmation (the platform won't reveal whether an email is registered). If an account exists, a **6-digit code** is sent to that inbox.
4. Enter the code in the six boxes.
5. Once the code is accepted, you'll be asked to set a **new password twice**. The two entries must match, and the password must meet the minimum length.
6. Tip: use the **Generate strong password** button to create a secure alphanumeric password automatically.
7. Submit. You'll see a confirmation, then be returned to the login page to sign in with your new password.

**Notes**

- The same 30-second resend rule and code expiry apply as with signup verification.
- A reset code can only be used once. After you change your password, the code is consumed.

=== FILE: src/content/docs/account-and-web-app/your-dashboard.mdx ===
---
title: Your Dashboard
description: What you see after signing in, by role.
section: Account & Web App
order: 3
---

# Your Dashboard

After signing in, you land on a dashboard tailored to your role.

## Copier dashboard

- **Live KPIs** — session P&L, trades copied, and signals received today.
- **Active subscription** — the provider you're currently copying, with quick links to view their profile or unsubscribe.
- **Marketplace** — browse and switch providers.
- **Trade history** — recent trades from your subscribed provider.

## Provider dashboard

- **Overview** — your license key, total signals sent, connected copiers, open trades, and win rate.
- **Performance** — total P&L, average volume, and closed-trade count.
- **Public profile preview** — how your card looks to copiers in the marketplace.
- **Profile setup** — edit your bio, platform, instruments, strategy, risk level, and typical hold time.

## Admin

Admins manage users, issue provider license keys, and enable or disable accounts from the admin console.

> Your desktop apps are downloaded from the dashboard — providers see the Provider app, copiers see the Copier app. See [Downloads](/docs/reference/downloads).

=== FILE: src/content/docs/for-copiers/browsing-the-marketplace.mdx ===
---
title: Browsing the Marketplace
description: Find providers and understand the numbers on each card.
section: For Copiers
order: 1
---

# Browsing the Marketplace

The marketplace (`/traders`) lists active providers. Each provider card shows a snapshot to help you compare them.

**What the card numbers mean**

- **Win rate** — the percentage of the provider's *closed* trades that were profitable. A high win rate alone does not mean a strategy is safe (see below).
- **ROI** — an **indicative** performance figure, not an audited or verified return. Treat it as a rough signal only, and always look at the full trade history and drawdown before deciding.
- **Risk level** — LOW / MEDIUM / HIGH, **self-declared by the provider**. Useful context, but verify it against the actual equity curve.
- **Instruments** — the symbols the provider typically trades (e.g. XAUUSD, EURUSD).
- **Subscribers** — how many copiers follow them. Popularity is social proof, not proof of quality.
- **LIVE badge** — shown when the provider's desktop app is currently connected. A provider who is rarely live can't broadcast trades while offline.

You can filter the marketplace by risk level. To dig deeper, open a provider's detail page for their full trade history, equity curve, and strategy description.

> Before subscribing, read [How to Evaluate a Provider](/docs/trading-and-risk/evaluating-a-provider) and [Red Flags to Avoid](/docs/trading-and-risk/red-flags-to-avoid).

=== FILE: src/content/docs/for-copiers/choosing-a-provider.mdx ===
---
title: Choosing a Provider
description: A practical checklist before you commit.
section: For Copiers
order: 2
---

# Choosing a Provider

Choosing well is the single most important decision a copier makes. Use this checklist:

- **Look at the equity curve, not just the win rate.** A smooth, steadily rising curve is healthier than a jagged one with deep crashes — even if both have the same win rate.
- **Check the maximum drawdown.** This is the largest peak-to-trough drop the provider has experienced. Ask yourself: could you stomach that drop on your own account?
- **Mind the track record length.** A provider with hundreds of closed trades over months tells you more than one with a handful of recent wins.
- **Match the risk level to your tolerance.** A HIGH risk provider can deliver big gains and big losses. Don't copy more risk than you can afford to lose.
- **Confirm they're active.** Providers who are frequently live broadcast more consistently.
- **Read the strategy description.** Vague or missing descriptions are a yellow flag.

There is no "best" provider — only the one whose risk and style fit *you*. When in doubt, start with a small position size (see [Risk Management Best Practices](/docs/trading-and-risk/risk-management-best-practices)).

=== FILE: src/content/docs/for-copiers/subscribing.mdx ===
---
title: Subscribing & Unsubscribing
description: How to follow a provider, and how to stop.
section: For Copiers
order: 3
---

# Subscribing & Unsubscribing

## Subscribe

From a provider's card or detail page, click **Copy** (or **Start copying**). Your account is now linked to that provider.

- You can copy **one provider at a time**. Subscribing to a new provider replaces the old subscription.
- Subscribing only links your account — trades won't mirror until your **Copier desktop app is installed, connected, and listening**.

## Unsubscribe

From your dashboard's active subscription card, click **Unsubscribe**. You'll immediately stop receiving that provider's signals. Any positions already open on your account remain open — unsubscribing does not close your existing trades. Manage those manually in MT5 or let them close naturally when the provider closes them (only happens while you're still subscribed and listening).

> A provider can also remove you as a subscriber from their end. If that happens, you simply stop copying them and can subscribe to someone else.

=== FILE: src/content/docs/for-copiers/installing-the-copier-app.mdx ===
---
title: Installing the Copier App
description: Download, system requirements, and first launch.
section: For Copiers
order: 4
---

# Installing the Copier App

The Copier desktop app links your MT5 terminal to TradeSync Pro.

## Requirements

- **Windows** (the app depends on MetaTrader 5, which the integration supports on Windows).
- **MetaTrader 5** installed, with a logged-in broker account.
- A verified TradeSync Pro **Copier** account.

## Download & install

1. Go to your [dashboard](/dashboard) or the [Downloads page](/docs/reference/downloads).
2. Download the **Copier** app (copiers and providers use different apps — make sure you grab the right one).
3. Run the installer and launch the app.

## First launch

On the login card, enter:

- Your **registered email** (the same one you signed up with — this is how the platform identifies you as a copier).
- Your **MT5 account ID, password, and server**.
- Your **broker** (or leave on Auto-detect).

Click **Log In**. The app verifies your account with TradeSync Pro and connects to MT5. Once connected, configure [symbol mapping](/docs/for-copiers/symbol-mapping) and [risk controls](/docs/for-copiers/risk-controls-and-copy-modes) before you start listening.

=== FILE: src/content/docs/for-copiers/connecting-mt5.mdx ===
---
title: Connecting MetaTrader 5
description: Logging the Copier app into your broker terminal.
section: For Copiers
order: 5
---

# Connecting MetaTrader 5

The Copier app logs directly into your MT5 terminal using your broker credentials. Nothing leaves your machine except trade signals.

**You'll need:**

- **MT5 account ID** — your login number from your broker.
- **Password** — your MT5 trading password.
- **Server** — your broker's server name exactly as shown in MT5 (e.g. `Broker-Live`).
- **Broker** — pick your broker from the list so the app can find your terminal, or use Auto-detect.

**Tips**

- Make sure you can log into MT5 manually first — if the credentials work there, they'll work in the app.
- The app needs the MT5 terminal installed on the same machine.
- If login fails, double-check the server string; it's the most common mistake.

Once connected, your account info (balance, equity) appears in the app. You're ready to map symbols and set your risk rules.

=== FILE: src/content/docs/for-copiers/symbol-mapping.mdx ===
---
title: Symbol Mapping
description: Match the provider's symbols to your broker's symbol names.
section: For Copiers
order: 6
---

# Symbol Mapping

Different brokers name the same instrument differently — one broker's `XAUUSD` is another's `XAUUSDm`. Symbol mapping tells the Copier app how to translate the provider's symbols into yours.

## How it works

- Open the **Symbols** tab.
- **Add a mapping**: type the provider's symbol (e.g. `XAUUSD`) and your broker's equivalent (e.g. `XAUUSDm`), then add it.
- **Broker presets**: pick the provider's broker and your broker, then load a preset to auto-fill common mappings.

## Unmapped symbols

Choose what happens when a signal arrives for a symbol you haven't mapped:

- **Ignore (skip trade)** — safest; the app skips anything not explicitly mapped.
- **Copy as-is** — uses the provider's symbol name directly (only works if your broker uses the same name).

## If a mapping is missing

If a symbol isn't mapped and you've chosen **Ignore**, that trade simply won't copy. If you want to copy everything, either map each symbol or leave the map empty (which copies all symbols using the provider's names — make sure your broker uses matching names).

=== FILE: src/content/docs/for-copiers/risk-controls-and-copy-modes.mdx ===
---
title: Risk Controls & Copy Modes
description: The guardrails that protect your account, and how volume is calculated.
section: For Copiers
order: 7
---

# Risk Controls & Copy Modes

This is the most important page for protecting your account. Configure these in the **Copy** and **Risk** tabs before you start listening.

## Copy modes (how your trade size is decided)

- **Multiplier** — your volume = the provider's volume × your multiplier. A multiplier of `1.0` copies their size; `0.5` copies half; `2.0` doubles it.
- **Fixed Lot** — every copied trade uses the same fixed lot size, regardless of the provider's size.
- **Reverse copy** — flips BUY into SELL and vice versa. Advanced; only use it if you understand the consequences.

## Risk guards

Each guard is optional (setting it to 0 disables it). When you have several enabled, they're checked in order on every new trade:

- **Equity floor** — blocks new trades if your account equity falls below a minimum you set.
- **Daily loss limit** — automatically pauses copying for the day once your losses reach a threshold. You resume manually.
- **Max concurrent trades** — caps how many copied positions can be open at once.
- **Symbol whitelist** — if set, only the symbols on your list will be copied; everything else is skipped.
- **Max lot cap** — clamps any single copied trade to a maximum size, no matter what the provider or your multiplier produces.
- **Max slippage drift** — measured in pips. If the price has moved too far between the provider's fill and yours, the trade is blocked rather than filled at a bad price. Set to 0 to disable.

> Start conservative. A small multiplier (or small fixed lot) plus a daily loss limit is a sensible first setup. You can always loosen limits once you trust a provider.

=== FILE: src/content/docs/for-copiers/monitoring-trades.mdx ===
---
title: Monitoring Your Trades
description: Watching copied positions and session performance.
section: For Copiers
order: 8
---

# Monitoring Your Trades

The **Trades** tab shows what's happening on your account in real time.

- **Open positions** — every position the app has copied and not yet closed, with ticket, symbol, action, volume, and open time.
- **Session history** — closed copied trades from the current session, with profit/loss, open and close times.
- **Session summary** — counts of open and closed trades plus your running session P&L.

The **Risk** tab also shows your daily P&L and whether copying is currently paused by your daily loss limit. If it's paused, you can reset and resume from there.

**Good habits**

- Glance at open positions periodically — the app should be running whenever you want to copy.
- If your daily loss limit triggers, treat it as a signal to step back and review the provider, not just to immediately resume.

=== FILE: src/content/docs/for-providers/becoming-a-provider.mdx ===
---
title: Becoming a Provider & Your License Key
description: What it takes to broadcast, and how licensing works.
section: For Providers
order: 1
---

# Becoming a Provider & Your License Key

Providers broadcast their trades for copiers to mirror. To broadcast, you need a **license key**.

## How licensing works

- Register (or set your role) as a **Provider**.
- An **admin issues your license key** from the admin console. Your key looks like `TSP-XXXX-XXXX`.
- Your key appears on your **dashboard** once issued. If you don't have one yet, you'll see an "awaiting admin issuance" note.
- The Provider desktop app uses this key to identify you (copiers identify themselves by email; providers by license key).

**Keep your key private.** Anyone with your license key could attempt to broadcast as you. Treat it like a password.

> Once you have your key, [install the Provider app](/docs/for-providers/installing-the-provider-app) and [set up your public profile](/docs/for-providers/your-public-profile).

=== FILE: src/content/docs/for-providers/installing-the-provider-app.mdx ===
---
title: Installing the Provider App
description: Download, requirements, and logging in with your license key.
section: For Providers
order: 2
---

# Installing the Provider App

The Provider desktop app watches your MT5 account and broadcasts your trades.

## Requirements

- **Windows** with **MetaTrader 5** installed and logged in.
- A verified TradeSync Pro **Provider** account.
- Your **license key** (`TSP-XXXX-XXXX`).

## Download & install

1. Go to your [dashboard](/dashboard) or the [Downloads page](/docs/reference/downloads).
2. Download the **Provider** app (not the Copier app).
3. Run the installer and launch it.

## First launch

On the login card, enter:

- Your **license key**.
- Your **MT5 account ID, password, and server**.
- Your **broker** (or Auto-detect).

Click **Log In**. The app verifies your license, connects to MT5, and loads your dashboard with the **Broadcast**, **Subscribers**, and **Performance** tabs.

=== FILE: src/content/docs/for-providers/your-public-profile.mdx ===
---
title: Your Public Profile
description: The information copiers use to evaluate and choose you.
section: For Providers
order: 3
---

# Your Public Profile

Your profile is your storefront. A complete, honest profile earns trust and subscribers.

Set these from the **Profile Setup** tab on your web dashboard:

- **Bio** — a short introduction (up to 300 characters).
- **Trading platform** — what you trade on.
- **Instruments** — the symbols you trade (comma-separated, e.g. `XAUUSD, EURUSD`).
- **Strategy description** — how you trade. Be specific; vague descriptions cost you subscribers.
- **Risk level** — LOW, MEDIUM, or HIGH. Set this honestly — copiers will compare it against your equity curve.
- **Typical hold time** — seconds, minutes, hours, days, or weeks.

Your win rate, total P&L, drawdown, and equity curve are calculated automatically from your closed trades — you don't set these. The most successful providers pair strong, consistent numbers with a clear, honest profile.

=== FILE: src/content/docs/for-providers/broadcasting-and-subscribers.mdx ===
---
title: Broadcasting & Managing Subscribers
description: Going live and managing the copiers who follow you.
section: For Providers
order: 4
---

# Broadcasting & Managing Subscribers

## Broadcasting

From the **Broadcast** tab, press **Start Broadcasting**. The app then watches your MT5 account: whenever you open or close a position, it sends that signal out to your subscribers automatically. You trade normally in MT5 — the app handles the rest.

- Trades the app places are never re-broadcast (it ignores its own activity), so there's no feedback loop.
- Press **Stop Broadcasting** to go offline. While stopped, your trades are not copied and your LIVE badge turns off.

## Managing subscribers

The **Subscribers** tab shows everyone copying you:

- **Roster** — each subscriber's name, email, online/offline status, trades copied, and P&L.
- **Online status** updates live as copiers connect and disconnect.
- **Revoke** — remove a subscriber. They stop copying you immediately. This doesn't disable their account; it just ends their subscription to you.

=== FILE: src/content/docs/for-providers/performance-and-analytics.mdx ===
---
title: Performance & Analytics
description: The metrics on your provider performance tab.
section: For Providers
order: 5
---

# Performance & Analytics

The **Performance** tab (and your public profile) summarize your trading from your closed trades:

- **Total / closed trades** and **win rate**.
- **Total P&L** and **average volume**.
- **Equity curve** — your cumulative profit over time.
- **Risk metrics** — maximum drawdown, average trades per day, longest losing streak, and best single day.
- **Active hours** — when you tend to trade most.
- **Recent broadcasts** — your latest signals with their open/close lifecycle and result.

These are computed from a capped sample of your most recent closed trades, so they reflect your current behavior. Some analytics need a minimum amount of history before they appear (for example, an equity curve needs at least two closed trades).

Copiers see these numbers when deciding whether to follow you — consistency tends to attract and retain subscribers more than occasional big wins.

=== FILE: src/content/docs/trading-and-risk/understanding-the-risks.mdx ===
---
title: Understanding the Risks
description: The risks of copy trading, in plain terms. Read this before you copy.
section: Trading & Risk
order: 1
---

# Understanding the Risks

> **Risk disclaimer:** TradeSync Pro is a trade-copying tool, not financial advice and not a money manager. Trading leveraged products like forex, metals, indices, and crypto CFDs on MT5 carries a high risk of losing money rapidly. **You can lose more than you expect, and past performance never guarantees future results.** Only trade with money you can afford to lose. Nothing in this documentation is a recommendation to follow any particular provider or strategy. You are solely responsible for your own account and decisions. If you're unsure, consult a licensed financial advisor.

With that said, here are the specific risks to understand:

- **Provider risk.** You're trusting someone else's decisions. A provider can have a bad streak, change strategy, over-leverage, or blow up an account. Their past results are not a promise.
- **Leverage risk.** MT5 trades are leveraged. Small market moves can produce large gains *or* large losses relative to your balance.
- **Drawdown risk.** Even good strategies have losing periods. If a provider's worst historical drawdown is 40%, you should be prepared to see something like that on your own account.
- **Slippage and execution risk.** Your fills can differ from the provider's because of price movement, spread, and your broker. The slippage guard reduces bad fills but can also cause you to miss trades.
- **Connectivity risk.** If your Copier app or internet drops, you may miss opens or closes, leaving positions unmanaged.
- **Broker differences.** Different symbols, spreads, leverage, and contract sizes mean your results will never perfectly match the provider's.

The platform gives you tools to manage these risks ([risk controls](/docs/for-copiers/risk-controls-and-copy-modes)), but no tool removes risk entirely.

=== FILE: src/content/docs/trading-and-risk/evaluating-a-provider.mdx ===
---
title: How to Evaluate a Provider
description: What the numbers mean and how to read them honestly.
section: Trading & Risk
order: 2
---

# How to Evaluate a Provider

Numbers can flatter a trader. Here's how to read them critically.

- **Win rate** tells you *how often* a provider wins, not *how much*. A 90% win rate can still lose money if the occasional loss is enormous. Always pair it with P&L and drawdown.
- **Maximum drawdown** is arguably the most important number. It's the biggest drop from a peak the provider has suffered. A lower drawdown for a similar return is the safer profile.
- **Equity curve shape** matters more than any single figure. Favor steady, gradual growth over a curve full of cliffs and spikes.
- **Total P&L** shows scale but not consistency — a single lucky trade can dominate it.
- **Trades per day** hints at style. Very high frequency may mean scalping (sensitive to spread and slippage); very low may mean swing trading (longer holds, larger swings).
- **Longest losing streak** prepares you psychologically. Could you keep copying through that many losses in a row?
- **Track record length / number of closed trades.** More history over more time is more trustworthy than a short hot streak.
- **Risk level vs. reality.** A provider self-declares LOW/MEDIUM/HIGH. If they claim LOW but show 50% drawdowns, trust the curve, not the label.

Remember the **ROI figure shown on cards is indicative, not audited** — use it only as a rough sorting signal, then verify with the full history.

=== FILE: src/content/docs/trading-and-risk/red-flags-to-avoid.mdx ===
---
title: Red Flags — Providers to Avoid
description: Warning signs that a provider is riskier than they look.
section: Trading & Risk
order: 3
---

# Red Flags — Providers to Avoid

No single flag is proof of a bad provider, but several together should make you cautious:

- **Sky-high returns with tiny drawdown.** If it looks too good to be true, it usually is. This pattern often hides a martingale or grid strategy that wins for a while, then collapses catastrophically.
- **Very short track record.** A few days of wins tells you almost nothing. Be skeptical of brand-new accounts with spectacular numbers.
- **Deep, sharp drawdowns on the equity curve.** Big cliffs mean big risk-taking, even if the curve recovered afterward.
- **Risk label that contradicts the curve.** "LOW risk" next to violent swings is a transparency problem.
- **Few closed trades but a high win rate.** Small samples are easy to make look perfect.
- **Rarely live.** A provider who's seldom connected broadcasts inconsistently — you may subscribe and copy nothing for days.
- **No strategy description, or a vague one.** Unwillingness to explain how they trade is a yellow flag.
- **Pressure or guarantees.** Real trading has no guaranteed returns. Anyone promising them is a red flag.

When several of these appear together, walk away — there are other providers.

=== FILE: src/content/docs/trading-and-risk/risk-management-best-practices.mdx ===
---
title: Risk Management Best Practices
description: Practical habits to protect your capital while copying.
section: Trading & Risk
order: 4
---

# Risk Management Best Practices

You control more of your outcome than the provider does, because you control your settings.

- **Test on a demo account first.** Connect the Copier app to an MT5 demo account and copy for a week or two before risking real money.
- **Start small.** Use a low multiplier or a small fixed lot. You can scale up once a provider has earned your trust over time.
- **Always set a daily loss limit.** This single setting prevents one bad day from becoming a disaster.
- **Set an equity floor.** It stops new trades if your account drops below a level you're comfortable with.
- **Cap your lot size and concurrent trades.** Limits the damage from any single trade or a sudden flurry of them.
- **Use the slippage guard** to avoid filling far from the provider's price.
- **Diversify your attention, not your capital.** Since you copy one provider at a time, choose deliberately rather than chasing whoever's hottest this week.
- **Don't override the guards in a losing streak.** The moment you feel the urge to loosen limits to "make it back" is exactly when you shouldn't.
- **Keep the app and your machine reliable.** A stable internet connection and a machine that stays on means fewer missed closes.

Risk management isn't about avoiding all losses — it's about making sure no single loss can take you out of the game.

=== FILE: src/content/docs/reference/downloads.mdx ===
---
title: Downloads
description: Get the Provider and Copier desktop apps.
section: Reference
order: 1
---

# Downloads

TradeSync Pro has two desktop apps. **Download the one that matches your role.**

- **Provider app** — for broadcasting your trades. Requires a license key.
- **Copier app** — for mirroring a provider's trades. Requires your registered email.

You'll also find the right download on your [dashboard](/dashboard) — providers see the Provider app, copiers see the Copier app.

## System requirements

- **Windows** (the apps integrate with MetaTrader 5 on Windows).
- **MetaTrader 5** installed and logged into your broker account.
- A verified TradeSync Pro account.

## Installation

Download the installer, run it, and launch the app. Then follow the setup guide for your role:

- Copiers: [Installing the Copier App](/docs/for-copiers/installing-the-copier-app)
- Providers: [Installing the Provider App](/docs/for-providers/installing-the-provider-app)

=== FILE: src/content/docs/reference/troubleshooting-faq.mdx ===
---
title: Troubleshooting & FAQ
description: Quick fixes for the most common issues.
section: Reference
order: 2
---

# Troubleshooting & FAQ

**My verification / reset email never arrived.**
Check spam first. Wait the 30-second cooldown, then press Resend (which issues a fresh code and invalidates the old one). Make sure you typed the right email.

**Login sends me to the verification page instead of the dashboard.**
Your account isn't verified yet. Enter the new code that was just emailed; you'll then reach the dashboard. (Accounts created before email verification existed are unaffected.)

**The desktop app won't connect to MT5.**
Confirm you can log into MT5 manually with the same ID, password, and server. The server name is the most common error — copy it exactly as MT5 shows it. The MT5 terminal must be installed on the same machine.

**I subscribed but nothing is copying.**
Subscribing only links your account. The Copier app must be installed, connected to MT5, and **listening**. Also check that the provider is live and that your symbol mapping and risk guards aren't skipping the trades.

**Some trades are skipped.**
This is usually intentional: an unmapped symbol (with "Ignore" selected), a symbol not on your whitelist, a blocked slippage drift, or a paused daily loss limit. Check the app's log and your Risk tab.

**My fills don't match the provider's exactly.**
Expected. Spread, broker, leverage, and timing differ. The slippage guard limits how far off a fill can be.

**Can I copy more than one provider at once?**
No — one provider at a time. Subscribing to a new one replaces the previous subscription.

=== FILE: src/content/docs/reference/glossary.mdx ===
---
title: Glossary
description: Key terms used across TradeSync Pro.
section: Reference
order: 3
---

# Glossary

- **Provider** — a trader who broadcasts trades for others to copy. (Internally a "master.")
- **Copier** — a trader who mirrors a provider's trades. (Internally a "slave.")
- **License key** — the `TSP-XXXX-XXXX` credential that identifies a provider in the desktop app.
- **Signal** — a message describing a provider's trade action (open or close) that copiers receive.
- **Multiplier** — a factor applied to the provider's volume to size your copied trade.
- **Fixed lot** — a copy mode that uses a constant lot size for every trade.
- **Reverse copy** — flips BUY into SELL and vice versa.
- **Drawdown** — the drop from a peak in cumulative profit; a key risk measure.
- **Equity floor** — a minimum account equity below which new trades are blocked.
- **Daily loss limit** — a threshold that auto-pauses copying for the day.
- **Slippage / drift** — the difference between the provider's price and your fill price.
- **Whitelist** — a list of symbols you allow to be copied; others are skipped.
- **LIVE badge** — indicates a provider's desktop app is currently connected.
