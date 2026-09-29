# UPICalc 💳

> **Understand your UPI costs and intelligently split payments.**

UPICalc is a free, zero-dependency, client-side web utility designed to help merchants and customers navigate the **October 2026 UPI MDR regulations**. 

It calculates potential Merchant Discount Rate (MDR) deductions and provides a payment splitting calculator to help users divide large bills into chunks below the ₹2,000 charge threshold, legally saving on payment processing costs.

## 🌟 Why is this project important?

Starting **October 15, 2026**, Person-to-Merchant (P2M) UPI transactions greater than **₹2,000** attract a **0.4% MDR fee** (capped at ₹300 per transaction) + 18% GST. This fee is deducted directly from merchant settlements.

However, transactions of **₹2,000 or below remain 100% free of MDR**. 

UPICalc helps bridge the knowledge gap by:
1. **Educating users**: Providing clear, factual, and verified data about UPI rules, exemptions, and ecosystem sharing without political spin.
2. **Calculating costs**: Showing merchants exactly how much they will lose in MDR + GST for any given transaction.
3. **Providing solutions (Splitting)**: Mathematically calculating how to split a large bill (e.g., ₹10,000) into smaller payments of ₹1,999 to ensure the merchant is charged ₹0 in MDR.

## 🚀 Key Features

- **Split Calculator:** Instantly divide large amounts into safe ₹1,999 chunks. Configurable max-split amounts.
- **MDR vs. Split Comparison:** Side-by-side comparison of the cost of a single transaction vs. a split transaction.
- **Real-time Validation:** Live UI feedback to ensure split thresholds are not exceeded.
- **Comprehensive MDR Guide:** Reference tables, timeline, rule cards, and detailed breakdowns based on official NPCI and RBI guidelines.
- **100% Privacy Focused:** Everything runs locally in your browser. No databases, no trackers, no backend APIs, and no payment gateways.
- **Mobile First:** Optimized for mobile screens, fast loading, and readable typography.

## 🛠️ Tech Stack

This project is built with an emphasis on speed, simplicity, and ease of hosting:
- **HTML5**
- **Vanilla CSS3** (Embedded, using CSS variables for theming)
- **Vanilla JavaScript** (Embedded, zero dependencies)

## 💻 How to run locally

Since there is no build step or backend required, running the project is incredibly simple:

1. Clone the repository:
   ```bash
   git clone https://github.com/arifmuhammed007/Upicalc.git
   ```
2. Open the `index.html` file in any modern web browser.

## ⚠️ Disclaimer

UPICalc is an **informational and educational tool only**. 
- It does **not** process, initiate, or handle UPI payments.
- It does **not** determine a specific merchant's exact MDR eligibility.
- It is **not** affiliated with the NPCI, RBI, or any government body.
- Calculations provided are illustrative estimates. Merchants should always consult their acquiring bank or payment aggregator for precise settlement terms.

---
*Inspired by the educational resources available on UPITax.com.*
