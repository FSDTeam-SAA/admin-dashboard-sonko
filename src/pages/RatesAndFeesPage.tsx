import { useState } from "react";
import { Tabs } from "../components/common";
import { ExchangeRatesSection } from "./ExchangeRatesSection";
import { CashOutSettingsSection } from "./SettingsPage";

/**
 * Everything that sets prices: exchange rates, the transfer fee, and Agent
 * Cash Out fees, pay and limits. Senior staff only (manage_rates). Every
 * change needs two different people and applies when the second approves.
 */
export function RatesAndFeesPage() {
  const [part, setPart] = useState<"rates" | "cashout">("rates");
  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Rates and fees</h1>
          <p className="muted">Senior staff only. Every change needs two different people and applies when the second approves.</p>
        </div>
      </div>
      <Tabs
        value={part}
        options={[
          ["rates", "Exchange rates and transfer fee"],
          ["cashout", "Agent cash out"],
        ] as const}
        onChange={setPart}
      />
      <div className="subpage">{part === "rates" ? <ExchangeRatesSection /> : <CashOutSettingsSection />}</div>
    </section>
  );
}
