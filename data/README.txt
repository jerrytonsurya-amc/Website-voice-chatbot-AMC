Shriram AMC Voice Bot — Knowledge Base Files
==========================================

market-mantra-knowledge.txt
  Scraped text + tables from Monthly Market Mantra PDF and PPT files.
  Used by: searchMarketKnowledge tool (voice bot)

nav-database.txt
  All month-end NAV rows in plain text (from Month_End_NAV.xlsx).
  Used for reference; search uses nav-records.json

nav-records.json
  Structured NAV data for getNavData and getFundPerformance tools.

fund-catalog.txt
  List of Shriram AMC fund names.

Rebuild after updating source files:
  npm run build:data
