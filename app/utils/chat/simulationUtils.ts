import { getIFrameSimulationData } from '~/lib/replay/Recording';
import { getCurrentIFrame } from '~/components/workbench/Preview';
import { simulationAddData } from '~/lib/replay/ChatManager';

export async function flushSimulationData() {
  const iframe = getCurrentIFrame();

  if (!iframe) {
    return;
  }

  const simulationData = await getIFrameSimulationData(iframe);

  if (!simulationData.length) {
    return;
  }

  simulationAddData(simulationData);
}

// Set up the interval in a separate function that can be called once
export function setupSimulationInterval() {
  setInterval(async () => {
    flushSimulationData();
  }, 1000);
} 