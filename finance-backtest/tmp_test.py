import pandas as pd

try:
    sp500 = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]
    print("SP500:", sp500['Symbol'].head().tolist())
except Exception as e:
    print("SP500 Error:", e)

try:
    nasdaq = pd.read_html('https://en.wikipedia.org/wiki/Nasdaq-100')[4]
    print("Nasdaq-100:", nasdaq['Ticker'].head().tolist())
except Exception as e:
    try:
        nasdaq = pd.read_html('https://en.wikipedia.org/wiki/Nasdaq-100')[3]
        print("Nasdaq-100 (table 3):", nasdaq['Ticker'].head().tolist())
    except Exception as e2:
        print("Nasdaq Error:", e2)

try:
    russell = pd.read_html('https://en.wikipedia.org/wiki/Russell_1000_Index')[2]
    print("Russell 1000:", russell['Ticker'].head().tolist())
except Exception as e:
    # the wiki for Russell 1000 doesn't have a table of tickers typically. It has a link to Russell 3000 or external.
    print("Russell Error:", e)
