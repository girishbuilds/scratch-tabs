import { Tablet, TabletState } from "../types";
import { JwtDecoder } from "./components/JwtDecoder";
import { JwtEditor } from "./components/JwtEditor";
import { JwtVerifier } from "./components/JwtVerifier";
import { JwtKeyManager } from "./components/JwtKeyManager";
import { Tabs } from "./components/ui/Tabs";
import { JwtHistory } from "./components/JwtHistory";
import { decodeJwt } from "./utils/jwtUtils";
import { JwtState, JwtHistoryItem, StoredKey } from "./types";
import { SensitiveDataManager } from "../../utils/sensitiveDataManager";
import { Key } from "../../components/Icons";

interface JwtTabletState extends TabletState {
  type: "jwt";
  data: JwtState;
}

export const JwtTablet: Tablet = {
  id: "jwt",
  label: "JWT",
  keywords: ["jwt", "token", "json web token", "decode", "verify", "sign"],
  config: {
    showStandardHeader: false,
  },

  createInitialState(payload?: { token?: string }): JwtTabletState {
    // A seeded token (e.g. from the editor context menu) is decoded up front:
    // the decoder only re-decodes when the text changes after mount.
    const token = payload?.token?.trim() ?? "";
    const decoded = token ? decodeJwt(token) : null;

    return {
      type: "jwt",
      data: {
        token,
        header: decoded?.header ?? {},
        payload: decoded?.payload ?? {},
        signature: decoded?.signature ?? "",
        isValid: null,
        error: null,
        warning: decoded?.warning ?? null,
        activeTab: "decode",
        history: [],
        storedKeys: [],
        verificationKey: "",
        verificationKeyType: "text",
        signingKey: "",
        signingKeyType: "text",
        signingAlgorithm: "HS256",
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "jwt" && parsed.data) {
        // Migrate stored keys
        let migratedStoredKeys = Array.isArray(parsed.data.storedKeys)
          ? parsed.data.storedKeys
          : [];
        migratedStoredKeys = SensitiveDataManager.migrateObjectArray(
          migratedStoredKeys,
          ["value"],
        );

        // Ensure all required properties exist for the main data
        const deserializedData: JwtState = {
          token: parsed.data.token || "",
          header:
            typeof parsed.data.header === "object" &&
              parsed.data.header !== null
              ? parsed.data.header
              : {},
          payload:
            typeof parsed.data.payload === "object" &&
              parsed.data.payload !== null
              ? parsed.data.payload
              : {},
          signature: parsed.data.signature || "",
          isValid:
            parsed.data.isValid === true || parsed.data.isValid === false
              ? parsed.data.isValid
              : null, // Explicitly check boolean or null
          error: parsed.data.error || null,
          warning: parsed.data.warning || null,
          activeTab: parsed.data.activeTab || "decode",
          history: [], // Initialize, will be populated next
          storedKeys: migratedStoredKeys.map((k: any) => ({
            // Sanitize stored keys too
            name: k?.name || "Unnamed Key",
            value: k?.value || "", // Already migrated above
            type: ["text", "base64", "pem"].includes(k?.type) ? k.type : "text",
            algorithm: k?.algorithm || undefined,
            isPublic: typeof k?.isPublic === "boolean" ? k.isPublic : false,
            createdAt:
              typeof k?.createdAt === "number" ? k.createdAt : Date.now(),
          })),
          verificationKey: SensitiveDataManager.migrateField(
            parsed.data.verificationKey || "",
          ),
          verificationKeyType: ["text", "base64", "pem"].includes(
            parsed.data.verificationKeyType,
          )
            ? parsed.data.verificationKeyType
            : "text",
          signingKey: SensitiveDataManager.migrateField(
            parsed.data.signingKey || "",
          ),
          signingKeyType: ["text", "base64", "pem"].includes(
            parsed.data.signingKeyType,
          )
            ? parsed.data.signingKeyType
            : "text",
          signingAlgorithm: parsed.data.signingAlgorithm || "HS256",
        };

        // Sanitize history items
        if (Array.isArray(parsed.data.history)) {
          deserializedData.history = parsed.data.history
            .map(
              (histItem: any): JwtHistoryItem => ({
                token: histItem?.token || "",
                header:
                  typeof histItem?.header === "object" &&
                    histItem.header !== null
                    ? histItem.header
                    : {}, // Ensure header is an object
                payload:
                  typeof histItem?.payload === "object" &&
                    histItem.payload !== null
                    ? histItem.payload
                    : {}, // Ensure payload is an object
                signature: histItem?.signature || "",
                timestamp:
                  typeof histItem?.timestamp === "number"
                    ? histItem.timestamp
                    : Date.now(),
              }),
            )
            .slice(0, 20); // Also re-apply history limit
        }

        return {
          ...parsed, // Keep top-level type
          data: deserializedData,
        };
      }
    } catch (e) {
      console.error("Failed to deserialize JWT state:", e);
    }
    return this.createInitialState();
  },

  render(state: JwtTabletState, onChange) {
    const { data } = state;

    const updateState = (newData: Partial<JwtState>) => {
      onChange({
        ...state,
        data: {
          ...data,
          ...newData,
        },
      });
    };

    const handleTabChange = (tab: string) => {
      updateState({ activeTab: tab });
    };

    const addToHistory = (item: JwtHistoryItem) => {
      // Check if token already exists in history
      const exists = data.history.some(
        (historyItem) => historyItem.token === item.token,
      );
      if (exists) return;

      // Add to history, limit to 20 items
      const newHistory = [item, ...data.history].slice(0, 20);
      updateState({ history: newHistory });
    };

    const clearHistory = () => {
      updateState({ history: [] });
    };

    const loadFromHistory = (item: JwtHistoryItem) => {
      updateState({
        token: item.token,
        header: item.header,
        payload: item.payload,
        signature: item.signature,
      });
    };

    const addStoredKey = (key: StoredKey) => {
      // Check if key with same name already exists
      const exists = data.storedKeys.some((k) => k.name === key.name);
      if (exists) {
        // Update existing key
        const newKeys = data.storedKeys.map((k) =>
          k.name === key.name ? key : k,
        );
        updateState({ storedKeys: newKeys });
      } else {
        // Add new key
        updateState({ storedKeys: [...data.storedKeys, key] });
      }
    };

    const removeStoredKey = (name: string) => {
      const newKeys = data.storedKeys.filter((k) => k.name !== name);
      updateState({ storedKeys: newKeys });
    };

    const clearStoredKeys = () => {
      updateState({ storedKeys: [] });
    };

    const useStoredKey = (
      key: StoredKey,
      purpose: "verification" | "signing",
    ) => {
      if (purpose === "verification") {
        updateState({
          verificationKey: key.value,
          verificationKeyType: key.type,
        });
      } else {
        // For signing, update the algorithm if specified in the key
        const newState: Partial<JwtState> = {
          signingKey: key.value,
          signingKeyType: key.type,
        };

        // Update algorithm if specified in the key
        if (key.algorithm) {
          newState.signingAlgorithm = key.algorithm;
        }

        updateState(newState);
      }
    };

    return (
      <div className="h-full bg-canvas flex flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 p-4 border-b border-base flex-none">
          <Key className="w-6 h-6 text-main opacity-80" />
          <h2 className="text-2xl font-bold text-main">JWT</h2>
        </div>

        {/* Tabs */}
        <div className="flex-none border-b border-base">
          <Tabs
            tabs={[
              { id: "decode", label: "Decode" },
              { id: "verify", label: "Verify" },
              { id: "edit", label: "Edit & Sign" },
              { id: "keys", label: "Key Manager" },
              { id: "history", label: "History" },
            ]}
            activeTab={data.activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-surface p-4">
          {data.activeTab === "decode" && (
            <JwtDecoder
              token={data.token}
              header={data.header}
              payload={data.payload}
              signature={data.signature}
              error={data.error}
              warning={data.warning}
              onTokenChange={(
                token,
                header,
                payload,
                signature,
                error,
                warning,
              ) => {
                updateState({
                  token,
                  header,
                  payload,
                  signature,
                  error,
                  warning,
                });
                if (token && !error) {
                  addToHistory({
                    token,
                    header,
                    payload,
                    signature,
                    timestamp: Date.now(),
                  });
                }
              }}
            />
          )}

          {data.activeTab === "verify" && (
            <JwtVerifier
              token={data.token}
              header={data.header}
              verificationKey={data.verificationKey}
              verificationKeyType={data.verificationKeyType}
              isValid={data.isValid}
              onVerificationKeyChange={(key, type) => {
                updateState({
                  verificationKey: key,
                  verificationKeyType: type,
                });
              }}
              onVerificationResult={(isValid, error, warning) => {
                updateState({ isValid, error, warning });
              }}
              storedKeys={data.storedKeys}
              onUseStoredKey={(key) => useStoredKey(key, "verification")}
            />
          )}

          {data.activeTab === "edit" && (
            <JwtEditor
              header={data.header}
              payload={data.payload}
              signingKey={data.signingKey}
              signingKeyType={data.signingKeyType}
              signingAlgorithm={data.signingAlgorithm}
              onHeaderChange={(header) => {
                updateState({ header });
              }}
              onPayloadChange={(payload) => {
                updateState({ payload });
              }}
              onSigningKeyChange={(key, type) => {
                updateState({ signingKey: key, signingKeyType: type });
              }}
              onSigningAlgorithmChange={(algorithm) => {
                updateState({ signingAlgorithm: algorithm });
              }}
              onTokenGenerated={(token, header, payload, signature) => {
                updateState({ token, header, payload, signature });
                addToHistory({
                  token,
                  header,
                  payload,
                  signature,
                  timestamp: Date.now(),
                });
              }}
              storedKeys={data.storedKeys}
              onUseStoredKey={(key) => useStoredKey(key, "signing")}
            />
          )}

          {data.activeTab === "keys" && (
            <JwtKeyManager
              storedKeys={data.storedKeys}
              onAddKey={addStoredKey}
              onRemoveKey={removeStoredKey}
              onClearKeys={clearStoredKeys}
            />
          )}

          {data.activeTab === "history" && (
            <JwtHistory
              history={data.history}
              onClearHistory={clearHistory}
              onLoadItem={loadFromHistory}
            />
          )}
        </div>
      </div>
    );
  },
};
