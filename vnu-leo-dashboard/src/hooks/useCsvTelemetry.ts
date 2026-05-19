import { useEffect, useState } from "react";
import csvText from "../../../log.csv?raw";
import { buildCsvMetrics } from "../utils/csvMetrics";

export function useCsvTelemetry() {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    setState({ loading: false, data: buildCsvMetrics(csvText) });
  }, []);

  return state;
}
