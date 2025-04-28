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

  const onSync = (cb: any) => {
    listeners.push(cb);
  };

  const getSyncedData = () => ymap.get("value");

  useEffect(() => {
    const callback = (events: any, transaction: Y.Transaction) => {
      if (!transaction?.origin?.doc) return;
      listeners.forEach((listener) =>
        listener(getSyncedData(), events, transaction)
      );
    };

    ymap.observeDeep(callback);

    return () => {
      ymap.unobserveDeep(callback);
    };
  }, []);

  return { sync, onSync, getSyncedData };
};

export default yjsSync;
