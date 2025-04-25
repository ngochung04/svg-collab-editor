import * as Y from "yjs";
import { getCollaborativeProvider } from "./useYjsSync";
import { useEffect } from "react";

interface YjsSyncProps {
  roomName: string;
  docKey: string;
}

const yjsSync = ({ roomName, docKey }: YjsSyncProps) => {
  const { doc } = getCollaborativeProvider(roomName);

  const ymap = doc.getMap(docKey);

  const listeners: any[] = [];

  const sync = (value: any) => {
    ymap.set("value", value);
  };

  const on = (cb: any) => {
    listeners.push(cb);
  };

  useEffect(() => {
    const callback = (events: any, transaction: Y.Transaction) => {
      listeners.forEach((listener) => listener(events, transaction));
    };

    ymap.observeDeep(callback);

    return () => {
      ymap.unobserveDeep(callback);
    };
  }, []);

  return { sync, on };
};

export default yjsSync;
