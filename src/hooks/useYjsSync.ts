import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { v4 as uuidv4 } from "uuid";

// #region CORE
const DEFAULT_WS_URL = "ws://10.1.14.162:1234";

type ProviderInstance = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider["awareness"];
};

const providerCache = new Map<string, ProviderInstance>();

export function getCollaborativeProvider(
  roomName: string,
  wsUrl: string = DEFAULT_WS_URL
): ProviderInstance {
  const key = `${wsUrl}::${roomName}`;
  if (providerCache.has(key)) return providerCache.get(key)!;

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(wsUrl, roomName, doc);

  const instance = {
    doc,
    provider,
    awareness: provider.awareness,
  };

  providerCache.set(key, instance);
  return instance;
}
// #endregion

export function useYjsSync<T>(
  roomName: string,
  docKey: string,
  defaultValue: T
) {
  const [data, setData] = useState<T>(defaultValue);
  const yMapRef = useRef<Y.Map<any> | null>(null);

  useEffect(() => {
    const { doc, provider } = getCollaborativeProvider(roomName);
    const ymap = doc.getMap(docKey);
    yMapRef.current = ymap;

    const updateFromMap = (events: any, transaction: Y.Transaction) => {
      const value = (ymap.get("value") ?? defaultValue) as T;

      if (!transaction?.origin?.doc) return;
      setData(value);
    };

    ymap.observeDeep(updateFromMap);
    setData((ymap.get("value") ?? defaultValue) as T);

    return () => {
      ymap.unobserveDeep(updateFromMap);
    };
  }, [roomName, docKey]);

  const updateData = (newData: T) => {
    yMapRef.current?.set("value", newData);
  };

  return [data, updateData] as const;
}
