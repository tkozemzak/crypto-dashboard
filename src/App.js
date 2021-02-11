import Dashboard from "./components/Dashboard";
import "./App.css";
import { formatData } from "./utils";
import { useState, useRef, useEffect } from "react";

function App() {
  const [currencies, setCurrencies] = useState([]);
  const [pair, setPair] = useState("");
  const [price, setPrice] = useState("0.00");
  const [pastData, setPastData] = useState({});
  const ws = useRef(null);

  let first = useRef(false);
  const url = "https://api.pro.coinbase.com";

  useEffect(() => {
    ws.current = new WebSocket("wss://ws-feed.pro.coinbase.com");

    let pairs = [];

    const fetchData = async () => {
      await fetch(url + "/products")
        .then((res) => res.json())
        .then((data) => (pairs = data));
      console.log("pairs", pairs);
      let filteredPairs = pairs.filter((pair) => {
        if (pair.quote_currency === "USD") {
          return pair;
        }
      });

      filteredPairs = filteredPairs.sort((a, b) => {
        if (a.base_currency < b.base_currency) {
          return -1;
        }
        if (a.base_currency > b.base_currency) {
          return 1;
        }
        return 0;
      });
      console.log("filteredPairs", filteredPairs);
      setCurrencies(filteredPairs);
      first.current = true;
    };
    fetchData();
  }, []);

  useEffect(() => {
    console.log("second useeffect");
    if (!first.current) {
      console.log("first.current doesn't exist");
      return;
    }

    let msg = JSON.stringify({
      type: "subscribe",
      product_ids: [pair],
      channels: ["ticker"],
    });

    ws.current.send(msg);

    let historicalDataURL = `${url}/products/${pair}/candles?granularity=86400`;
    const fetchHistoricalData = async () => {
      let dataArr = [];
      await fetch(historicalDataURL)
        .then((res) => res.json())
        .then((data) => (dataArr = data));

      let formattedData = formatData(dataArr);
      setPastData(formattedData);
      console.log("formattedData", formattedData);
    };
    fetchHistoricalData();

    ws.current.onmessage = (e) => {
      let data = JSON.parse(e.data);
      if (data.type !== "ticker") {
        return;
      }
      if (data.product_id === pair) {
        setPrice(data.price);
      }
    };
  }, [pair]);

  const handleSelect = (e) => {
    let unsubMsg = {
      type: "unsubscribe",
      product_ids: [pair],
      channels: ["ticker"],
    };
    let unsub = JSON.stringify(unsubMsg);

    ws.current.send(unsub);

    setPair(e.target.value);
  };

  return (
    <div className="container">
      {
        <select name="currency" value={pair} onChange={handleSelect}>
          {currencies.map((cur, idx) => {
            return (
              <option key={idx} value={cur.id}>
                {cur.display_name}
              </option>
            );
          })}
        </select>
      }
      <Dashboard price={price} data={pastData} />
    </div>
  );
}

export default App;
