import fs from "fs";
import path from "path";

const KNOWLEDGE_FILE = path.join(process.cwd(), "data/market-mantra-knowledge.txt");

let cachedKnowledgeBase: string | null = null;

const LEGACY_KNOWLEDGE_BASE = `Monthly Market Mantra – May 2026
...
Monthly Market Update – April 2026

Indian and global financial markets experienced significant volatility during April 2026 as geopolitical tensions in West Asia, rising crude oil prices, inflation concerns, and global policy uncertainty shaped investor sentiment. Despite these challenges, Indian equities staged a notable rebound, supported by resilient domestic fundamentals and selective sector strength.

Market Overview
India

India's macroeconomic environment remained relatively stable despite global uncertainty.

India's Consumer Price Index (CPI) increased to approximately 3.4% in March 2026, while core inflation continued to remain sticky.
GDP growth for FY27 is projected at around 6.9%, slightly lower than FY26's 7.6%.
India's goods trade deficit narrowed to nearly $20.1 billion in March 2026, largely due to lower gold and crude oil imports.
Key Domestic Trends
Inflation remains within the RBI's comfort range but risks from crude oil and monsoon uncertainty persist.
Manufacturing and services activity continued expanding steadily.
GST collections showed strong consumption-driven momentum.
United States

The U.S. economy continued facing inflationary pressure.

U.S. CPI rose to approximately 3.3% in March 2026.
Higher energy prices driven by the Iran conflict contributed significantly to inflation.
The Federal Reserve maintained interest rates during April 2026, signaling a "higher for longer" stance.
U.S. 10-year Treasury yields climbed to around 4.4%, reflecting persistent inflation concerns and policy uncertainty.
Other International Markets
United Kingdom
The Bank of England kept interest rates unchanged while highlighting inflation risks arising from geopolitical tensions.
Japan
Japan's 10-year government bond yield rose sharply to nearly 2.48%.
The increase reflects inflation expectations and gradual monetary policy normalization.
South Korea
South Korea posted GDP growth of 3.6% YoY, led by strong semiconductor exports.
Global Commodity and Energy Markets

Global energy markets remained highly volatile throughout April 2026.

Brent crude oil prices surged above $100 per barrel.
Concerns over disruptions in the Strait of Hormuz intensified supply fears.
Gold prices traded near $4,665 per ounce as investors moved toward safe-haven assets.

The global outlook remains cautious as geopolitical tensions continue affecting energy prices, inflation expectations, and financial conditions worldwide.

Indian Equity Market Performance

Indian markets rebounded strongly during April 2026 after weakness in March.

Broad Market Performance
1-Month Returns
NIFTY 50: 7.5%
NIFTY MIDCAP 50: 12.7%
NIFTY SMALLCAP 100: 18.4%
NIFTY NEXT 50: 15.4%
3-Month Returns
NIFTY 50: -5.2%
NIFTY MIDCAP 50: 1.1%
NIFTY SMALLCAP 100: 6.7%
NIFTY NEXT 50: 2.7%
6-Month Returns
NIFTY 50: -6.7%
NIFTY MIDCAP 50: -0.7%
NIFTY SMALLCAP 100: -2.0%
NIFTY NEXT 50: -0.3%
1-Year Returns
NIFTY 50: -1.4%
NIFTY MIDCAP 50: 10.2%
NIFTY SMALLCAP 100: 9.5%
NIFTY NEXT 50: 8.0%

Mid-cap and small-cap indices significantly outperformed broader markets during the month.

Global Equity Markets

Global markets recovered from March lows during April 2026 due to improving risk sentiment and hopes of geopolitical de-escalation.

However, investors remained cautious because of:

Supply-side disruptions
Rising energy prices
Global inflation pressures
Geopolitical uncertainty
Currency Markets – INR and DXY

The Indian Rupee weakened sharply during the month.

Key Drivers
Stronger U.S. Dollar Index (DXY)
Rising crude oil prices
Foreign Institutional Investor (FII) outflows
Safe-haven demand for the U.S. dollar

The INR traded just below the 95 level against the U.S. dollar.

FII and DII Activity

Foreign Institutional Investors remained net sellers during April 2026.

Major Trend
FIIs continued selling Indian equities amid global risk aversion.
Domestic Institutional Investors (DIIs) provided support but buying activity moderated compared to previous months.
Global LNG Supply Disruption

Global LNG exports declined nearly 7% month-over-month to around 33 million tons in April 2026.

Reasons
Disruptions in Qatar
Strait of Hormuz closure risks
Supply chain bottlenecks

This marked the lowest LNG export level since May 2024.

Aviation Industry Impact

Global airlines reduced approximately:

2 million seats
12,000 scheduled flights
Main Cause
Rising jet fuel prices
Energy supply disruptions

Airlines faced increasing operational and cost pressures due to the surge in crude oil prices.

Bond Market Developments
Japan

Japan's 10-year bond yields reached multi-year highs due to:

Inflation expectations
Policy normalization
Rising global yields
United States

The U.S. 10-year Treasury yield climbed to around 4.4%.

Implications
Tightening global liquidity
Higher borrowing costs
Pressure on risk assets and emerging markets
Sector Performance Overview

Most sectors posted positive returns during April 2026.

Strong Performing Sectors
Realty
Energy
Metals
Consumer Durables
Commodities
Weak or Flat Sectors
IT
Pharma
Sector-Wise Insights
Consumer Durables
Air-conditioner demand remained strong due to heatwaves.
Premium segment supply constraints continued.
Electricals and wires witnessed mixed demand.
View

Global inflation pressures remained elevated across:

U.S.
Europe
UK
Japan

Energy prices remained the biggest inflation driver.

Domestic Macro Updates
Inflation
India's CPI rose to 3.4% in March 2026.
Food and gas inflation contributed significantly.
GST Collections

GST collections increased 8.7% YoY to approximately ₹2.43 lakh crore in April 2026, indicating strong economic activity and consumption.

PMI Trends
Manufacturing PMI
Rose to 55.9 in April 2026
Indicates sustained industrial expansion
Services PMI
Remained steady at 57.9
Supported by strong domestic demand
Medium-Term Outlook
Inflation
Sticky inflation remains a concern globally.
Oil prices could sustain inflationary pressure.
Liquidity
RBI absorbed nearly ₹2 trillion through VRRR operations.
Bond yields moved higher.
Interest Rates
RBI maintained a neutral stance.
Fed maintained higher-for-longer messaging.
Bond Markets
India 10Y yield moved near 7%.
U.S. 10Y yield stayed elevated around 4.4%.
Equity Markets

Markets remain volatile due to:

Crude oil spikes
Geopolitical uncertainty
FII outflows
Inflation concerns
Key Risks Ahead
Elevated crude oil prices
Supply chain disruptions
Strong U.S. dollar pressure on INR
Persistent inflation
High market valuations
Potential El Niño impact on monsoons and rural demand
Disclaimer

This report is based on publicly available information and internal analysis. Market conditions may change, and past performance does not guarantee future results. Investors should consult financial advisors before making investment decisions.`;

export function loadMarketKnowledgeBase(): string {
  if (cachedKnowledgeBase !== null) {
    return cachedKnowledgeBase;
  }

  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      cachedKnowledgeBase = fs.readFileSync(KNOWLEDGE_FILE, "utf8").trim();
      console.log(
        `Market Mantra knowledge base loaded (${cachedKnowledgeBase.length} characters).`
      );
      return cachedKnowledgeBase;
    }
  } catch (error) {
    console.error("Failed to load market mantra knowledge base:", error);
  }

  cachedKnowledgeBase = LEGACY_KNOWLEDGE_BASE;
  console.warn("Using legacy inline market knowledge base fallback.");
  return cachedKnowledgeBase;
}

export const MARKET_KNOWLEDGE_BASE = loadMarketKnowledgeBase();
